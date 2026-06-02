import { upsertArticle } from './db'
import type { Source } from './db'

const JINA_BASE = 'https://r.jina.ai/'

/**
 * Fetches a single article URL via Jina.ai Reader.
 * Handles optional cookie auth for paywalled sources.
 * Returns the article id if successfully written to DB, null otherwise.
 */
export async function fetchWithJina(
  source: Source,
  url: string
): Promise<string | null> {
  console.log(`[jina] Fetching ${url}`)

  const headers: Record<string, string> = {
    Accept: 'text/plain',
  }

  // Attach cookie if source has auth configured
  if (source.auth_type === 'cookie' && source.auth_config?.cookie) {
    headers['Cookie'] = source.auth_config.cookie
    console.log(`[jina] Using cookie auth for ${source.name}`)
  }

  let text: string
  try {
    const res = await fetch(`${JINA_BASE}${url}`, { headers })

    if (!res.ok) {
      console.error(`[jina] ${url} returned ${res.status}`)
      return null
    }

    text = await res.text()
  } catch (err) {
    console.error(`[jina] Network error fetching ${url}: ${err}`)
    return null
  }

  if (!text || text.trim().length < 100) {
    console.warn(`[jina] Suspiciously short response for ${url}, skipping`)
    return null
  }

  const id = await upsertArticle({
    source_id: source.id,
    url,
    raw_text: text,
  })

  return id
}

/**
 * Fetches full article text for an RSS article that has short/missing raw_text.
 * Returns the full text string or null if fetch fails.
 */
export async function fetchFullText(url: string): Promise<string | null> {
  console.log(`[jina] Fetching full text for ${url}`)

  try {
    const res = await fetch(`${JINA_BASE}${url}`, {
      headers: { Accept: 'text/plain' },
    })

    if (!res.ok) {
      console.error(`[jina] ${url} returned ${res.status}`)
      return null
    }

    const text = await res.text()

    if (!text || text.trim().length < 100) {
      console.warn(`[jina] Short response for ${url}, skipping`)
      return null
    }

    return text
  } catch (err) {
    console.error(`[jina] Network error fetching ${url}: ${err}`)
    return null
  }
}