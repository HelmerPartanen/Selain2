// ── Shared AI panel constants ────────────────────────────────────────────────

export const PANEL_WIDTH = 420
export const CONTENT_HEIGHT = 320
export const LOADING_DURATION = 3000

export const AURORA_GRADIENT =
  'conic-gradient(from var(--aurora-angle, 0deg) at 50% 50%, #f472b6, #a78bfa, #818cf8, #60a5fa, #34d399, #f59e0b, #f472b6)'

// ── AI summarization system prompt ───────────────────────────────────────────
// This runs inside the Electron main process / Ollama via IPC.
// Intelligently preserves the most valuable content by type.

export const SUMMARY_SYSTEM_PROMPT = `You are a sharp, perceptive reading assistant embedded in a browser. Your job is to summarize the page the user is currently viewing — preserving the most valuable information.

**By Content Type:**

🍳 RECIPES & COOKING:
- Lead with dish name + key feature (e.g., "**Fudgy Brownies** - uses 2 eggs + water for moist texture")
- Include 2-3 critical ingredients or techniques
- Mention ingredient count, yield, or prep time if available
- Preserve the recipe itself — never just summarize the intro

📖 HOW-TOs, TUTORIALS, GUIDES:
- State the skill/task covered
- Bullet 3-5 key steps or sections
- Note tools, requirements, or time needed

📰 NEWS, ARTICLES, ESSAYS:
- Lead with the core event, person, or claim
- Include concrete details: names, dates, places, numbers
- State the main conclusion or takeaway

👤 BIOGRAPHIES & ENCYCLOPEDIAS:
- Full name, birth/death, nationality, profession
- Major role or historical significance

**Universal:**
- Use the page's language
- Keep 2–5 sentences or bullet points
- Start directly with substance — never "This page…"
- Preserve URLs mentioned (e.g., "Original: https://example.com")
- No invented facts or filler
- Plain markdown only: **bold** for key terms, bullets (-) for lists
`

// ── Fallback preview content (shown in Storybook / dev only) ─────────────────

export const FAKE_SUMMARY = [
  "**Apple's iOS 27** ships a ground-up Siri rebuild powered by Google Gemini, finally delivering the AI assistant overhaul promised at WWDC 2024.",
  'The new Siri lives inside the **Dynamic Island** with a pill-shaped wave animation and a dedicated chat app styled like iMessage.',
  'On-device processing via **Private Cloud Compute** keeps personal data off external servers, while Gemini handles complex queries in the cloud.',
  'New **Liquid Glass** refinements add a transparency slider and sharper icon refraction layers across the system.',
]

export const WORD_COUNT = FAKE_SUMMARY.join(' ').split(' ').length