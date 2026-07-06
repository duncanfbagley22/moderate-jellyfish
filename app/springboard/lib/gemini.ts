import type { PromptParams } from './types';

export interface GenerateBlueprintResult {
  markdown: string;
}

/**
 * Runs the single-shot brainstorm prompt via app/springboard/api/route.ts.
 * Kept as its own function (rather than an inline fetch in the component) so
 * swapping the transport later — different route, different provider — only
 * touches this file.
 */
export async function generateBlueprint(params: PromptParams): Promise<GenerateBlueprintResult> {
  const res = await fetch('/springboard/api', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error ?? `Request failed with status ${res.status}`);
  }

  return res.json();
}