import { NextRequest, NextResponse } from 'next/server'
import { GoogleGenAI, Type } from '@google/genai'

export async function POST(req: NextRequest) {
  try {
    const { keyword, tone = 'persuasive', existingName = '', categoryHint = '', industry = 'E-Commerce' } = await req.json()

    if (!keyword && !existingName) {
      return NextResponse.json(
        { error: 'Please provide a product idea, keyword, or title to generate copy.' },
        { status: 400 }
      )
    }

    const apiKey = process.env.GEMINI_API_KEY
    const topic = keyword || existingName

    // Fallback if API key is not present or if generation fails
    const fallbackResponse = {
      title: existingName || `${topic.charAt(0).toUpperCase() + topic.slice(1)} Pro Edition`,
      description: `Engineered for modern lifestyles, this premium ${topic} combines durable craftsmanship with exceptional everyday utility. Designed with high-grade materials, ergonomic refinement, and uncompromising attention to detail.`,
      category: categoryHint || 'General',
      suggestedPrice: 89.99,
      tags: [topic.toLowerCase(), 'premium', 'bestseller', 'handcrafted'],
      highlights: [
        'Premium grade durable materials',
        'Designed for daily performance & reliability',
        'Includes 1-year manufacturer warranty'
      ]
    }

    if (!apiKey) {
      return NextResponse.json(fallbackResponse)
    }

    try {
      const ai = new GoogleGenAI({
        apiKey,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          },
        },
      })

      const prompt = `You are an expert e-commerce copywriter. Generate high-converting, professional product copy for an online store catalog.
Industry/Niche: ${industry}
Product Keyword / Concept: "${topic}"
Desired Tone: "${tone}" (e.g., luxury, modern, persuasive, minimal, tech)
${categoryHint ? `Category Hint: ${categoryHint}` : ''}
${existingName ? `Existing Draft Title: ${existingName}` : ''}

Generate:
1. title: A catchy, polished product title (under 60 characters, no quotes).
2. description: An engaging, benefit-driven product description (2 to 3 concise sentences highlighting quality, function, and appeal).
3. category: The best single category name (e.g., "Audio & Tech", "Accessories & Jewelry", "Fashion & Apparel", "Home & Living", "Beauty & Wellness", "Art & Collectibles", "Books & Stationery", "General").
4. suggestedPrice: A realistic suggested retail price as a number (e.g., 49.99, 129.00).
5. tags: 3 to 5 relevant keyword tags.
6. highlights: 3 bullet points of standout product features.`

      const response = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              title: { type: Type.STRING, description: 'Engaging product title' },
              description: { type: Type.STRING, description: 'Persuasive sales description' },
              category: { type: Type.STRING, description: 'Best matching product category' },
              suggestedPrice: { type: Type.NUMBER, description: 'Suggested reasonable retail price' },
              tags: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
                description: 'Product tags'
              },
              highlights: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
                description: 'Three key selling points'
              }
            },
            required: ['title', 'description', 'category', 'suggestedPrice', 'tags', 'highlights']
          },
          systemInstruction: 'You are an elite e-commerce merchandising assistant and copywriter. Always output valid JSON conforming strictly to the schema.',
        },
      })

      const text = response.text
      if (!text) {
        return NextResponse.json(fallbackResponse)
      }

      const parsed = JSON.parse(text)
      return NextResponse.json({
        title: parsed.title || fallbackResponse.title,
        description: parsed.description || fallbackResponse.description,
        category: parsed.category || fallbackResponse.category,
        suggestedPrice: typeof parsed.suggestedPrice === 'number' ? parsed.suggestedPrice : fallbackResponse.suggestedPrice,
        tags: Array.isArray(parsed.tags) ? parsed.tags : fallbackResponse.tags,
        highlights: Array.isArray(parsed.highlights) ? parsed.highlights : fallbackResponse.highlights
      })
    } catch (apiErr: any) {
      console.warn('Gemini API call warning in product copy generator:', apiErr)
      return NextResponse.json(fallbackResponse)
    }
  } catch (err: any) {
    console.error('AI Product Copy API error:', err)
    return NextResponse.json(
      { error: err?.message || 'Failed to generate product copy' },
      { status: 500 }
    )
  }
}
