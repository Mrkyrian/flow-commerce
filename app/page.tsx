
import Link from 'next/link'

export default function Home() {
  return (
    <main style={{ padding: "2rem", fontFamily: "sans-serif" }}>
      <h1>Welcome to Flow Commerce!</h1>
      <p>Your multi-tenant app is successfully up and running.</p>
      <div style={{ marginTop: '1rem', display: 'flex', gap: '1rem' }}>
        <Link href="/login" style={{ color: '#10b981', fontWeight: 'bold' }}>
          Go to Login
        </Link>
        <Link href="/login/app" style={{ color: '#10b981', fontWeight: 'bold' }}>
          Go to Dashboard
        </Link>
      </div>
    </main>
  );
}
