import { createClient } from '@supabase/supabase-js'
import ws from 'ws'

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    realtime: { transport: ws as unknown as any },
  }
)

export default supabase

// ── Types ────────────────────────────────────────────────────

export interface Source {
  id: string
  url: string
  name: string
  type: 'rss' | 'scrape'
  auth_type: 'none' | 'cookie' | null
  auth_config: Record<string, string> | null
  max_articles: number | null
  rss_url: string | null
  url_pattern: string | null
  url_exclude: string | null
}

export interface ArticleInsert {
  source_id: string
  url: string
  title?: string
  author?: string
  published_at?: string
  raw_text?: string
}

export interface SummaryInsert {
  article_id: string
  short: string
  medium: string
}

// ── Reads ────────────────────────────────────────────────────

export async function getActiveSources(): Promise<Source[]> {
  const { data, error } = await supabase
    .from('sources')
    .select('id, url, name, type, auth_type, auth_config, max_articles, rss_url, url_pattern, url_exclude')
    .eq('status', 'active')

  if (error) throw new Error(`Failed to fetch sources: ${error.message}`)
  return data ?? []
}

// ── Writes ───────────────────────────────────────────────────

/**
 * Upserts an article by URL. Returns the article id.
 * Skips update if the article already exists (url is unique).
 */
export async function upsertArticle(article: ArticleInsert): Promise<string | null> {
  const { data, error } = await supabase
    .from('articles')
    .upsert(article, { onConflict: 'url', ignoreDuplicates: true })
    .select('id')

  if (error) {
    console.error(`Failed to upsert article ${article.url}: ${error.message}`)
    return null
  }
  return data?.[0]?.id ?? null
}

/**
 * Inserts a summary row. Skips if one already exists for this article.
 */
export async function insertSummary(summary: SummaryInsert): Promise<void> {
  const { error } = await supabase
    .from('summaries')
    .upsert(summary, { onConflict: 'article_id', ignoreDuplicates: true })

  if (error) {
    console.error(`Failed to insert summary for article ${summary.article_id}: ${error.message}`)
  }
}

/**
 * Returns article ids that already have a summary (to skip re-summarizing).
 */
export async function getAlreadySummarizedIds(articleIds: string[]): Promise<Set<string>> {
  const { data, error } = await supabase
    .from('summaries')
    .select('article_id')
    .in('article_id', articleIds)

  if (error) throw new Error(`Failed to fetch summaries: ${error.message}`)
  return new Set((data ?? []).map(r => r.article_id))
}