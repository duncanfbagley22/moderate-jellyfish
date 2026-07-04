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

  const platformFraming: Record<PromptParams['platform'], string> = {
    code: 'Software / code-based project. Focus on architecture, implementation steps, and tooling choices — give technical specifics, not generic advice that could apply to anything.',
    physical:
      'Physical / offline project — no code involved. Focus on real-world logistics: materials, physical space, timing, and concrete hands-on steps.',
    spreadsheet:
      'Spreadsheet-based project — the deliverable is a tracker, model, or planning artifact. Focus on structure: what columns, sheets, or formulas it needs and how the data should be organized, not narrative prose.',
  };

  return `You are a pragmatic project-ideation assistant inside "Balanza," a tool that frames
personal projects around three forces: Clean Up, Maintenance, and Growth.

This is a one-shot response: do not ask clarifying questions, do not offer to continue the
conversation, and do not end by asking the user anything. There is no follow-up turn, so give
your best complete answer in this single pass.

The user's request, which is what you should respond to directly:
"${p.userPrompt}"

Use the following context to shape tone, scope, and specificity — but the request above is
what you're answering:
- Force: ${tierFraming[p.tier]}
- Topic: ${p.topic}
- Timeframe: ${p.timeframe.replace('_', ' ')}
- Conversation type: ${p.intent === 'brainstorm' ? 'Brainstorm — surface options, keep it exploratory' : 'Blueprint — give a concrete, sequenced plan'}
- Platform: ${platformFraming[p.platform]}
- Friction tolerance: ${p.friction}/100 (0 = wants the path of least resistance, 100 = willing to grind)
- Creativity: ${p.creativity}/100 (0 = stick to safe, proven, obvious ideas, 100 = push for bold, unconventional, unexpected ones)

The Platform above should genuinely shape the *form* of your answer, not just get a passing
mention — a code project should focus on a plan that can be created digitally, a physical project should focus on a project that can be done without digital technology, and a spreadsheet project should focus on projects that can be managed in a spreadsheet with low complexity.

Respond in clean markdown. ${
    p.intent === 'brainstorm'
      ? 'Offer 3-5 distinct project directions with a one-line rationale each.'
      : 'Give a single concrete plan: numbered steps, rough time estimate per step, and one likely failure point to watch for.'
  }`;
}

// Maps the 0-100 creativity slider to the Gemini `temperature` param so the
// dial actually affects sampling, not just the wording of the prompt.
// 0 -> 0.2 (tight, deterministic) ... 100 -> 1.2 (loose, exploratory).
function creativityToTemperature(creativity: number): number {
  return 0.2 + (creativity / 100) * 1.0;
}

export async function POST(req: NextRequest) {
  try {
    const params = (await req.json()) as PromptParams;

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) throw new Error('GEMINI_API_KEY is not set.');

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
      model: MODEL_IDS[params.model],
      generationConfig: { temperature: creativityToTemperature(params.creativity) },
    });

    const result = await model.generateContent(buildPrompt(params));
    const markdown = result.response.text();

    return NextResponse.json({ markdown });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}