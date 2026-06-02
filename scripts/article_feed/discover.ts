import { GoogleGenerativeAI } from '@google/generative-ai'
import type { Source } from './db'

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!)
const model = genAI.getGenerativeModel({ model: 'gemini-3.1-flash-lite' })

const JINA_BASE = 'https://r.jina.ai/'

/**
 * Fetches all links from a page via Jina's link extraction endpoint.
 */
async function fetchPageLinks(url: string): Promise<string> {
  console.log(`[discover] Fetching links from ${url}`)

  const res = await fetch(`${JINA_BASE}${url}`, {
    headers: { Accept: 'text/plain' },
  })

  if (!res.ok) {
    throw new Error(`Jina links fetch failed for ${url}: ${res.status}`)
  }

  return res.text()
}

/**
 * Uses Gemini to identify article URLs from a raw link list.
 * Falls back to url_pattern filtering if provided.
 */
async function identifyArticleLinks(
  linkText: string,
  source: Source,
): Promise<string[]> {
  // Manual fallback: filter by url_pattern if provided
  if (source.url_pattern) {
    console.log(`[discover] Using url_pattern fallback: ${source.url_pattern}`)
    return linkText
      .split('\n')
      .map(line => line.match(/https?:\/\/\S+/)?.[0] ?? '')
      .filter(url => url && url.includes(source.url_pattern!))
      .filter(url => !source.url_exclude || !url.includes(source.url_exclude))
  }

  // Gemini-based discovery
  const prompt = `
You are analyzing a list of links extracted from the homepage of "${source.name}" (${source.url}).

Your job is to identify which URLs are individual article or story links — not navigation, tag pages, author pages, category indexes, social media links, or the homepage itself.
${source.url_exclude ? `\nAlso exclude any URLs that contain "${source.url_exclude}".\n` : ''}
Return up to ${(source.max_articles ?? 10) * 2} article URLs so there are enough after any filtering. Return them as a JSON array with no explanation or markdown, like:
["https://...", "https://..."]

If no article links are found, return an empty array: []

Links:
${linkText.slice(0, 15000)}
`

  const result = await model.generateContent(prompt)
  const raw = result.response.text().trim()
  const cleaned = raw.replace(/^```json\s*/i, '').replace(/```\s*$/i, '').trim()

  try {
    const urls = JSON.parse(cleaned)
    if (!Array.isArray(urls)) throw new Error('Not an array')
    return urls.filter((u: unknown) => typeof u === 'string' && u.startsWith('http'))
  } catch {
    console.error(`[discover] Failed to parse Gemini link response for ${source.name}:`, raw)
    return []
  }
}

/**
 * Discovers article URLs for a scrape source.
 * Returns up to max_articles URLs.
 */
export async function discoverArticleUrls(source: Source): Promise<string[]> {
  try {
    const linkText = await fetchPageLinks(source.url)
    const articleUrls = await identifyArticleLinks(linkText, source)

    const limited = articleUrls.slice(0, source.max_articles ?? 10)
    console.log(`[discover] ${source.name}: found ${articleUrls.length} articles, using ${limited.length}`)

    return limited
  } catch (err) {
    console.error(`[discover] Error discovering articles for ${source.name}:`, err)
    return []
  }
}