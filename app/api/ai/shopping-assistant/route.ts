import { NextRequest, NextResponse } from 'next/server'
import { GoogleGenAI, Type } from '@google/genai'

export interface CatalogProduct {
  id: string
  name: string
  description?: string | null
  price: number
  category?: string
  stock_quantity?: number
  stock?: number
  image_url?: string | null
  badge?: string
  tenant_name?: string
}

export async function POST(req: NextRequest) {
  try {
    const { messages = [], products = [] } = await req.json()

    if (!Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json(
        { error: 'Messages array is required' },
        { status: 400 }
      )
    }

    const lastUserMessage = messages[messages.length - 1]?.content || ''
    const apiKey = process.env.GEMINI_API_KEY

    // Fallback response builder if Gemini API key is not present or offline
    const buildFallback = () => {
      const query = lastUserMessage.toLowerCase()
      const matchingProducts: CatalogProduct[] = []

      // Match products by name, description, or category
      products.forEach((p: CatalogProduct) => {
        const name = (p.name || '').toLowerCase()
        const desc = (p.description || '').toLowerCase()
        const cat = (p.category || '').toLowerCase()

        if (
          query.includes('under') ||
          query.includes('cheap') ||
          query.includes('budget') ||
          query.includes('recommend') ||
          query.includes('best') ||
          query.includes('gift')
        ) {
          if (p.price <= 150) matchingProducts.push(p)
        } else if (
          name.split(' ').some((word) => word.length > 3 && query.includes(word)) ||
          desc.split(' ').some((word) => word.length > 3 && query.includes(word)) ||
          cat.split(' ').some((word) => word.length > 3 && query.includes(word))
        ) {
          matchingProducts.push(p)
        }
      })

      const finalRecommendations: CatalogProduct[] = matchingProducts.length > 0 ? matchingProducts.slice(0, 3) : products.slice(0, 2)
      const recIds = finalRecommendations.map((p: CatalogProduct) => p.id)

      return {
        message:
          finalRecommendations.length > 0
            ? `Here are some standout recommendations from our store catalog that match your inquiry:\n\n` +
              finalRecommendations
                .map(
                  (p: CatalogProduct) =>
                    `• **${p.name}** ($${Number(p.price).toFixed(2)}) — ${p.description || 'Premium quality item.'}`
                )
                .join('\n\n') +
              `\n\nYou can click **"Add to Cart"** below to immediately add any of these items to your order!`
            : `I couldn't find an exact match for "${lastUserMessage}", but feel free to browse our full catalog or ask about specific categories like Audio & Tech, Accessories, or Lifestyle goods!`,
        recommendedProductIds: recIds,
        suggestedFollowUps: [
          'What are your bestsellers?',
          'Do you have anything under $100?',
          'What tech accessories are available?',
        ],
      }
    }

    if (!apiKey) {
      const fallback = buildFallback()
      return NextResponse.json({
        success: false,
        apiError: 'GEMINI_API_KEY environment secret is not configured.',
        message: fallback.message,
        recommendedProductIds: fallback.recommendedProductIds,
        suggestedFollowUps: fallback.suggestedFollowUps,
      })
    }

    try {
      const ai = new GoogleGenAI({
        apiKey,
      })

      // Format inventory for AI context
      const inventorySummary = (products as CatalogProduct[]).map((p) => ({
        id: p.id,
        name: p.name,
        price: p.price,
        category: p.category || 'General',
        description: p.description || '',
        stock: p.stock_quantity ?? p.stock ?? 0,
        merchant: p.tenant_name || 'Flow Commerce',
      }))

      const conversationContext = messages
        .slice(-6)
        .map((m: any) => `${m.role === 'user' ? 'Customer' : 'Assistant'}: ${m.content}`)
        .join('\n')

      const prompt = `You are the friendly, knowledgeable AI Shopping Assistant for Flow Commerce.
Help the customer find the right products, explain specifications, compare items, check prices/stock, and answer store policy questions (shipping: free over $150, standard $12; returns: 30-day effortless returns; tracking: real-time package tracking with order references).

CURRENT STORE INVENTORY:
${JSON.stringify(inventorySummary, null, 2)}

CONVERSATION HISTORY:
${conversationContext}

LATEST CUSTOMER QUERY:
"${lastUserMessage}"

INSTRUCTIONS:
1. Provide a concise, engaging, and helpful response. If recommending products, refer to exact names and prices from the store inventory above.
2. In 'recommendedProductIds', include the exact string IDs of products directly relevant to the user's question from the provided inventory (maximum 4 products). If the query is about policies or tracking, this can be empty.
3. In 'suggestedFollowUps', provide 2 or 3 short follow-up questions the shopper might want to ask next.`

      // Supported modern models in order of preference
      const candidateModels = ['gemini-3.8-flash', 'gemini-flash-latest', 'gemini-3.1-flash-lite']
      let lastModelError: any = null
      let response: any = null

      for (const modelName of candidateModels) {
        try {
          response = await ai.models.generateContent({
            model: modelName,
            contents: prompt,
            config: {
              responseMimeType: 'application/json',
              responseSchema: {
                type: Type.OBJECT,
                properties: {
                  message: {
                    type: Type.STRING,
                    description: 'Friendly markdown-formatted message answering the customer inquiry.',
                  },
                  recommendedProductIds: {
                    type: Type.ARRAY,
                    items: { type: Type.STRING },
                    description: 'Array of valid product IDs from the inventory to show quick Add-to-Cart cards.',
                  },
                  suggestedFollowUps: {
                    type: Type.ARRAY,
                    items: { type: Type.STRING },
                    description: '2 to 3 helpful short suggested follow-up questions.',
                  },
                },
                required: ['message', 'recommendedProductIds', 'suggestedFollowUps'],
              },
              systemInstruction:
                'You are an expert e-commerce shopping concierge. Always give grounded advice based ONLY on the provided store inventory.',
            },
          })
          if (response?.text) {
            break
          }
        } catch (mErr: any) {
          lastModelError = mErr
          console.warn(`Model ${modelName} attempt failed:`, mErr?.message || mErr)
        }
      }

      if (!response?.text) {
        const fallback = buildFallback()
        const fullErrStr =
          lastModelError?.message ||
          (typeof lastModelError === 'string' ? lastModelError : JSON.stringify(lastModelError)) ||
          'Gemini API request failed to return content.'

        return NextResponse.json({
          success: false,
          apiError: fullErrStr,
          message: fallback.message,
          recommendedProductIds: fallback.recommendedProductIds,
          suggestedFollowUps: fallback.suggestedFollowUps,
        })
      }

      const parsed = JSON.parse(response.text)
      const validProductIds = new Set((products as CatalogProduct[]).map((p) => p.id))
      const safeRecIds = (Array.isArray(parsed.recommendedProductIds) ? parsed.recommendedProductIds : []).filter(
        (id: string) => validProductIds.has(id)
      )

      return NextResponse.json({
        success: true,
        message: parsed.message || 'I found some great options for you in our catalog.',
        recommendedProductIds: safeRecIds,
        suggestedFollowUps: Array.isArray(parsed.suggestedFollowUps)
          ? parsed.suggestedFollowUps.slice(0, 3)
          : ['What are your top recommendations?', 'Show gifts under $100'],
      })
    } catch (apiErr: any) {
      console.error('Gemini API shopping assistant exception:', apiErr)
      const fallback = buildFallback()
      const errDetail =
        apiErr?.message || (typeof apiErr === 'string' ? apiErr : JSON.stringify(apiErr)) || 'Unknown API Error'

      return NextResponse.json({
        success: false,
        apiError: errDetail,
        message: fallback.message,
        recommendedProductIds: fallback.recommendedProductIds,
        suggestedFollowUps: fallback.suggestedFollowUps,
      })
    }
  } catch (err: any) {
    console.error('AI Shopping Assistant API error:', err)
    return NextResponse.json(
      { error: err?.message || 'Failed to process shopping assistant request' },
      { status: 500 }
    )
  }
}
