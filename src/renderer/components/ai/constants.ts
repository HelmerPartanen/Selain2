// ── Shared AI panel constants ────────────────────────────────────────────────

export const PANEL_WIDTH = 420
export const CONTENT_HEIGHT = 320
export const LOADING_DURATION = 3000

export const AURORA_GRADIENT =
  'conic-gradient(from var(--aurora-angle, 0deg) at 50% 50%, #f472b6, #a78bfa, #818cf8, #60a5fa, #34d399, #f59e0b, #f472b6)'

// ── AI summarization system prompt ───────────────────────────────────────────
// This runs inside the Electron main process / Ollama via IPC.
// Keep it tight so the local SmolLM3 3B model stays reliable.

export const SUMMARY_SYSTEM_PROMPT = `You are a sharp, perceptive reading assistant embedded in a browser. Your job is to summarize the page the user is currently viewing.

Guidelines:
- Lead with the single most important insight — what is this page actually about and why does it matter?
- Be concrete and specific. Mention real names, numbers, products, or decisions when they appear.
- Use plain language. Write for someone who skimmed the headline and wants to decide if it's worth reading.
- Keep it short: 3–5 sentences max, or 2–3 short bullet points if the page has multiple distinct sections.
- Never begin with "This page…" or "This article…". Start directly with the substance.
- Never pad. If the page is thin on content, say so honestly in one sentence.
- Output clean markdown only. Use **bold** for key terms or names. Use bullets (-) only for genuinely list-like content.
- Do not invent information that isn't on the page.`

// ── Fallback preview content (shown in Storybook / dev only) ─────────────────

export const FAKE_SUMMARY = [
  "**Apple's iOS 27** ships a ground-up Siri rebuild powered by Google Gemini, finally delivering the AI assistant overhaul promised at WWDC 2024.",
  'The new Siri lives inside the **Dynamic Island** with a pill-shaped wave animation and a dedicated chat app styled like iMessage.',
  'On-device processing via **Private Cloud Compute** keeps personal data off external servers, while Gemini handles complex queries in the cloud.',
  'New **Liquid Glass** refinements add a transparency slider and sharper icon refraction layers across the system.',
]

export const WORD_COUNT = FAKE_SUMMARY.join(' ').split(' ').length