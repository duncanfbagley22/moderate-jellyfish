"use client";

import { useCallback, useEffect, useState, useRef } from "react";
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
import styles from "@/app/feed/styles/feed.module.css";

import {
  Playfair_Display,
  IM_Fell_English,
  UnifrakturMaguntia,
} from "next/font/google";

const playfair = Playfair_Display({
  subsets: ["latin"],
  weight: ["400", "700", "900"],
  style: ["normal", "italic"],
  variable: "--font-playfair", // Exposes a CSS variable
});

const imFell = IM_Fell_English({
  subsets: ["latin"],
  weight: ["400"],
  style: ["normal", "italic"],
  variable: "--font-im-fell",
});

const unifraktur = UnifrakturMaguntia({
  subsets: ["latin"],
  weight: ["400"],
  variable: "--font-unifraktur",
});

const classes = styles as Record<string, string>;
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

const FLAG_SCORE_THRESHOLD = 0.3; // below this = flagged
const FLAG_MIN_RATINGS = 5; // require enough ratings to matter

// ── Helpers ──────────────────────────────────────────────────

function isFlaggedForRemoval(source: SourceRow): boolean {
  return (
    source.rating_count >= FLAG_MIN_RATINGS &&
    source.engagement_score < FLAG_SCORE_THRESHOLD
  );
}

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
      className={classes.dogEar}
      style={{ opacity: saved ? 1 : 0.25 }} // Kept dynamic state mapping inline
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
  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, []);

  return (
    <div onClick={onClose} className={`${classes.modalOverlay}`}>
      <div
        onClick={(e) => e.stopPropagation()}
        className={classes.modalContainer}
      >
        <div className={classes.modalTopBar}>
          <a
            href={article.url}
            target="_blank"
            rel="noopener noreferrer"
            className={classes.modalOriginalLink}
          >
            Read Original →
          </a>
          <button onClick={onClose} className={classes.modalCloseBtn}>
            <X size={18} strokeWidth={2} />
          </button>
        </div>

        <div className={classes.modalHeader}>
          <span className={classes.modalSource}>
            {article.sources?.name ?? "Unknown"}
          </span>
          <h2 className={classes.modalTitle}>{article.title ?? article.url}</h2>
          {article.author && (
            <p className={classes.modalAuthor}>By {article.author}</p>
          )}
        </div>

        <div className={classes.modalBody}>
          {article.raw_text ? (
            <ReactMarkdown>{stripJinaHeader(article.raw_text)}</ReactMarkdown>
          ) : (
            <em style={{ color: "#888" }}>No full text available.</em>
          )}
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
        className={classes.card}
        style={{
          opacity: fading ? 0 : 1,
          fontSize: `${fontSize}rem`,
        }}
      >
        <DogEar saved={article.saved} onClick={handleSaveToggle} />

        <div className={classes.metaRow}>
          <span className={classes.sourceName}>
            {article.sources?.name ?? "Unknown"}
          </span>
          <span className={classes.publishDate}>
            {formatDate(article.published_at ?? article.created_at)}
          </span>
        </div>

        <a
          href={article.url}
          target="_blank"
          rel="noopener noreferrer"
          className={classes.titleLink}
        >
          <h2 className={classes.title}>{article.title ?? article.url}</h2>
        </a>

        {article.author && (
          <p className={classes.author}>By {article.author}</p>
        )}

        <div className={`article-content ${classes.summaryText}`}>
          {content ? (
            <p>{content}</p>
          ) : (
            <em className={classes.noSummary}>No summary available.</em>
          )}
        </div>

        <div className={classes.actionsRow}>
          {(["short", "medium"] as ViewMode[]).map((mode) => (
            <button
              key={mode}
              onClick={() => setView(mode)}
              className={`${classes.viewModeBtn} ${view === mode ? classes.viewModeBtnActive : ""}`}
            >
              {mode === "short" ? "Brief" : "Summary"}
            </button>
          ))}

          <button
            onClick={() => setShowModal(true)}
            className={classes.fullTextBtn}
          >
            Full Text
          </button>

          <div className={classes.buttonGroup}>
            <button
              onClick={() => handleRating(1)}
              title="Recommend"
              className={`${classes.actionIconBtn} ${rating === 1 ? classes.recommendActive : ""}`}
            >
              <Check size={13} strokeWidth={2.5} />
            </button>
            <button
              onClick={() => handleRating(-1)}
              title="Pass"
              className={`${classes.actionIconBtn} ${rating === -1 ? classes.passActive : ""}`}
            >
              <X size={13} strokeWidth={2.5} />
            </button>
            <button
              onClick={handleDismiss}
              title="Dismiss"
              className={classes.dismissBtn}
            >
              <Archive size={13} strokeWidth={2} />
            </button>
          </div>

          <a
            href={article.url}
            target="_blank"
            rel="noopener noreferrer"
            className={classes.originalLink}
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

  const fetchSources = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase.from("sources").select("*").order("name");
    setSources(data ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void fetchSources();
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [fetchSources]);

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

  return (
    <>
      <div className={classes.sourcesHeader}>
        <p className={classes.sourcesCount}>
          {sources.length} registered sources
        </p>
        <div className={classes.sourcesBtnGroup}>
          <button
            onClick={() => {
              setTesting((t) => !t);
              setTestResult(null);
              setTestError(null);
            }}
            className={`${classes.sourcesHeaderBtn} ${testing ? classes.sourcesHeaderBtnActive : ""}`}
          >
            {testing ? "Cancel" : "Test a Source"}
          </button>
          <button
            onClick={() => setAdding((a) => !a)}
            className={`${classes.sourcesHeaderBtn} ${adding ? classes.sourcesHeaderBtnActive : ""}`}
          >
            {adding ? "Cancel" : "+ Add Source"}
          </button>
        </div>
      </div>

      {testing && (
        <div className={classes.panelContainer}>
          <h3 className={classes.panelTitle}>Test a Source</h3>
          <div className={classes.panelGridLayout}>
            <div>
              <label className={classes.fieldLabel}>URL *</label>
              <input
                className={classes.tableInput}
                placeholder="https://..."
                value={testForm.url}
                onChange={(e) =>
                  setTestForm((f) => ({ ...f, url: e.target.value }))
                }
              />
            </div>
            <div>
              <label className={classes.fieldLabel}>Type</label>
              <select
                className={classes.tableInput}
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
              <label className={classes.fieldLabel}>
                URL Exclude (optional)
              </label>
              <input
                className={classes.tableInput}
                placeholder="/podcasts"
                value={testForm.url_exclude}
                onChange={(e) =>
                  setTestForm((f) => ({ ...f, url_exclude: e.target.value }))
                }
              />
            </div>
            <div>
              <label className={classes.fieldLabel}>
                URL Pattern (optional)
              </label>
              <input
                className={classes.tableInput}
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
            className={classes.panelSubmitBtn}
            style={{
              cursor: testLoading ? "not-allowed" : "pointer",
              opacity: testLoading ? 0.6 : 1,
            }}
          >
            {testLoading ? "Testing..." : "Run Test"}
          </button>

          {testError && <p className={classes.panelErrorText}>{testError}</p>}

          {testResult && (
            <div className={classes.testResultBox}>
              <p className={classes.testResultTitle}>{testResult.title}</p>
              <a
                href={testResult.url}
                target="_blank"
                rel="noopener noreferrer"
                className={classes.testResultUrlLink}
              >
                {testResult.url}
              </a>
              <div className={classes.testResultPreviewArea}>
                {testResult.preview}
              </div>
            </div>
          )}
        </div>
      )}

      {adding && (
        <div className={classes.panelContainer}>
          <div className={classes.panelGridLayoutThreeCol}>
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
                <label className={classes.fieldLabel}>{label}</label>
                <input
                  className={classes.tableInput}
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
              <label className={classes.fieldLabel}>Type</label>
              <select
                className={classes.tableInput}
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
              <label className={classes.fieldLabel}>Max Articles</label>
              <input
                className={classes.tableInput}
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
          {error && <p className={classes.panelErrorTextNoMargin}>{error}</p>}
          <button onClick={handleAdd} className={classes.panelSubmitBtn}>
            Submit
          </button>
        </div>
      )}

      {loading ? (
        <p className={classes.statusMessageText} style={{ padding: "2rem 0" }}>
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
                  <th
                    key={h}
                    className={`${classes.tableCell} ${classes.tableHeader}`}
                  >
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
                      <td className={classes.tableCell}>
                        <input
                          className={classes.tableInput}
                          value={editForm.name ?? ""}
                          onChange={(e) =>
                            setEditForm((f) => ({ ...f, name: e.target.value }))
                          }
                        />
                      </td>
                      <td className={classes.tableCell}>
                        <input
                          className={classes.tableInput}
                          value={editForm.url ?? ""}
                          onChange={(e) =>
                            setEditForm((f) => ({ ...f, url: e.target.value }))
                          }
                        />
                      </td>
                      <td className={classes.tableCell}>
                        <select
                          className={classes.tableInput}
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
                      <td className={classes.tableCell}>
                        <select
                          className={classes.tableInput}
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
                      <td className={classes.tableCell}>
                        <input
                          className={`${classes.tableInput} ${classes.tableInputSmallWidth}`}
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
                      <td className={classes.tableCell}>
                        {source.engagement_score?.toFixed(2)}
                      </td>
                      <td className={classes.tableCell}>
                        <div className={classes.tableActionBtnGroup}>
                          <button
                            onClick={() => handleSaveEdit(source.id)}
                            className={classes.saveRowBtn}
                          >
                            Save
                          </button>
                          <button
                            onClick={() => setEditingId(null)}
                            className={classes.cancelRowBtn}
                          >
                            Cancel
                          </button>
                        </div>
                      </td>
                    </>
                  ) : (
                    <>
                      <td className={classes.tableCell}>{source.name}</td>
                      <td
                        className={`${classes.tableCell} ${classes.tableCellEllipsis}`}
                      >
                        <a
                          href={source.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={classes.tableCellUrl}
                        >
                          {source.url}
                        </a>
                      </td>
                      <td className={classes.tableCell}>{source.type}</td>
                      <td className={classes.tableCell}>
                        <span
                          className={`${classes.statusBadge} ${
                            source.status === "active"
                              ? classes.statusActive
                              : classes.statusPaused
                          }`}
                        >
                          {source.status}
                        </span>
                      </td>
                      <td className={classes.tableCell}>
                        {source.max_articles}
                      </td>
                      <td className={classes.tableCell}>
                        <span
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "0.35rem",
                          }}
                        >
                          {source.engagement_score?.toFixed(2)}
                          <span style={{ color: "#888", fontSize: "0.75rem" }}>
                            ({source.rating_count ?? 0})
                          </span>
                          {isFlaggedForRemoval(source) && (
                            <span
                              title="Low engagement — consider removing this source"
                              style={{
                                color: "#c0392b",
                                fontWeight: 700,
                                fontSize: "0.8rem",
                              }}
                            >
                              ⚑ Remove?
                            </span>
                          )}
                        </span>
                      </td>
                      <td className={classes.tableCell}>
                        <div className={classes.tableActionBtnGroup}>
                          <button
                            onClick={() => {
                              setEditingId(source.id);
                              setEditForm(source);
                            }}
                            className={`${classes.iconRowBtn} ${classes.editIconColor}`}
                          >
                            <Pencil size={14} />
                          </button>
                          <button
                            onClick={() => handleDelete(source.id)}
                            className={`${classes.iconRowBtn} ${classes.deleteIconColor}`}
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
    </>
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

  // Set body background to match page aesthetic
  useEffect(() => {
    document.body.style.backgroundColor = "#f5f0e8";
    return () => {
      document.body.style.backgroundColor = "";
    };
  }, []);

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

  const fetchArticles = useCallback(async () => {
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
      const raw = data as unknown as Article[];

      // Group by calendar date (published_at preferred, fall back to created_at)
      const byDate = new Map<string, Article[]>();
      for (const article of raw) {
        const key = (article.published_at ?? article.created_at).slice(0, 10);
        if (!byDate.has(key)) byDate.set(key, []);
        byDate.get(key)!.push(article);
      }

      // Sort date buckets newest-first; shuffle within each bucket
      const sorted = [...byDate.entries()]
        .sort(([a], [b]) => b.localeCompare(a))
        .flatMap(([, group]) => group.sort(() => Math.random() - 0.5));
      setArticles(sorted);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void fetchArticles();
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [fetchArticles]);

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

  // Category tab dynamic style mappings
  const catTabStyle = (c: Category): React.CSSProperties => ({
    borderBottom:
      tab === "feed" && category === c ? "none" : "1px solid #1a1a1a",
    background: tab === "feed" && category === c ? "#f5f0e8" : "#e8e3d8",
    marginBottom: tab === "feed" && category === c ? "-1px" : "0",
    position: "relative",
    zIndex: tab === "feed" && category === c ? 1 : 0,
  });

  return (
    <>
      <div
        className={`${classes.feedPageContainer} ${playfair.variable} ${imFell.variable} ${unifraktur.variable}`}
      >
        {/* Masthead */}
        <header className={classes.masthead}>
          <p className={`${classes.mastheadSubDate} ${imFell.className}`}>
            {getTodayHeader()}
          </p>
          <hr className={classes.mastheadRule} />
          <h1 className={`${classes.mastTitle} ${unifraktur.className}`}>
            Duncan&apos;s Daily Digest
          </h1>
          <hr className={classes.mastheadRule} />

          {/* Sub-masthead: Front Page button + utility controls */}
          <div className={classes.subMastheadRow}>
            {/* Left: Back + Front Page */}
            <div className={classes.subMastheadLeft}>
              <BackHome className={classes.backBtn}>
                <i className="ti ti-arrow-left" />
                Back
              </BackHome>

              <button
                onClick={() => {
                  setTab("feed");
                  setCategory("all");
                  setPage(0);
                }}
                className={`${classes.frontPageBtn} ${
                  tab === "feed" && category === "all"
                    ? classes.frontPageActive
                    : classes.frontPageInactive
                }`}
              >
                Front Page
              </button>
            </div>

            {/* Right controls: font size + clippings + sources */}
            <div className={classes.subMastheadRightControls}>
              <button
                onClick={() => setFontSize((f) => Math.max(0.85, f - 0.05))}
                className={`${classes.fontSizeBtn} ${classes.fontSizeBtnSmall}`}
              >
                A
              </button>
              <button
                onClick={() => setFontSize((f) => Math.min(1.25, f + 0.05))}
                className={`${classes.fontSizeBtn} ${classes.fontSizeBtnLarge}`}
              >
                A
              </button>

              <button
                onClick={() => {
                  setTab("clipped");
                  setPage(0);
                }}
                className={`${classes.utilBtn} ${
                  tab === "clipped"
                    ? classes.utilBtnActive
                    : classes.utilBtnInactive
                }`}
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
                className={`${classes.utilBtn} ${
                  tab === "sources"
                    ? classes.utilBtnActive
                    : classes.utilBtnInactive
                }`}
              >
                <Settings size={12} />
                Sources
              </button>
            </div>
          </div>
        </header>

        {/* Category tab row + hamburger */}
        {(tab === "feed" || tab === "clipped" || tab === "sources") && (
          <div className={classes.navigationTabBar} ref={menuRef}>
            {/* Hamburger — shown on narrow via CSS */}
            <button
              className={classes.catMenuBtn}
              onClick={() => setMenuOpen((o) => !o)}
            >
              <Menu size={14} />
              {currentCategoryLabel}
            </button>

            {/* Inline tabs — hidden on narrow via CSS */}
            <div className={classes.catTabRow}>
              {CATEGORIES.map(({ key, label }) => (
                <button
                  key={key}
                  className={classes.catTab}
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
              <div className={classes.hamburgerDropdown}>
                {CATEGORIES.map(({ key, label }) => (
                  <button
                    key={key}
                    onClick={() => {
                      setTab("feed");
                      setCategory(key);
                      setPage(0);
                      setMenuOpen(false);
                    }}
                    className={`${classes.dropdownItemBtn} ${
                      category === key && tab === "feed"
                        ? classes.dropdownItemActive
                        : ""
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Tab Content */}
        <div className={classes.contentTabWrapper}>
          {tab === "feed" &&
            (loading ? (
              <p className={classes.statusMessageText}>Setting type...</p>
            ) : filteredArticles.length === 0 ? (
              <p className={classes.statusMessageText}>
                No articles in this section. The presses are idle.
              </p>
            ) : (
              <div className={classes.feedColumns}>
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
              <p className={classes.statusMessageText}>
                No clippings yet. Fold the corner of an article to save it.
              </p>
            ) : (
              <div className={classes.feedColumns}>
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
          <div className={classes.paginationRow}>
            <button
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={page === 0}
              className={`${classes.paginationBtn} ${
                page === 0
                  ? classes.paginationBtnDisabled
                  : classes.paginationBtnActive
              }`}
            >
              <ChevronLeft size={14} />
            </button>
            <span className={classes.paginationLabel}>
              Page {page + 1} of {totalPages}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
              disabled={page === totalPages - 1}
              className={`${classes.paginationBtn} ${
                page === totalPages - 1
                  ? classes.paginationBtnDisabled
                  : classes.paginationBtnActive
              }`}
            >
              <ChevronRight size={14} />
            </button>
          </div>
        )}

        {/* Footer */}
        <footer className={classes.pageFooter}>
          <p className={classes.pageFooterMutedText}>
            Printed daily by the automated press. Est. 2026.
          </p>
        </footer>
      </div>
    </>
  );
}
