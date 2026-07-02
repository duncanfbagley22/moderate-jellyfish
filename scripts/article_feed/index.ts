import { getActiveSources } from './db'
import { fetchRSS } from './rss'
import { fetchWithJina, fetchFullText } from './jina'
import { discoverArticleUrls } from './discover'
import { summarizeArticles } from './summarize'
import supabase from './db'

const FULL_TEXT_MIN_LENGTH = 500 // chars below which we try Jina for full text
const JINA_DELAY_MS = 3000       // delay between Jina fetches to respect rate limits

async function sleep(ms: number) {
  return new Promise(res => setTimeout(res, ms))
}

async function run() {
  console.log('[article_feed] Starting run:', new Date().toISOString())

  const sources = await getActiveSources()
  console.log(`[article_feed] ${sources.length} active sources`)

  const allArticleIds: string[] = []

  for (const source of sources) {

    if (source.type === 'rss') {
      // ── RSS path ─────────────────────────────────────────────
      const ids = await fetchRSS(source)
      allArticleIds.push(...ids)

    } else if (source.type === 'scrape') {
      // ── Scrape path ──────────────────────────────────────────
      const isPaywalled = source.auth_type === 'cookie'
      const hasCookie = !!source.auth_config?.cookie

      if (isPaywalled && !hasCookie) {
        console.log(`[article_feed] Skipping paywalled source with no cookie: ${source.name}`)
        continue
      }

      // Discover article URLs from the source homepage
      const articleUrls = await discoverArticleUrls(source)

      for (const url of articleUrls) {
        await sleep(JINA_DELAY_MS)
        const id = await fetchWithJina(source, url)
        if (id) allArticleIds.push(id)
      }
    }
  }

  console.log(`[article_feed] ${allArticleIds.length} articles upserted this run`)

  // ── Full-text fallback for RSS articles with short raw_text ──
  if (allArticleIds.length > 0) {
    const { data: runArticles, error: runError } = await supabase
      .from('articles')
      .select('id, url, raw_text, source_id')
      .in('id', allArticleIds)

    if (runError) {
      console.error('[article_feed] Failed to fetch run articles:', runError.message)
    } else {
      const shortArticles = (runArticles ?? []).filter(
        a => !a.raw_text || a.raw_text.length < FULL_TEXT_MIN_LENGTH
      )

      console.log(`[article_feed] ${shortArticles.length} articles need full-text fetch via Jina`)

      for (const article of shortArticles) {
        await sleep(JINA_DELAY_MS)
        const fullText = await fetchFullText(article.url)
        if (fullText) {
          await supabase
            .from('articles')
            .update({ raw_text: fullText })
            .eq('id', article.id)
          console.log(`[article_feed] Full text updated for ${article.url}`)
        }
      }
    }
  }

  // ── Catch-up: summarize all articles missing summaries ───────
  const { data: allArticles, error: allError } = await supabase
    .from('articles')
    .select('id, raw_text')

  if (allError) {
    console.error('[article_feed] Failed to fetch articles:', allError.message)
    return
  }

  const { data: existingSummaries, error: sumError } = await supabase
    .from('summaries')
    .select('article_id')

  if (sumError) {
    console.error('[article_feed] Failed to fetch summaries:', sumError.message)
    return
  }

  const summarizedIds = new Set(existingSummaries?.map(s => s.article_id) ?? [])
  const unsummarized = (allArticles ?? []).filter(a => !summarizedIds.has(a.id))

  console.log(`[article_feed] ${unsummarized.length} articles need summaries`)

  await summarizeArticles(unsummarized)

  console.log('[article_feed] Run complete:', new Date().toISOString())
}

run().catch(err => {
  console.error('[article_feed] Fatal error:', err)
  process.exit(1)
})