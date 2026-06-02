'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

// ── Types ────────────────────────────────────────────────────

interface Summary {
  short: string
  medium: string
}

interface Article {
  id: string
  url: string
  title: string | null
  author: string | null
  published_at: string | null
  raw_text: string | null
  created_at: string
  sources: { name: string } | null
  summaries: Summary | null
}

interface Source {
  id?: string
  url: string
  name: string
  type: 'rss' | 'scrape'
  added_by: string
  status: string
  auth_type: string
  auth_config: string
  max_articles: number
  url_exclude: string
  url_pattern: string
  rss_url: string
}

type ViewMode = 'short' | 'medium' | 'full'

// ── Helpers ──────────────────────────────────────────────────

function formatDate(dateStr: string | null): string {
  if (!dateStr) return ''
  return new Date(dateStr).toLocaleDateString('en-US', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
  })
}

function getTodayHeader(): string {
  return new Date().toLocaleDateString('en-US', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
  }).toUpperCase()
}

// ── Article Card ─────────────────────────────────────────────

function ArticleCard({ article }: { article: Article }) {
  const [view, setView] = useState<ViewMode>('short')

  const content = view === 'short'
    ? article.summaries?.short
    : view === 'medium'
    ? article.summaries?.medium
    : article.raw_text

  return (
    <article style={{
      borderBottom: '1px solid #1a1a1a',
      paddingBottom: '1.5rem',
      marginBottom: '1.5rem',
    }}>
      {/* Source & Meta */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'baseline',
        marginBottom: '0.3rem',
      }}>
        <span style={{
          fontFamily: "'UnifrakturMaguntia', cursive",
          fontSize: '0.85rem',
          color: '#555',
          letterSpacing: '0.03em',
        }}>
          {article.sources?.name ?? 'Unknown'}
        </span>
        <span style={{
          fontFamily: "'IM Fell English', serif",
          fontSize: '0.72rem',
          color: '#777',
          fontStyle: 'italic',
        }}>
          {formatDate(article.published_at ?? article.created_at)}
        </span>
      </div>

      {/* Title */}
      <a href={article.url} target="_blank" rel="noopener noreferrer"
        style={{ textDecoration: 'none', color: 'inherit' }}>
        <h2 style={{
          fontFamily: "'Playfair Display', serif",
          fontSize: '1.25rem',
          fontWeight: '700',
          lineHeight: '1.3',
          marginBottom: '0.25rem',
          color: '#0a0a0a',
          letterSpacing: '-0.01em',
          cursor: 'pointer',
        }}
          onMouseEnter={e => (e.currentTarget.style.textDecoration = 'underline')}
          onMouseLeave={e => (e.currentTarget.style.textDecoration = 'none')}
        >
          {article.title ?? article.url}
        </h2>
      </a>

      {/* Author */}
      {article.author && (
        <p style={{
          fontFamily: "'IM Fell English', serif",
          fontSize: '0.78rem',
          color: '#555',
          fontStyle: 'italic',
          marginBottom: '0.6rem',
        }}>
          By {article.author}
        </p>
      )}

      {/* Content */}
      <div style={{
        fontFamily: "'IM Fell English', serif",
        fontSize: '0.92rem',
        lineHeight: '1.65',
        color: '#1a1a1a',
        marginBottom: '0.75rem',
        maxHeight: view === 'full' ? '400px' : 'none',
        overflowY: view === 'full' ? 'auto' : 'visible',
        whiteSpace: view === 'full' ? 'pre-wrap' : 'normal',
      }}>
        {content ?? <em style={{ color: '#888' }}>No summary available.</em>}
      </div>

      {/* Controls */}
      <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
        {(['short', 'medium', 'full'] as ViewMode[]).map(mode => (
          <button
            key={mode}
            onClick={() => setView(mode)}
            style={{
              fontFamily: "'IM Fell English', serif",
              fontSize: '0.72rem',
              fontStyle: 'italic',
              padding: '0.2rem 0.6rem',
              border: '1px solid #1a1a1a',
              background: view === mode ? '#1a1a1a' : 'transparent',
              color: view === mode ? '#f5f0e8' : '#1a1a1a',
              cursor: 'pointer',
              letterSpacing: '0.05em',
              transition: 'all 0.15s',
            }}
          >
            {mode === 'short' ? 'Brief' : mode === 'medium' ? 'Summary' : 'Full Text'}
          </button>
        ))}
        <a
          href={article.url}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            marginLeft: 'auto',
            fontFamily: "'IM Fell English', serif",
            fontSize: '0.72rem',
            fontStyle: 'italic',
            color: '#555',
            textDecoration: 'underline',
            letterSpacing: '0.03em',
          }}
        >
          Read Original →
        </a>
      </div>
    </article>
  )
}

// ── Add Source Form ──────────────────────────────────────────

function AddSourceForm({ onAdded }: { onAdded: () => void }) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [form, setForm] = useState<Source>({
    url: '',
    name: '',
    type: 'scrape',
    added_by: 'manual',
    status: 'active',
    auth_type: 'none',
    auth_config: '',
    max_articles: 10,
    url_exclude: '',
    url_pattern: '',
    rss_url: '',
  })

  function set(field: keyof Source, value: string | number) {
    setForm(f => ({ ...f, [field]: value }))
  }

  async function handleSubmit() {
    if (!form.url || !form.name) {
      setError('URL and Name are required.')
      return
    }
    setLoading(true)
    setError(null)

    const payload: Record<string, unknown> = {
      url: form.url,
      name: form.name,
      type: form.type,
      added_by: form.added_by,
      status: form.status,
      auth_type: form.auth_type,
      max_articles: form.max_articles,
      ...(form.url_exclude && { url_exclude: form.url_exclude }),
      ...(form.url_pattern && { url_pattern: form.url_pattern }),
      ...(form.rss_url && { rss_url: form.rss_url }),
      ...(form.auth_config && { auth_config: { cookie: form.auth_config } }),
    }

    const { error } = await supabase.from('sources').insert(payload)
    setLoading(false)

    if (error) {
      setError(error.message)
    } else {
      setOpen(false)
      setForm({
        url: '', name: '', type: 'scrape', added_by: 'manual',
        status: 'active', auth_type: 'none', auth_config: '',
        max_articles: 10, url_exclude: '', url_pattern: '', rss_url: '',
      })
      onAdded()
    }
  }

  const inputStyle: React.CSSProperties = {
    width: '100%',
    fontFamily: "'IM Fell English', serif",
    fontSize: '0.88rem',
    padding: '0.4rem 0.5rem',
    border: '1px solid #1a1a1a',
    background: '#faf8f2',
    color: '#1a1a1a',
    outline: 'none',
    boxSizing: 'border-box',
  }

  const labelStyle: React.CSSProperties = {
    fontFamily: "'IM Fell English', serif",
    fontSize: '0.75rem',
    fontStyle: 'italic',
    color: '#555',
    display: 'block',
    marginBottom: '0.2rem',
  }

  const fieldStyle: React.CSSProperties = {
    marginBottom: '0.85rem',
  }

  return (
    <div style={{ marginBottom: '2rem' }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          fontFamily: "'Playfair Display', serif",
          fontSize: '0.82rem',
          letterSpacing: '0.08em',
          padding: '0.4rem 1.2rem',
          border: '2px solid #1a1a1a',
          background: open ? '#1a1a1a' : 'transparent',
          color: open ? '#f5f0e8' : '#1a1a1a',
          cursor: 'pointer',
          textTransform: 'uppercase',
        }}
      >
        {open ? '✕ Close' : '+ Add Source'}
      </button>

      {open && (
        <div style={{
          marginTop: '1rem',
          padding: '1.5rem',
          border: '1px solid #1a1a1a',
          background: '#faf8f2',
        }}>
          <h3 style={{
            fontFamily: "'UnifrakturMaguntia', cursive",
            fontSize: '1.2rem',
            marginBottom: '1.2rem',
            color: '#1a1a1a',
          }}>
            Register New Source
          </h3>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 1rem' }}>
            <div style={fieldStyle}>
              <label style={labelStyle}>URL * (homepage or RSS feed)</label>
              <input style={inputStyle} value={form.url} onChange={e => set('url', e.target.value)} placeholder="https://..." />
            </div>
            <div style={fieldStyle}>
              <label style={labelStyle}>Name *</label>
              <input style={inputStyle} value={form.name} onChange={e => set('name', e.target.value)} placeholder="The Ringer" />
            </div>
            <div style={fieldStyle}>
              <label style={labelStyle}>Type *</label>
              <select style={inputStyle} value={form.type} onChange={e => set('type', e.target.value)}>
                <option value="scrape">Scrape</option>
                <option value="rss">RSS</option>
              </select>
            </div>
            <div style={fieldStyle}>
              <label style={labelStyle}>Max Articles</label>
              <input style={inputStyle} type="number" value={form.max_articles} onChange={e => set('max_articles', parseInt(e.target.value))} />
            </div>
            <div style={fieldStyle}>
              <label style={labelStyle}>URL Exclude (optional)</label>
              <input style={inputStyle} value={form.url_exclude} onChange={e => set('url_exclude', e.target.value)} placeholder="/podcasts" />
            </div>
            <div style={fieldStyle}>
              <label style={labelStyle}>URL Pattern (optional)</label>
              <input style={inputStyle} value={form.url_pattern} onChange={e => set('url_pattern', e.target.value)} placeholder="/articles/" />
            </div>
            <div style={fieldStyle}>
              <label style={labelStyle}>RSS URL (optional, scrape sources)</label>
              <input style={inputStyle} value={form.rss_url} onChange={e => set('rss_url', e.target.value)} placeholder="https://..." />
            </div>
            <div style={fieldStyle}>
              <label style={labelStyle}>Auth Type</label>
              <select style={inputStyle} value={form.auth_type} onChange={e => set('auth_type', e.target.value)}>
                <option value="none">None</option>
                <option value="cookie">Cookie</option>
              </select>
            </div>
            {form.auth_type === 'cookie' && (
              <div style={{ ...fieldStyle, gridColumn: '1 / -1' }}>
                <label style={labelStyle}>Cookie Value</label>
                <input style={inputStyle} value={form.auth_config} onChange={e => set('auth_config', e.target.value)} placeholder="session=abc123..." />
              </div>
            )}
          </div>

          {error && (
            <p style={{ fontFamily: "'IM Fell English', serif", color: '#8b0000', fontSize: '0.82rem', marginBottom: '0.75rem' }}>
              {error}
            </p>
          )}

          <button
            onClick={handleSubmit}
            disabled={loading}
            style={{
              fontFamily: "'Playfair Display', serif",
              fontSize: '0.82rem',
              letterSpacing: '0.08em',
              padding: '0.5rem 1.5rem',
              border: '2px solid #1a1a1a',
              background: '#1a1a1a',
              color: '#f5f0e8',
              cursor: loading ? 'not-allowed' : 'pointer',
              textTransform: 'uppercase',
              opacity: loading ? 0.6 : 1,
            }}
          >
            {loading ? 'Filing...' : 'Submit for Publication'}
          </button>
        </div>
      )}
    </div>
  )
}

// ── Main Page ────────────────────────────────────────────────

export default function ArticleFeedPage() {
  const [articles, setArticles] = useState<Article[]>([])
  const [loading, setLoading] = useState(true)

  async function fetchArticles() {
    setLoading(true)
    const { data, error } = await supabase
      .from('articles')
      .select(`
        id, url, title, author, published_at, raw_text, created_at,
        sources(name),
        summaries(short, medium)
      `)
      .order('created_at', { ascending: false })
      .limit(50)

    if (!error && data) setArticles(data as unknown as Article[])
    setLoading(false)
  }

  useEffect(() => { fetchArticles() }, [])

  return (
    <>
      {/* Google Fonts */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,700;0,900;1,400;1,700&family=IM+Fell+English:ital@0;1&family=UnifrakturMaguntia&display=swap');

        * { box-sizing: border-box; margin: 0; padding: 0; }

        body {
          background: #f5f0e8;
          background-image:
            url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='400'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3CfeColorMatrix type='saturate' values='0'/%3E%3C/filter%3E%3Crect width='400' height='400' filter='url(%23noise)' opacity='0.04'/%3E%3C/svg%3E");
        }

        ::-webkit-scrollbar { width: 6px; }
        ::-webkit-scrollbar-track { background: #f5f0e8; }
        ::-webkit-scrollbar-thumb { background: #1a1a1a; }

        .masthead-rule {
          border: none;
          border-top: 4px double #1a1a1a;
          margin: 0.5rem 0;
        }

        .section-rule {
          border: none;
          border-top: 1px solid #1a1a1a;
          margin: 0.4rem 0;
        }

        .feed-columns {
          column-count: 2;
          column-gap: 2.5rem;
          column-rule: 1px solid #1a1a1a;
        }

        @media (max-width: 700px) {
          .feed-columns { column-count: 1; }
        }

        .feed-columns article {
          break-inside: avoid;
        }
      `}</style>

      <div style={{
        maxWidth: '960px',
        margin: '0 auto',
        padding: '2rem 1.5rem',
        minHeight: '100vh',
      }}>

        {/* Masthead */}
        <header style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
          <p style={{
            fontFamily: "'IM Fell English', serif",
            fontSize: '0.72rem',
            letterSpacing: '0.12em',
            color: '#555',
            textTransform: 'uppercase',
            marginBottom: '0.5rem',
          }}>
            {getTodayHeader()}
          </p>

          <hr className="masthead-rule" />

          <h1 style={{
            fontFamily: "'UnifrakturMaguntia', cursive",
            fontSize: 'clamp(2.8rem, 8vw, 5rem)',
            color: '#0a0a0a',
            lineHeight: '1',
            letterSpacing: '-0.01em',
            margin: '0.4rem 0',
          }}>
            The Daily Digest
          </h1>

          <hr className="masthead-rule" />

          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginTop: '0.4rem',
          }}>
            <span style={{
              fontFamily: "'IM Fell English', serif",
              fontSize: '0.72rem',
              fontStyle: 'italic',
              color: '#555',
            }}>
              "All the news that's fit to read"
            </span>
            <span style={{
              fontFamily: "'IM Fell English', serif",
              fontSize: '0.72rem',
              color: '#555',
            }}>
              {articles.length} dispatches
            </span>
          </div>
        </header>

        {/* Add Source */}
        <section style={{ marginBottom: '2rem' }}>
          <hr className="section-rule" />
          <p style={{
            fontFamily: "'Playfair Display', serif",
            fontSize: '0.68rem',
            letterSpacing: '0.15em',
            textTransform: 'uppercase',
            color: '#555',
            margin: '0.4rem 0',
          }}>
            Editorial Submissions
          </p>
          <hr className="section-rule" />
          <div style={{ marginTop: '1rem' }}>
            <AddSourceForm onAdded={fetchArticles} />
          </div>
        </section>

        {/* Feed */}
        <section>
          <hr className="section-rule" />
          <p style={{
            fontFamily: "'Playfair Display', serif",
            fontSize: '0.68rem',
            letterSpacing: '0.15em',
            textTransform: 'uppercase',
            color: '#555',
            margin: '0.4rem 0',
          }}>
            Latest Dispatches
          </p>
          <hr className="section-rule" />

          <div style={{ marginTop: '1.5rem' }}>
            {loading ? (
              <p style={{
                fontFamily: "'IM Fell English', serif",
                fontStyle: 'italic',
                color: '#777',
                textAlign: 'center',
                padding: '3rem 0',
              }}>
                Setting type...
              </p>
            ) : articles.length === 0 ? (
              <p style={{
                fontFamily: "'IM Fell English', serif",
                fontStyle: 'italic',
                color: '#777',
                textAlign: 'center',
                padding: '3rem 0',
              }}>
                No dispatches yet. The presses are idle.
              </p>
            ) : (
              <div className="feed-columns">
                {articles.map(article => (
                  <ArticleCard key={article.id} article={article} />
                ))}
              </div>
            )}
          </div>
        </section>

        {/* Footer */}
        <footer style={{
          marginTop: '3rem',
          paddingTop: '1rem',
          borderTop: '4px double #1a1a1a',
          textAlign: 'center',
        }}>
          <p style={{
            fontFamily: "'IM Fell English', serif",
            fontSize: '0.72rem',
            fontStyle: 'italic',
            color: '#777',
          }}>
            Printed daily by the automated press. Est. 2026.
          </p>
        </footer>
      </div>
    </>
  )
}