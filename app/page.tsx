import Link from 'next/link'

export default function Home() {
  return (
    <div style={{
      minHeight: '100vh',
      background: '#f5f0e8',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: 'Georgia, serif',
    }}>
      <h1 style={{
        fontSize: '2rem',
        marginBottom: '2rem',
        color: '#1a1a1a',
      }}>
        Duncan&apos;s Apps
      </h1>
      <nav style={{ display: 'flex', flexDirection: 'column', gap: '1rem', alignItems: 'center' }}>
        <Link href="/feed" style={{ fontSize: '1.1rem', color: '#1a1a1a' }}>
          📰 Duncan&apos;s Daily Digest
        </Link>
        <Link href="/sleep" style={{ fontSize: '1.1rem', color: '#1a1a1a' }}>
          😴 Sleep Tracker
        </Link>
      </nav>
    </div>
  )
}