import { GoogleGenerativeAI } from '@google/generative-ai'
import supabase, { insertSummary, getAlreadySummarizedIds } from './db'

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!)
const model = genAI.getGenerativeModel({ model: 'gemini-3.1-flash-lite' })

const PROMPT = (text: string) => `
You are analyzing a news or editorial article for a personal reading feed.

Given the article text below, extract the following and produce two summaries.

Respond in this exact JSON format with no additional text or markdown:
{
  "title": "...",
  "author": "...",
  "published_at": "...",
  "short": "...",
  "medium": "...",
  "category": "..."
}

Rules:
- title: the article headline. If not found, null.
- author: the author name. If not found, null.
- published_at: ISO 8601 date string (e.g. "2026-05-31T00:00:00Z"). If not found, null.
- short: 1-2 sentences. The core point only.
- medium: 1 paragraph (4-6 sentences). Key points, context, and why it matters.
- category: pick exactly one from this list based on the article content:
  "local" (North Carolina or Utah news only),
  "sports",
  "tech",
  "business" (includes finance, economics, markets),
  "science",
  "culture" (arts, entertainment, media),
  "lifestyle" (learning, urbanism, food, health, self-improvement),
  "other"

Article:
${text.slice(0, 20000)}
`

export interface ArticleToSummarize {
  id: string
  raw_text: string | null
}

/**
 * Summarizes a batch of articles via Gemini 2.5 Flash.
 * Skips articles that already have summaries or have no raw text.
 */
export async function summarizeArticles(
  articles: ArticleToSummarize[]
): Promise<void> {
  // Filter out articles with no text
  const withText = articles.filter(a => a.raw_text && a.raw_text.trim().length > 80)

  if (withText.length === 0) {
    console.log('[summarize] No articles to summarize')
    return
  }

  // Skip already summarized
  const alreadyDone = await getAlreadySummarizedIds(withText.map(a => a.id))
  const toSummarize = withText.filter(a => !alreadyDone.has(a.id))
  console.log(`[summarize] Total incoming: ${withText.length}`)
  console.log(`[summarize] Already done ids: ${[...alreadyDone].join(', ')}`)
  console.log(`[summarize] To summarize: ${toSummarize.length}`)

  console.log(`[summarize] Summarizing ${toSummarize.length} articles (${alreadyDone.size} already done)`)

  for (const article of toSummarize) {
    // Free tier: 15 requests/min — wait Xs between calls to stay safe
    await new Promise(res => setTimeout(res, 5000))

    try {
      const result = await model.generateContent(PROMPT(article.raw_text!))
      const raw = result.response.text().trim()
      const cleaned = raw.replace(/^```json\s*/i, '').replace(/```\s*$/i, '').trim()

      let parsed: { title: string | null; author: string | null; published_at: string | null; short: string; medium: string; category: string | null  }
      try {
        parsed = JSON.parse(cleaned)
      } catch {
        console.error(`[summarize] Failed to parse JSON for article ${article.id}:`, raw)
        continue
      }

      if (!parsed.short || !parsed.medium) {
        console.error(`[summarize] Missing fields in response for article ${article.id}`)
        continue
      }

            // Write metadata back to articles table if extracted
            if (parsed.title || parsed.author || parsed.published_at || parsed.category) {
              await supabase
                .from('articles')
                .update({
                  ...(parsed.title && { title: parsed.title }),
                  ...(parsed.author && { author: parsed.author }),
                  ...(parsed.published_at && { published_at: parsed.published_at }),
                  ...(parsed.category && { category: parsed.category }),
                })
                .eq('id', article.id)
            }

      await insertSummary({
        article_id: article.id,
        short: parsed.short,
        medium: parsed.medium,
      })

      console.log(`[summarize] Done: ${article.id}`)
    } catch (err) {
      console.error(`[summarize] Error summarizing article ${article.id}: ${err}`)
    }
  }
}