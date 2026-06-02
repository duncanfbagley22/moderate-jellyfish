import Parser from 'rss-parser'
import { upsertArticle } from './db'
import type { Source } from './db'

const parser = new Parser()

// How far back to look for articles (24 hours to match daily cron)
const LOOKBACK_MS = 24 * 60 * 60 * 1000

export interface FetchedArticle {
  source_id: string
  url: string
  title?: string
  author?: string
  published_at?: string
  raw_text?: string
}

/**
 * Fetches recent articles from an RSS source.
 * Returns the list of article ids written to the DB.
 */
export async function fetchRSS(source: Source): Promise<string[]> {
  console.log(`[rss] Fetching ${source.name} (${source.url})`)

  let feed
  try {
    feed = await parser.parseURL(source.url)
  } catch (err) {
    console.error(`[rss] Failed to parse feed for ${source.name}: ${err}`)
    return []
  }

  const cutoff = new Date(Date.now() - LOOKBACK_MS)
  const articleIds: string[] = []

  for (const item of feed.items) {
    const url = item.link
    if (!url) continue

    const publishedAt = item.pubDate ? new Date(item.pubDate) : null

    // Skip articles older than the lookback window
    if (publishedAt && publishedAt < cutoff) continue

    const id = await upsertArticle({
      source_id: source.id,
      url,
      title: item.title ?? undefined,
      author: item.creator ?? item.author ?? undefined,
      published_at: publishedAt?.toISOString() ?? undefined,
      raw_text: item.contentSnippet ?? item.content ?? undefined,
    })

    if (id) articleIds.push(id)
  }

  console.log(`[rss] ${source.name}: ${articleIds.length} new articles`)
  return articleIds
}