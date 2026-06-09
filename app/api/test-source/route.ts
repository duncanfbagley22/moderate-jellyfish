import { NextRequest, NextResponse } from "next/server";

const JINA_BASE = "https://r.jina.ai/";
const JINA_LINKS_BASE = "https://r.jina.ai/";

interface TestSourceRequest {
  url: string;
  type: "rss" | "scrape";
  url_exclude?: string;
  url_pattern?: string;
  max_articles?: number;
}

// ── RSS test ─────────────────────────────────────────────────

async function testRSS(url: string): Promise<{ title: string; articleUrl: string; text: string } | null> {
  const res = await fetch(url, { headers: { Accept: "application/rss+xml, application/xml, text/xml" } });
  if (!res.ok) throw new Error(`RSS fetch failed: ${res.status}`);

  const xml = await res.text();

  // Pull first item title and link with simple regex (no xml parser needed)
  const titleMatch = xml.match(/<item[^>]*>[\s\S]*?<title[^>]*><!\[CDATA\[(.*?)\]\]><\/title>|<item[^>]*>[\s\S]*?<title[^>]*>(.*?)<\/title>/);
  const linkMatch = xml.match(/<item[^>]*>[\s\S]*?<link[^>]*>(.*?)<\/link>/);

  const title = titleMatch?.[1] ?? titleMatch?.[2] ?? "Untitled";
  const articleUrl = linkMatch?.[1]?.trim() ?? "";

  if (!articleUrl) throw new Error("No articles found in RSS feed");

  // Fetch full text via Jina
  const jinaRes = await fetch(`${JINA_BASE}${articleUrl}`, {
    headers: { Accept: "text/plain" },
  });

  if (!jinaRes.ok) throw new Error(`Jina fetch failed: ${jinaRes.status}`);
  const text = await jinaRes.text();

  return { title: title.trim(), articleUrl, text };
}

// ── Scrape test ──────────────────────────────────────────────

async function testScrape(
  url: string,
  urlExclude?: string,
  urlPattern?: string,
): Promise<{ title: string; articleUrl: string; text: string } | null> {
  // Fetch links from homepage
  const linksRes = await fetch(`${JINA_LINKS_BASE}${url}`, {
    headers: { Accept: "text/plain", "X-Return-Format": "links" },
  });

  if (!linksRes.ok) throw new Error(`Jina links fetch failed: ${linksRes.status}`);
  const linkText = await linksRes.text();

  // Extract all URLs
  let urls = linkText
    .split("\n")
    .map((line) => line.match(/https?:\/\/[^\s)]+/)?.[0] ?? "")
    .filter(Boolean);

  // Apply url_pattern filter if provided
  if (urlPattern) {
    urls = urls.filter((u) => u.includes(urlPattern));
  }

  // Apply url_exclude filter if provided
  if (urlExclude) {
    urls = urls.filter((u) => !u.includes(urlExclude));
  }

  // Deduplicate and take first
  const unique = [...new Set(urls)];
  const articleUrl = unique[0];

  if (!articleUrl) throw new Error("No article URLs discovered from this page");

  // Fetch full text
  const jinaRes = await fetch(`${JINA_BASE}${articleUrl}`, {
    headers: { Accept: "text/plain" },
  });

  if (!jinaRes.ok) throw new Error(`Jina article fetch failed: ${jinaRes.status}`);
  const text = await jinaRes.text();

  // Try to extract title from Jina response
  const titleMatch = text.match(/^#\s+(.+)$/m) ?? text.match(/Title:\s*(.+)/);
  const title = titleMatch?.[1]?.trim() ?? articleUrl;

  return { title, articleUrl, text };
}

// ── Strip Jina header ────────────────────────────────────────

function stripJinaHeader(text: string): string {
  const marker = "Markdown Content:";
  const idx = text.indexOf(marker);
  if (idx !== -1) return text.slice(idx + marker.length).trim();
  return text
    .split("\n")
    .filter(
      (line) =>
        !line.startsWith("Title:") &&
        !line.startsWith("URL Source:") &&
        !line.startsWith("Published Time:"),
    )
    .join("\n")
    .trim();
}

// ── Route handler ────────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    const body: TestSourceRequest = await req.json();
    const { url, type, url_exclude, url_pattern } = body;

    if (!url || !type) {
      return NextResponse.json({ error: "URL and type are required" }, { status: 400 });
    }

    let result;

    if (type === "rss") {
      result = await testRSS(url);
    } else {
      result = await testScrape(url, url_exclude, url_pattern);
    }

    if (!result) {
      return NextResponse.json({ error: "No articles found" }, { status: 404 });
    }

    return NextResponse.json({
      title: result.title,
      url: result.articleUrl,
      preview: stripJinaHeader(result.text).slice(0, 2000),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}