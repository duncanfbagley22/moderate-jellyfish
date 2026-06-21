"use client";

import { useEffect, useState, useRef } from "react";
import { createClient } from "@supabase/supabase-js";
import ReactMarkdown from "react-markdown";
import {
  Check,
  X,
  Pencil,
  Trash2,
  ChevronLeft,
  ChevronRight,
  Archive,
  Menu,
  Bookmark,
  Settings,
} from "lucide-react";
import BackHome from "@/components/BackHome";
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
);

// ── Types ────────────────────────────────────────────────────

interface Summary {
  short: string;
  medium: string;
}

interface Article {
  id: string;
  url: string;
  title: string | null;
  author: string | null;
  published_at: string | null;
  raw_text: string | null;
  created_at: string;
  saved: boolean;
  archived: boolean;
  category: string | null;
  sources: { id: string; name: string; engagement_score: number } | null;
  summaries: Summary | null;
}

interface SourceRow {
  id: string;
  url: string;
  name: string;
  type: "rss" | "scrape";
  status: string;
  auth_type: string;
  auth_config: Record<string, string> | null;
  max_articles: number;
  url_exclude: string | null;
  url_pattern: string | null;
  rss_url: string | null;
  engagement_score: number;
  rating_count: number;
}

type ViewMode = "short" | "medium";
type Tab = "feed" | "clipped" | "sources";
type Category =
  | "all"
  | "local"
  | "sports"
  | "tech"
  | "business"
  | "science"
  | "culture"
  | "lifestyle"
  | "other";

const CATEGORIES: { key: Category; label: string }[] = [
  { key: "local", label: "Local" },
  { key: "sports", label: "Sports" },
  { key: "tech", label: "Tech" },
  { key: "business", label: "Business" },
  { key: "science", label: "Science" },
  { key: "culture", label: "Culture" },
  { key: "lifestyle", label: "Lifestyle" },
  { key: "other", label: "Other" },
];

// ── Helpers ──────────────────────────────────────────────────

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "";
  return new Date(dateStr).toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function getTodayHeader(): string {
  return new Date()
    .toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    })
    .toUpperCase();
}

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

// ── Dog-ear SVG ──────────────────────────────────────────────

function DogEar({ saved, onClick }: { saved: boolean; onClick: () => void }) {
  return (
    <div
      onClick={onClick}
      title={saved ? "Remove clip" : "Clip article"}
      style={{
        position: "absolute",
        top: 0,
        right: 0,
        width: "28px",
        height: "28px",
        cursor: "pointer",
        opacity: saved ? 1 : 0.25,
        transition: "opacity 0.2s",
      }}
      onMouseEnter={(e) => (e.currentTarget.style.opacity = "1")}
      onMouseLeave={(e) =>
        (e.currentTarget.style.opacity = saved ? "1" : "0.25")
      }
    >
      <svg width="28" height="28" viewBox="0 0 28 28">
        <polygon points="0,0 28,0 28,28" fill={saved ? "#1a1a1a" : "#888"} />
      </svg>
    </div>
  );
}

// ── Full Text Modal ──────────────────────────────────────────

function FullTextModal({
  article,
  onClose,
}: {
  article: Article;
  onClose: () => void;
}) {
  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 1000,
        background: "rgba(10, 10, 10, 0.6)",
        backdropFilter: "blur(4px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "2rem",
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "#f5f0e8",
          border: "2px solid #1a1a1a",
          maxWidth: "720px",
          width: "100%",
          maxHeight: "85vh",
          display: "flex",
          flexDirection: "column",
          position: "relative",
        }}
      >
        <div
          style={{
            padding: "1.25rem 1.5rem 1rem",
            borderBottom: "1px solid #1a1a1a",
            paddingRight: "3rem",
          }}
        >
          <span
            style={{
              fontFamily: "'UnifrakturMaguntia', cursive",
              fontSize: "0.8rem",
              color: "#555",
              display: "block",
              marginBottom: "0.4rem",
            }}
          >
            {article.sources?.name ?? "Unknown"}
          </span>
          <h2
            style={{
              fontFamily: "'Playfair Display', serif",
              fontSize: "1.4rem",
              fontWeight: "700",
              lineHeight: "1.3",
              color: "#0a0a0a",
            }}
          >
            {article.title ?? article.url}
          </h2>
          {article.author && (
            <p
              style={{
                fontFamily: "'IM Fell English', serif",
                fontSize: "0.8rem",
                fontStyle: "italic",
                color: "#555",
                marginTop: "0.3rem",
              }}
            >
              By {article.author}
            </p>
          )}
        </div>

        <button
          onClick={onClose}
          style={{
            position: "absolute",
            top: "0.75rem",
            right: "0.75rem",
            background: "transparent",
            border: "none",
            cursor: "pointer",
            color: "#1a1a1a",
            padding: "0.2rem",
            display: "flex",
            alignItems: "center",
          }}
        >
          <X size={18} strokeWidth={2} />
        </button>

        <div
          className="article-content"
          style={{
            padding: "1.25rem 1.5rem",
            overflowY: "auto",
            flex: 1,
            fontFamily: "'IM Fell English', serif",
            fontSize: "0.95rem",
            lineHeight: "1.75",
            color: "#1a1a1a",
          }}
        >
          {article.raw_text ? (
            <ReactMarkdown>{stripJinaHeader(article.raw_text)}</ReactMarkdown>
          ) : (
            <em style={{ color: "#888" }}>No full text available.</em>
          )}
        </div>

        <div
          style={{
            padding: "1rem 1.5rem",
            borderTop: "1px solid #1a1a1a",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <a
            href={article.url}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              fontFamily: "'IM Fell English', serif",
              fontSize: "0.8rem",
              fontStyle: "italic",
              color: "#555",
              textDecoration: "underline",
            }}
          >
            Read Original →
          </a>
          <button
            onClick={onClose}
            style={{
              fontFamily: "'Playfair Display', serif",
              fontSize: "0.75rem",
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              padding: "0.4rem 1.2rem",
              border: "2px solid #1a1a1a",
              background: "#1a1a1a",
              color: "#f5f0e8",
              cursor: "pointer",
            }}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Article Card ─────────────────────────────────────────────

function ArticleCard({
  article,
  onArchive,
  onSaveToggle,
  fontSize,
}: {
  article: Article;
  onArchive: (id: string) => void;
  onSaveToggle: (id: string, saved: boolean) => void;
  fontSize: number;
}) {
  const [view, setView] = useState<ViewMode>("short");
  const [fading, setFading] = useState(false);
  const [rating, setRating] = useState<1 | -1 | null>(null);
  const [showModal, setShowModal] = useState(false);

  const content =
    view === "short" ? article.summaries?.short : article.summaries?.medium;

  async function updateEngagementScore(
    sourceId: string,
    newRating: 1 | -1,
    prevRating: 1 | -1 | null,
  ) {
    const { data: source } = await supabase
      .from("sources")
      .select("engagement_score, rating_count")
      .eq("id", sourceId)
      .single();
    if (!source) return;
    const { engagement_score, rating_count } = source;
    const normalizedNew = newRating === 1 ? 1 : 0;
    const normalizedPrev =
      prevRating === null ? null : prevRating === 1 ? 1 : 0;
    if (normalizedPrev === null) {
      const newScore =
        (engagement_score * rating_count + normalizedNew) / (rating_count + 1);
      await supabase
        .from("sources")
        .update({ engagement_score: newScore, rating_count: rating_count + 1 })
        .eq("id", sourceId);
    } else {
      const newScore =
        (engagement_score * rating_count - normalizedPrev + normalizedNew) /
        rating_count;
      await supabase
        .from("sources")
        .update({ engagement_score: newScore })
        .eq("id", sourceId);
    }
  }

  async function handleRating(value: 1 | -1) {
    const sourceId = article.sources?.id;
    const prevRating = rating;
    setRating(value);
    await supabase
      .from("interactions")
      .insert({ article_id: article.id, action: "rated", rating: value });
    if (sourceId) await updateEngagementScore(sourceId, value, prevRating);
    if (value === -1) {
      setFading(true);
      await supabase
        .from("articles")
        .update({ archived: true, archived_at: new Date().toISOString() })
        .eq("id", article.id);
      setTimeout(() => onArchive(article.id), 500);
    }
  }

  async function handleDismiss() {
    setFading(true);
    await supabase
      .from("articles")
      .update({ archived: true, archived_at: new Date().toISOString() })
      .eq("id", article.id);
    setTimeout(() => onArchive(article.id), 500);
  }

  async function handleSaveToggle() {
    const newSaved = !article.saved;
    await supabase
      .from("articles")
      .update({
        saved: newSaved,
        saved_at: newSaved ? new Date().toISOString() : null,
      })
      .eq("id", article.id);
    onSaveToggle(article.id, newSaved);
  }

  return (
    <>
      {showModal && (
        <FullTextModal article={article} onClose={() => setShowModal(false)} />
      )}
      <article
        style={{
          position: "relative",
          borderBottom: "1px solid #1a1a1a",
          paddingBottom: "1.5rem",
          marginBottom: "1.5rem",
          paddingRight: "2rem",
          opacity: fading ? 0 : 1,
          transition: "opacity 0.5s ease",
          fontSize: `${fontSize}rem`,
        }}
      >
        <DogEar saved={article.saved} onClick={handleSaveToggle} />

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "baseline",
            marginBottom: "0.3rem",
          }}
        >
          <span
            style={{
              fontFamily: "'UnifrakturMaguntia', cursive",
              fontSize: "0.85em",
              color: "#555",
              letterSpacing: "0.03em",
            }}
          >
            {article.sources?.name ?? "Unknown"}
          </span>
          <span
            style={{
              fontFamily: "'IM Fell English', serif",
              fontSize: "0.72em",
              color: "#777",
              fontStyle: "italic",
            }}
          >
            {formatDate(article.published_at ?? article.created_at)}
          </span>
        </div>

        <a
          href={article.url}
          target="_blank"
          rel="noopener noreferrer"
          style={{ textDecoration: "none", color: "inherit" }}
        >
          <h2
            style={{
              fontFamily: "'Playfair Display', serif",
              fontSize: "1.25em",
              fontWeight: "700",
              lineHeight: "1.3",
              marginBottom: "0.25rem",
              color: "#0a0a0a",
              letterSpacing: "-0.01em",
              cursor: "pointer",
            }}
            onMouseEnter={(e) =>
              (e.currentTarget.style.textDecoration = "underline")
            }
            onMouseLeave={(e) =>
              (e.currentTarget.style.textDecoration = "none")
            }
          >
            {article.title ?? article.url}
          </h2>
        </a>

        {article.author && (
          <p
            style={{
              fontFamily: "'IM Fell English', serif",
              fontSize: "0.78em",
              color: "#555",
              fontStyle: "italic",
              marginBottom: "0.6rem",
            }}
          >
            By {article.author}
          </p>
        )}

        <div
          className="article-content"
          style={{
            fontFamily: "'IM Fell English', serif",
            fontSize: "0.92em",
            lineHeight: "1.65",
            color: "#1a1a1a",
            marginBottom: "0.75rem",
          }}
        >
          {content ? (
            <p>{content}</p>
          ) : (
            <em style={{ color: "#888" }}>No summary available.</em>
          )}
        </div>

        <div
          style={{
            display: "flex",
            gap: "0.5rem",
            alignItems: "center",
            flexWrap: "wrap",
          }}
        >
          {(["short", "medium"] as ViewMode[]).map((mode) => (
            <button
              key={mode}
              onClick={() => setView(mode)}
              style={{
                fontFamily: "'IM Fell English', serif",
                fontSize: "0.72em",
                fontStyle: "italic",
                padding: "0.2rem 0.6rem",
                border: "1px solid #1a1a1a",
                background: view === mode ? "#1a1a1a" : "transparent",
                color: view === mode ? "#f5f0e8" : "#1a1a1a",
                cursor: "pointer",
                letterSpacing: "0.05em",
                transition: "all 0.15s",
              }}
            >
              {mode === "short" ? "Brief" : "Summary"}
            </button>
          ))}

          <button
            onClick={() => setShowModal(true)}
            style={{
              fontFamily: "'IM Fell English', serif",
              fontSize: "0.72em",
              fontStyle: "italic",
              padding: "0.2rem 0.6rem",
              border: "1px solid #1a1a1a",
              background: "transparent",
              color: "#1a1a1a",
              cursor: "pointer",
              letterSpacing: "0.05em",
              transition: "all 0.15s",
            }}
          >
            Full Text
          </button>

          <div style={{ display: "flex", gap: "0.3rem", marginLeft: "0.5rem" }}>
            <button
              onClick={() => handleRating(1)}
              title="Recommend"
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                width: "26px",
                height: "26px",
                border: "1px solid #1a1a1a",
                background: rating === 1 ? "#2d6a2d" : "transparent",
                color: rating === 1 ? "#fff" : "#1a1a1a",
                cursor: "pointer",
                borderRadius: "2px",
                transition: "all 0.15s",
              }}
            >
              <Check size={13} strokeWidth={2.5} />
            </button>
            <button
              onClick={() => handleRating(-1)}
              title="Pass"
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                width: "26px",
                height: "26px",
                border: "1px solid #1a1a1a",
                background: rating === -1 ? "#8b0000" : "transparent",
                color: rating === -1 ? "#fff" : "#1a1a1a",
                cursor: "pointer",
                borderRadius: "2px",
                transition: "all 0.15s",
              }}
            >
              <X size={13} strokeWidth={2.5} />
            </button>
            <button
              onClick={handleDismiss}
              title="Dismiss"
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                width: "26px",
                height: "26px",
                border: "1px solid #aaa",
                background: "transparent",
                color: "#888",
                cursor: "pointer",
                borderRadius: "2px",
                transition: "all 0.15s",
              }}
            >
              <Archive size={13} strokeWidth={2} />
            </button>
          </div>

          <a
            href={article.url}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              marginLeft: "auto",
              fontFamily: "'IM Fell English', serif",
              fontSize: "0.72em",
              fontStyle: "italic",
              color: "#555",
              textDecoration: "underline",
              letterSpacing: "0.03em",
            }}
          >
            Read Original →
          </a>
        </div>
      </article>
    </>
  );
}

// ── Sources Tab ──────────────────────────────────────────────

function SourcesTab() {
  const [sources, setSources] = useState<SourceRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<SourceRow>>({});
  const [adding, setAdding] = useState(false);
  const [newForm, setNewForm] = useState({
    url: "",
    name: "",
    type: "scrape" as "rss" | "scrape",
    status: "active",
    auth_type: "none",
    max_articles: 10,
    url_exclude: "",
    url_pattern: "",
    rss_url: "",
  });
  const [error, setError] = useState<string | null>(null);
  const [testing, setTesting] = useState(false);
  const [testForm, setTestForm] = useState({
    url: "",
    type: "scrape" as "rss" | "scrape",
    url_exclude: "",
    url_pattern: "",
  });
  const [testResult, setTestResult] = useState<{
    title: string;
    url: string;
    preview: string;
  } | null>(null);
  const [testError, setTestError] = useState<string | null>(null);
  const [testLoading, setTestLoading] = useState(false);

  async function fetchSources() {
    setLoading(true);
    const { data } = await supabase.from("sources").select("*").order("name");
    setSources(data ?? []);
    setLoading(false);
  }

  useEffect(() => {
    fetchSources();
  }, []);

  async function handleDelete(id: string) {
    if (!confirm("Remove this source? Articles will be preserved.")) return;
    await supabase.from("sources").delete().eq("id", id);
    fetchSources();
  }

  async function handleSaveEdit(id: string) {
    const updatePayload = {
      name: editForm.name,
      url: editForm.url,
      type: editForm.type,
      status: editForm.status,
      max_articles: editForm.max_articles,
      url_exclude: editForm.url_exclude,
      url_pattern: editForm.url_pattern,
      rss_url: editForm.rss_url,
    };
    const { error } = await supabase
      .from("sources")
      .update(updatePayload)
      .eq("id", id);
    if (error) {
      alert(`Failed to save: ${error.message}`);
      return;
    }
    setEditingId(null);
    fetchSources();
  }

  async function handleAdd() {
    if (!newForm.url || !newForm.name) {
      setError("URL and Name are required.");
      return;
    }
    setError(null);
    await supabase.from("sources").insert({
      url: newForm.url,
      name: newForm.name,
      type: newForm.type,
      status: newForm.status,
      auth_type: newForm.auth_type,
      max_articles: newForm.max_articles,
      added_by: "manual",
      ...(newForm.url_exclude && { url_exclude: newForm.url_exclude }),
      ...(newForm.url_pattern && { url_pattern: newForm.url_pattern }),
      ...(newForm.rss_url && { rss_url: newForm.rss_url }),
    });
    setAdding(false);
    setNewForm({
      url: "",
      name: "",
      type: "scrape",
      status: "active",
      auth_type: "none",
      max_articles: 10,
      url_exclude: "",
      url_pattern: "",
      rss_url: "",
    });
    fetchSources();
  }

  async function handleTest() {
    if (!testForm.url) {
      setTestError("URL is required.");
      return;
    }
    setTestLoading(true);
    setTestResult(null);
    setTestError(null);

    const res = await fetch("/api/test-source", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(testForm),
    });

    const data = await res.json();
    setTestLoading(false);

    if (!res.ok) {
      setTestError(data.error ?? "Something went wrong");
    } else {
      setTestResult(data);
    }
  }

  const inputStyle: React.CSSProperties = {
    fontFamily: "'IM Fell English', serif",
    fontSize: "0.82rem",
    padding: "0.25rem 0.4rem",
    border: "1px solid #aaa",
    background: "#faf8f2",
    color: "#1a1a1a",
    width: "100%",
  };
  const cellStyle: React.CSSProperties = {
    fontFamily: "'IM Fell English', serif",
    fontSize: "0.82rem",
    padding: "0.5rem 0.75rem",
    borderBottom: "1px solid #ddd",
    color: "#1a1a1a",
    verticalAlign: "middle",
  };
  const headStyle: React.CSSProperties = {
    ...cellStyle,
    fontFamily: "'Playfair Display', serif",
    fontSize: "0.7rem",
    letterSpacing: "0.1em",
    textTransform: "uppercase" as const,
    color: "#555",
    borderBottom: "2px solid #1a1a1a",
    background: "#f5f0e8",
  };

  return (
    <div>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "1rem",
        }}
      >
        <p
          style={{
            fontFamily: "'IM Fell English', serif",
            fontStyle: "italic",
            fontSize: "0.88rem",
            color: "#555",
          }}
        >
          {sources.length} registered sources
        </p>
        <div style={{ display: "flex", gap: "0.5rem" }}>
          <button
            onClick={() => {
              setTesting((t) => !t);
              setTestResult(null);
              setTestError(null);
            }}
            style={{
              fontFamily: "'Playfair Display', serif",
              fontSize: "0.75rem",
              letterSpacing: "0.08em",
              padding: "0.35rem 1rem",
              border: "2px solid #1a1a1a",
              background: testing ? "#1a1a1a" : "transparent",
              color: testing ? "#f5f0e8" : "#1a1a1a",
              cursor: "pointer",
              textTransform: "uppercase",
            }}
          >
            {testing ? "Cancel" : "Test a Source"}
          </button>
          <button
            onClick={() => setAdding((a) => !a)}
            style={{
              fontFamily: "'Playfair Display', serif",
              fontSize: "0.75rem",
              letterSpacing: "0.08em",
              padding: "0.35rem 1rem",
              border: "2px solid #1a1a1a",
              background: adding ? "#1a1a1a" : "transparent",
              color: adding ? "#f5f0e8" : "#1a1a1a",
              cursor: "pointer",
              textTransform: "uppercase",
            }}
          >
            {adding ? "Cancel" : "+ Add Source"}
          </button>
        </div>
      </div>

      {testing && (
        <div
          style={{
            padding: "1rem",
            border: "1px solid #1a1a1a",
            background: "#faf8f2",
            marginBottom: "1.5rem",
          }}
        >
          <h3
            style={{
              fontFamily: "'UnifrakturMaguntia', cursive",
              fontSize: "1.1rem",
              marginBottom: "1rem",
              color: "#1a1a1a",
            }}
          >
            Test a Source
          </h3>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: "0.75rem",
              marginBottom: "0.75rem",
            }}
          >
            <div>
              <label
                style={{
                  fontFamily: "'IM Fell English', serif",
                  fontSize: "0.72rem",
                  fontStyle: "italic",
                  color: "#555",
                  display: "block",
                  marginBottom: "0.2rem",
                }}
              >
                URL *
              </label>
              <input
                style={inputStyle}
                placeholder="https://..."
                value={testForm.url}
                onChange={(e) =>
                  setTestForm((f) => ({ ...f, url: e.target.value }))
                }
              />
            </div>
            <div>
              <label
                style={{
                  fontFamily: "'IM Fell English', serif",
                  fontSize: "0.72rem",
                  fontStyle: "italic",
                  color: "#555",
                  display: "block",
                  marginBottom: "0.2rem",
                }}
              >
                Type
              </label>
              <select
                style={inputStyle}
                value={testForm.type}
                onChange={(e) =>
                  setTestForm((f) => ({
                    ...f,
                    type: e.target.value as "rss" | "scrape",
                  }))
                }
              >
                <option value="scrape">Scrape</option>
                <option value="rss">RSS</option>
              </select>
            </div>
            <div>
              <label
                style={{
                  fontFamily: "'IM Fell English', serif",
                  fontSize: "0.72rem",
                  fontStyle: "italic",
                  color: "#555",
                  display: "block",
                  marginBottom: "0.2rem",
                }}
              >
                URL Exclude (optional)
              </label>
              <input
                style={inputStyle}
                placeholder="/podcasts"
                value={testForm.url_exclude}
                onChange={(e) =>
                  setTestForm((f) => ({ ...f, url_exclude: e.target.value }))
                }
              />
            </div>
            <div>
              <label
                style={{
                  fontFamily: "'IM Fell English', serif",
                  fontSize: "0.72rem",
                  fontStyle: "italic",
                  color: "#555",
                  display: "block",
                  marginBottom: "0.2rem",
                }}
              >
                URL Pattern (optional)
              </label>
              <input
                style={inputStyle}
                placeholder="/articles/"
                value={testForm.url_pattern}
                onChange={(e) =>
                  setTestForm((f) => ({ ...f, url_pattern: e.target.value }))
                }
              />
            </div>
          </div>

          <button
            onClick={handleTest}
            disabled={testLoading}
            style={{
              fontFamily: "'Playfair Display', serif",
              fontSize: "0.75rem",
              letterSpacing: "0.08em",
              padding: "0.35rem 1rem",
              border: "2px solid #1a1a1a",
              background: "#1a1a1a",
              color: "#f5f0e8",
              cursor: testLoading ? "not-allowed" : "pointer",
              textTransform: "uppercase",
              opacity: testLoading ? 0.6 : 1,
            }}
          >
            {testLoading ? "Testing..." : "Run Test"}
          </button>

          {testError && (
            <p
              style={{
                fontFamily: "'IM Fell English', serif",
                color: "#8b0000",
                fontSize: "0.82rem",
                marginTop: "0.75rem",
              }}
            >
              {testError}
            </p>
          )}

          {testResult && (
            <div
              style={{
                marginTop: "1rem",
                borderTop: "1px solid #1a1a1a",
                paddingTop: "1rem",
              }}
            >
              <p
                style={{
                  fontFamily: "'Playfair Display', serif",
                  fontSize: "1rem",
                  fontWeight: "700",
                  marginBottom: "0.3rem",
                  color: "#0a0a0a",
                }}
              >
                {testResult.title}
              </p>
              <a
                href={testResult.url}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  fontFamily: "'IM Fell English', serif",
                  fontSize: "0.75rem",
                  fontStyle: "italic",
                  color: "#555",
                  textDecoration: "underline",
                  display: "block",
                  marginBottom: "0.75rem",
                }}
              >
                {testResult.url}
              </a>
              <div
                style={{
                  fontFamily: "'IM Fell English', serif",
                  fontSize: "0.85rem",
                  lineHeight: "1.6",
                  color: "#1a1a1a",
                  maxHeight: "300px",
                  overflowY: "auto",
                  whiteSpace: "pre-wrap",
                  background: "#f5f0e8",
                  padding: "0.75rem",
                  border: "1px solid #ddd",
                }}
              >
                {testResult.preview}
              </div>
            </div>
          )}
        </div>
      )}

      {adding && (
        <div
          style={{
            padding: "1rem",
            border: "1px solid #1a1a1a",
            background: "#faf8f2",
            marginBottom: "1.5rem",
          }}
        >
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr 1fr",
              gap: "0.75rem",
              marginBottom: "0.75rem",
            }}
          >
            {[
              { label: "URL *", key: "url", placeholder: "https://..." },
              { label: "Name *", key: "name", placeholder: "The Ringer" },
              {
                label: "URL Exclude",
                key: "url_exclude",
                placeholder: "/podcasts",
              },
              {
                label: "URL Pattern",
                key: "url_pattern",
                placeholder: "/articles/",
              },
              { label: "RSS URL", key: "rss_url", placeholder: "https://..." },
            ].map(({ label, key, placeholder }) => (
              <div key={key}>
                <label
                  style={{
                    fontFamily: "'IM Fell English', serif",
                    fontSize: "0.72rem",
                    fontStyle: "italic",
                    color: "#555",
                    display: "block",
                    marginBottom: "0.2rem",
                  }}
                >
                  {label}
                </label>
                <input
                  style={inputStyle}
                  placeholder={placeholder}
                  value={
                    ((newForm as Record<string, unknown>)[key] as string) ?? ""
                  }
                  onChange={(e) =>
                    setNewForm((f) => ({ ...f, [key]: e.target.value }))
                  }
                />
              </div>
            ))}
            <div>
              <label
                style={{
                  fontFamily: "'IM Fell English', serif",
                  fontSize: "0.72rem",
                  fontStyle: "italic",
                  color: "#555",
                  display: "block",
                  marginBottom: "0.2rem",
                }}
              >
                Type
              </label>
              <select
                style={inputStyle}
                value={newForm.type}
                onChange={(e) =>
                  setNewForm((f) => ({
                    ...f,
                    type: e.target.value as "rss" | "scrape",
                  }))
                }
              >
                <option value="scrape">Scrape</option>
                <option value="rss">RSS</option>
              </select>
            </div>
            <div>
              <label
                style={{
                  fontFamily: "'IM Fell English', serif",
                  fontSize: "0.72rem",
                  fontStyle: "italic",
                  color: "#555",
                  display: "block",
                  marginBottom: "0.2rem",
                }}
              >
                Max Articles
              </label>
              <input
                style={inputStyle}
                type="number"
                value={newForm.max_articles}
                onChange={(e) =>
                  setNewForm((f) => ({
                    ...f,
                    max_articles: parseInt(e.target.value),
                  }))
                }
              />
            </div>
          </div>
          {error && (
            <p
              style={{
                fontFamily: "'IM Fell English', serif",
                color: "#8b0000",
                fontSize: "0.8rem",
                marginBottom: "0.5rem",
              }}
            >
              {error}
            </p>
          )}
          <button
            onClick={handleAdd}
            style={{
              fontFamily: "'Playfair Display', serif",
              fontSize: "0.75rem",
              letterSpacing: "0.08em",
              padding: "0.35rem 1rem",
              border: "2px solid #1a1a1a",
              background: "#1a1a1a",
              color: "#f5f0e8",
              cursor: "pointer",
              textTransform: "uppercase",
            }}
          >
            Submit
          </button>
        </div>
      )}

      {loading ? (
        <p
          style={{
            fontFamily: "'IM Fell English', serif",
            fontStyle: "italic",
            color: "#777",
            padding: "2rem 0",
          }}
        >
          Loading sources...
        </p>
      ) : (
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                {[
                  "Name",
                  "URL",
                  "Type",
                  "Status",
                  "Max",
                  "Score",
                  "Actions",
                ].map((h) => (
                  <th key={h} style={headStyle}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sources.map((source) => (
                <tr key={source.id}>
                  {editingId === source.id ? (
                    <>
                      <td style={cellStyle}>
                        <input
                          style={inputStyle}
                          value={editForm.name ?? ""}
                          onChange={(e) =>
                            setEditForm((f) => ({ ...f, name: e.target.value }))
                          }
                        />
                      </td>
                      <td style={cellStyle}>
                        <input
                          style={inputStyle}
                          value={editForm.url ?? ""}
                          onChange={(e) =>
                            setEditForm((f) => ({ ...f, url: e.target.value }))
                          }
                        />
                      </td>
                      <td style={cellStyle}>
                        <select
                          style={inputStyle}
                          value={editForm.type ?? "scrape"}
                          onChange={(e) =>
                            setEditForm((f) => ({
                              ...f,
                              type: e.target.value as "rss" | "scrape",
                            }))
                          }
                        >
                          <option value="scrape">Scrape</option>
                          <option value="rss">RSS</option>
                        </select>
                      </td>
                      <td style={cellStyle}>
                        <select
                          style={inputStyle}
                          value={editForm.status ?? "active"}
                          onChange={(e) =>
                            setEditForm((f) => ({
                              ...f,
                              status: e.target.value,
                            }))
                          }
                        >
                          <option value="active">Active</option>
                          <option value="paused">Paused</option>
                        </select>
                      </td>
                      <td style={cellStyle}>
                        <input
                          style={{ ...inputStyle, width: "50px" }}
                          type="number"
                          value={editForm.max_articles ?? 10}
                          onChange={(e) =>
                            setEditForm((f) => ({
                              ...f,
                              max_articles: parseInt(e.target.value),
                            }))
                          }
                        />
                      </td>
                      <td style={cellStyle}>
                        {source.engagement_score?.toFixed(2)}
                      </td>
                      <td style={cellStyle}>
                        <div style={{ display: "flex", gap: "0.4rem" }}>
                          <button
                            onClick={() => handleSaveEdit(source.id)}
                            style={{
                              fontFamily: "'IM Fell English', serif",
                              fontSize: "0.75rem",
                              padding: "0.2rem 0.5rem",
                              border: "1px solid #2d6a2d",
                              background: "#2d6a2d",
                              color: "#fff",
                              cursor: "pointer",
                            }}
                          >
                            Save
                          </button>
                          <button
                            onClick={() => setEditingId(null)}
                            style={{
                              fontFamily: "'IM Fell English', serif",
                              fontSize: "0.75rem",
                              padding: "0.2rem 0.5rem",
                              border: "1px solid #aaa",
                              background: "transparent",
                              cursor: "pointer",
                            }}
                          >
                            Cancel
                          </button>
                        </div>
                      </td>
                    </>
                  ) : (
                    <>
                      <td style={cellStyle}>{source.name}</td>
                      <td
                        style={{
                          ...cellStyle,
                          maxWidth: "200px",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        <a
                          href={source.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{ color: "#555", textDecoration: "underline" }}
                        >
                          {source.url}
                        </a>
                      </td>
                      <td style={cellStyle}>{source.type}</td>
                      <td style={cellStyle}>
                        <span
                          style={{
                            padding: "0.1rem 0.4rem",
                            border: "1px solid",
                            borderColor:
                              source.status === "active" ? "#2d6a2d" : "#888",
                            color:
                              source.status === "active" ? "#2d6a2d" : "#888",
                            fontSize: "0.7rem",
                            fontFamily: "'IM Fell English', serif",
                            fontStyle: "italic",
                          }}
                        >
                          {source.status}
                        </span>
                      </td>
                      <td style={cellStyle}>{source.max_articles}</td>
                      <td style={cellStyle}>
                        {source.engagement_score?.toFixed(2)}
                      </td>
                      <td style={cellStyle}>
                        <div style={{ display: "flex", gap: "0.4rem" }}>
                          <button
                            onClick={() => {
                              setEditingId(source.id);
                              setEditForm(source);
                            }}
                            style={{
                              display: "flex",
                              alignItems: "center",
                              background: "transparent",
                              border: "none",
                              cursor: "pointer",
                              color: "#555",
                              padding: "0.2rem",
                            }}
                          >
                            <Pencil size={14} />
                          </button>
                          <button
                            onClick={() => handleDelete(source.id)}
                            style={{
                              display: "flex",
                              alignItems: "center",
                              background: "transparent",
                              border: "none",
                              cursor: "pointer",
                              color: "#8b0000",
                              padding: "0.2rem",
                            }}
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ── Main Page ────────────────────────────────────────────────

export default function ArticleFeedPage() {
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>("feed");
  const [category, setCategory] = useState<Category>("all");
  const [page, setPage] = useState(0);
  const [fontSize, setFontSize] = useState(1);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const PAGE_SIZE = 20;

  // Close menu on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  async function fetchArticles() {
    setLoading(true);
    const { data, error } = await supabase
      .from("articles")
      .select(
        `id, url, title, author, published_at, raw_text, created_at, saved, archived, category, sources(id, name, engagement_score), summaries(short, medium)`,
      )
      .eq("archived", false)
      .order("created_at", { ascending: false })
      .limit(100);

    if (!error && data) {
      const sorted = (data as unknown as Article[])
        .map((article) => ({
          article,
          weight:
            (article.sources?.engagement_score ?? 0.5) + Math.random() * 0.4,
        }))
        .sort((a, b) => b.weight - a.weight)
        .map(({ article }) => article);
      setArticles(sorted);
    }
    setLoading(false);
  }

  useEffect(() => {
    fetchArticles();
  }, []);

  function handleArchive(id: string) {
    setArticles((prev) => prev.filter((a) => a.id !== id));
  }

  function handleSaveToggle(id: string, saved: boolean) {
    setArticles((prev) => prev.map((a) => (a.id === id ? { ...a, saved } : a)));
  }

  const feedArticles = articles.filter((a) => !a.archived);
  const clippedArticles = articles.filter((a) => a.saved);
  const filteredArticles =
    category === "all"
      ? feedArticles
      : feedArticles.filter((a) => a.category === category);
  const totalPages = Math.ceil(filteredArticles.length / PAGE_SIZE);
  const pagedArticles = filteredArticles.slice(
    page * PAGE_SIZE,
    (page + 1) * PAGE_SIZE,
  );

  const currentCategoryLabel =
    CATEGORIES.find((c) => c.key === category)?.label ?? "Front Page";

  // Small utility button style (font size, clippings, sources)
  const utilBtnStyle: React.CSSProperties = {
    fontFamily: "'IM Fell English', serif",
    fontSize: "0.72rem",
    fontStyle: "italic",
    border: "1px solid #aaa",
    background: "transparent",
    color: "#555",
    cursor: "pointer",
    padding: "0.2rem 0.5rem",
    letterSpacing: "0.03em",
    display: "flex",
    alignItems: "center",
    gap: "0.3rem",
    whiteSpace: "nowrap" as const,
  };

  // Category tab style (for the inline row)
  const catTabStyle = (c: Category): React.CSSProperties => ({
    fontFamily: "'Playfair Display', serif",
    fontSize: "0.68rem",
    letterSpacing: "0.1em",
    textTransform: "uppercase",
    padding: "0.35rem 0.75rem",
    border: "1px solid #1a1a1a",
    borderBottom:
      tab === "feed" && category === c ? "none" : "1px solid #1a1a1a",
    background: tab === "feed" && category === c ? "#f5f0e8" : "#e8e3d8",
    color: "#1a1a1a",
    cursor: "pointer",
    marginBottom: tab === "feed" && category === c ? "-1px" : "0",
    position: "relative",
    zIndex: tab === "feed" && category === c ? 1 : 0,
    whiteSpace: "nowrap" as const,
  });

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,700;0,900;1,400;1,700&family=IM+Fell+English:ital@0;1&family=UnifrakturMaguntia&display=swap');

        * { box-sizing: border-box; margin: 0; padding: 0; }

        body {
          background: #f5f0e8;
          background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='400'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3CfeColorMatrix type='saturate' values='0'/%3E%3C/filter%3E%3Crect width='400' height='400' filter='url(%23noise)' opacity='0.04'/%3E%3C/svg%3E");
        }

        ::-webkit-scrollbar { width: 6px; }
        ::-webkit-scrollbar-track { background: #f5f0e8; }
        ::-webkit-scrollbar-thumb { background: #1a1a1a; }

        .masthead-rule { border: none; border-top: 4px double #1a1a1a; margin: 0.5rem 0; }

        .feed-columns { column-count: 2; column-gap: 2.5rem; column-rule: 1px solid #1a1a1a; }
        @media (max-width: 700px) { .feed-columns { column-count: 1; } }
        .feed-columns article { break-inside: avoid; }

        .article-content p { margin-bottom: 0.9rem; text-indent: 1.5em; }
        .article-content p:first-child { text-indent: 1.5em; }
        .article-content h1, .article-content h2, .article-content h3 { font-family: 'Playfair Display', serif; margin: 1rem 0 0.4rem; }
        .article-content ul, .article-content ol { margin: 0.5rem 0 0.9rem 1.5rem; }
        .article-content li { margin-bottom: 0.3rem; }

        /* Category tab row — hide overflow tabs on narrow screens */
        .cat-tab-row {
          display: flex;
          align-items: flex-end;
          overflow: hidden;
          flex: 1;
          min-width: 0;
        }

        /* Menu button — hidden on wide screens */
        .cat-menu-btn { display: none; }

        @media (max-width: 700px) {
          .cat-tab-row .cat-tab { display: none; }
          .cat-menu-btn { display: flex !important; }
        }

        /* On wide screens hide menu button, show all tabs */
        @media (min-width: 701px) {
          .cat-tab { display: inline-flex !important; }
          .cat-menu-btn { display: none !important; }
        }
      `}</style>

      <div
        style={{
          maxWidth: "960px",
          margin: "0 auto",
          padding: "2rem 1.5rem",
          minHeight: "100vh",
        }}
      >
        {/* Masthead */}
        <header
          style={{
            position: "relative",
            textAlign: "center",
            marginBottom: "1.5rem",
          }}
        >
          <p
            style={{
              fontFamily: "'IM Fell English', serif",
              fontSize: "0.72rem",
              letterSpacing: "0.12em",
              color: "#555",
              textTransform: "uppercase",
              marginBottom: "0.5rem",
            }}
          >
            {getTodayHeader()}
          </p>
          <hr className="masthead-rule" />
          <h1
            style={{
              fontFamily: "'UnifrakturMaguntia', cursive",
              fontSize: "clamp(2.8rem, 8vw, 5rem)",
              color: "#0a0a0a",
              lineHeight: "1",
              letterSpacing: "-0.01em",
              margin: "0.4rem 0",
            }}
          >
            Duncan's Daily Digest
          </h1>
          <hr className="masthead-rule" />

          {/* Sub-masthead: Front Page button + utility controls */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginTop: "0.4rem",
            }}
          >
            {/* Left: Back + Front Page */}
            <div
              style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}
            >
<BackHome
  style={{
    display: "inline-flex",
    alignItems: "center",
    gap: "0.3rem",
    padding: "0.25rem 0.6rem",
    color: "#6b6b6b",
    textDecoration: "none",
    fontSize: "0.85rem",
                  fontFamily: "'IM Fell English', serif",
                                    fontStyle: "italic",
    transition: "background 0.15s, color 0.15s",
    border: "1px solid #aaa",
    background: "transparent",
  }}
>
  <i className="ti ti-arrow-left" />
  Back
</BackHome>

              <button
                onClick={() => {
                  setTab("feed");
                  setCategory("all");
                  setPage(0);
                }}
                style={{
                  fontFamily: "'IM Fell English', serif",
                  fontSize: "1rem",
                  fontStyle: "italic",
                  color:
                    tab === "feed" && category === "all" ? "#0a0a0a" : "#555",
                  background: "transparent",
                  border: "none",
                  cursor: "pointer",
                  letterSpacing: "0.05em",
                  textDecoration:
                    tab === "feed" && category === "all" ? "underline" : "none",
                  padding: 0,
                }}
              >
                Front Page
              </button>
            </div>

            {/* Right controls: font size + clippings + sources */}
            <div
              style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}
            >
              <button
                onClick={() => setFontSize((f) => Math.max(0.85, f - 0.05))}
                style={{
                  fontFamily: "'IM Fell English', serif",
                  fontSize: "0.8rem",
                  border: "1px solid #aaa",
                  background: "transparent",
                  width: "22px",
                  height: "22px",
                  cursor: "pointer",
                  color: "#555",
                }}
              >
                A
              </button>
              <button
                onClick={() => setFontSize((f) => Math.min(1.25, f + 0.05))}
                style={{
                  fontFamily: "'IM Fell English', serif",
                  fontSize: "1rem",
                  border: "1px solid #aaa",
                  background: "transparent",
                  width: "22px",
                  height: "22px",
                  cursor: "pointer",
                  color: "#555",
                }}
              >
                A
              </button>

              <button
                onClick={() => {
                  setTab("clipped");
                  setPage(0);
                }}
                style={{
                  ...utilBtnStyle,
                  color: tab === "clipped" ? "#0a0a0a" : "#555",
                  borderColor: tab === "clipped" ? "#1a1a1a" : "#aaa",
                }}
              >
                <Bookmark size={12} />
                Clippings{" "}
                {clippedArticles.length > 0 && `(${clippedArticles.length})`}
              </button>

              <button
                onClick={() => {
                  setTab("sources");
                  setPage(0);
                }}
                style={{
                  ...utilBtnStyle,
                  color: tab === "sources" ? "#0a0a0a" : "#555",
                  borderColor: tab === "sources" ? "#1a1a1a" : "#aaa",
                }}
              >
                <Settings size={12} />
                Sources
              </button>
            </div>
          </div>
        </header>

        {/* Category tab row + hamburger */}
        {(tab === "feed" || tab === "clipped" || tab === "sources") && (
          <div
            style={{
              position: "relative",
              borderBottom: "1px solid #1a1a1a",
              display: "flex",
              alignItems: "flex-end",
            }}
            ref={menuRef}
          >
            {/* Hamburger — shown on narrow via CSS */}
            <button
              className="cat-menu-btn"
              onClick={() => setMenuOpen((o) => !o)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.4rem",
                fontFamily: "'Playfair Display', serif",
                fontSize: "0.68rem",
                letterSpacing: "0.1em",
                textTransform: "uppercase",
                padding: "0.35rem 0.75rem",
                border: "1px solid #1a1a1a",
                borderBottom: "none",
                background: "#e8e3d8",
                color: "#1a1a1a",
                cursor: "pointer",
              }}
            >
              <Menu size={14} />
              {currentCategoryLabel}
            </button>

            {/* Inline tabs — hidden on narrow via CSS */}
            <div className="cat-tab-row">
              {CATEGORIES.map(({ key, label }) => (
                <button
                  key={key}
                  className="cat-tab"
                  onClick={() => {
                    setTab("feed");
                    setCategory(key);
                    setPage(0);
                  }}
                  style={catTabStyle(key)}
                >
                  {label}
                </button>
              ))}
            </div>

            {/* Dropdown menu */}
            {menuOpen && (
              <div
                style={{
                  position: "absolute",
                  top: "100%",
                  left: 0,
                  zIndex: 100,
                  background: "#f5f0e8",
                  border: "1px solid #1a1a1a",
                  borderTop: "none",
                  minWidth: "160px",
                  boxShadow: "2px 2px 8px rgba(0,0,0,0.1)",
                }}
              >
                {CATEGORIES.map(({ key, label }) => (
                  <button
                    key={key}
                    onClick={() => {
                      setTab("feed");
                      setCategory(key);
                      setPage(0);
                      setMenuOpen(false);
                    }}
                    style={{
                      display: "block",
                      width: "100%",
                      textAlign: "left",
                      fontFamily: "'Playfair Display', serif",
                      fontSize: "0.68rem",
                      letterSpacing: "0.1em",
                      textTransform: "uppercase",
                      padding: "0.5rem 1rem",
                      border: "none",
                      borderBottom: "1px solid #e0dbd0",
                      background:
                        category === key && tab === "feed"
                          ? "#e8e3d8"
                          : "transparent",
                      color: "#1a1a1a",
                      cursor: "pointer",
                    }}
                  >
                    {label}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Tab Content */}
        <div style={{ paddingTop: "1.5rem" }}>
          {tab === "feed" &&
            (loading ? (
              <p
                style={{
                  fontFamily: "'IM Fell English', serif",
                  fontStyle: "italic",
                  color: "#777",
                  textAlign: "center",
                  padding: "3rem 0",
                }}
              >
                Setting type...
              </p>
            ) : filteredArticles.length === 0 ? (
              <p
                style={{
                  fontFamily: "'IM Fell English', serif",
                  fontStyle: "italic",
                  color: "#777",
                  textAlign: "center",
                  padding: "3rem 0",
                }}
              >
                No articles in this section. The presses are idle.
              </p>
            ) : (
              <div className="feed-columns">
                {pagedArticles.map((article) => (
                  <ArticleCard
                    key={article.id}
                    article={article}
                    onArchive={handleArchive}
                    onSaveToggle={handleSaveToggle}
                    fontSize={fontSize}
                  />
                ))}
              </div>
            ))}

          {tab === "clipped" &&
            (clippedArticles.length === 0 ? (
              <p
                style={{
                  fontFamily: "'IM Fell English', serif",
                  fontStyle: "italic",
                  color: "#777",
                  textAlign: "center",
                  padding: "3rem 0",
                }}
              >
                No clippings yet. Fold the corner of an article to save it.
              </p>
            ) : (
              <div className="feed-columns">
                {clippedArticles.map((article) => (
                  <ArticleCard
                    key={article.id}
                    article={article}
                    onArchive={handleArchive}
                    onSaveToggle={handleSaveToggle}
                    fontSize={fontSize}
                  />
                ))}
              </div>
            ))}

          {tab === "sources" && <SourcesTab />}
        </div>

        {/* Pagination */}
        {tab === "feed" && totalPages > 1 && (
          <div
            style={{
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              gap: "1.5rem",
              marginTop: "2rem",
              paddingTop: "1rem",
              borderTop: "1px solid #1a1a1a",
            }}
          >
            <button
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={page === 0}
              style={{
                fontFamily: "'Playfair Display', serif",
                fontSize: "0.75rem",
                padding: "0.4rem 1rem",
                border: "1px solid",
                background: "transparent",
                color: page === 0 ? "#aaa" : "#1a1a1a",
                borderColor: page === 0 ? "#aaa" : "#1a1a1a",
                cursor: page === 0 ? "not-allowed" : "pointer",
                display: "flex",
                alignItems: "center",
              }}
            >
              <ChevronLeft size={14} />
            </button>
            <span
              style={{
                fontFamily: "'IM Fell English', serif",
                fontStyle: "italic",
                fontSize: "0.82rem",
                color: "#555",
              }}
            >
              Page {page + 1} of {totalPages}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
              disabled={page === totalPages - 1}
              style={{
                fontFamily: "'Playfair Display', serif",
                fontSize: "0.75rem",
                padding: "0.4rem 1rem",
                border: "1px solid",
                background: "transparent",
                color: page === totalPages - 1 ? "#aaa" : "#1a1a1a",
                borderColor: page === totalPages - 1 ? "#aaa" : "#1a1a1a",
                cursor: page === totalPages - 1 ? "not-allowed" : "pointer",
                display: "flex",
                alignItems: "center",
              }}
            >
              <ChevronRight size={14} />
            </button>
          </div>
        )}

        {/* Footer */}
        <footer
          style={{
            marginTop: "3rem",
            paddingTop: "1rem",
            borderTop: "4px double #1a1a1a",
            textAlign: "center",
          }}
        >
          <p
            style={{
              fontFamily: "'IM Fell English', serif",
              fontSize: "0.72rem",
              fontStyle: "italic",
              color: "#777",
            }}
          >
            Printed daily by the automated press. Est. 2026.
          </p>
        </footer>
      </div>
    </>
  );
}
