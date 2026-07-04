import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import type { PromptParams } from '@/lib/balanza/types';

// Matches the naming convention already used in scripts/article_feed/summarize.ts
// (gemini-3.1-flash-lite). Verify these model ids are still current against
// https://ai.google.dev/gemini-api/docs/models before relying on this.
const MODEL_IDS: Record<PromptParams['model'], string> = {
  'gemini-flash': 'gemini-3.5-flash',
  'gemini-flash-lite': 'gemini-3.1-flash-lite',
};

function buildPrompt(p: PromptParams): string {
  const tierFraming: Record<PromptParams['tier'], string> = {
    clean_up:
      'The user is currently in a deficit on this front and wants to dig back out to baseline.',
    maintenance:
      'The user is at a stable baseline and wants to keep it that way with minimum upkeep.',
    growth: 'The user is at baseline and wants to push into new territory.',
  };

  return `You are a pragmatic project-ideation assistant inside "Balanza," a tool that frames
personal projects around three forces: Clean Up, Maintenance, and Growth.

Context: ${tierFraming[p.tier]}
Topic: ${p.topic}
Timeframe: ${p.timeframe.replace('_', ' ')}
Conversation type: ${p.intent === 'brainstorm' ? 'Brainstorm — surface options, keep it exploratory' : 'Blueprint — give a concrete, sequenced plan'}
Platform: ${p.platform === 'code' ? 'Software / code-based project' : 'Physical / offline project'}
Friction tolerance: ${p.friction}/100 (0 = wants the path of least resistance, 100 = willing to grind)

Respond in clean markdown. ${
    p.intent === 'brainstorm'
      ? 'Offer 3-5 distinct project directions with a one-line rationale each.'
      : 'Give a single concrete plan: numbered steps, rough time estimate per step, and one likely failure point to watch for.'
  }`;
}

export async function POST(req: NextRequest) {
  try {
    const params = (await req.json()) as PromptParams;

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) throw new Error('GEMINI_API_KEY is not set.');

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: MODEL_IDS[params.model] });

    const result = await model.generateContent(buildPrompt(params));
    const markdown = result.response.text();

    return NextResponse.json({ markdown });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}