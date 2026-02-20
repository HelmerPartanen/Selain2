// ── Shared AI panel constants ────────────────────────────────────────────────

export const PANEL_WIDTH = 420
export const CONTENT_HEIGHT = 320
export const LOADING_DURATION = 3000

export const AURORA_GRADIENT =
  'conic-gradient(from var(--aurora-angle, 0deg) at 50% 50%, #6366f1, #8b5cf6, #a855f7, #ec4899, #f59e0b, #10b981, #3b82f6, #6366f1)'

export const FAKE_SUMMARY = [
  "This page presents a comprehensive overview of the website's core architecture, covering both structural layout and interactive functionality.",
  'The navigation system uses a hierarchical structure with primary categories, subcategories, and contextual filtering. Key interactive elements include dropdown menus, search overlays, and tab-based content organization.',
  'Content is organized across multiple sections with responsive breakpoints, adapting from a multi-column grid on desktop to a single-column stack on mobile devices.',
  'Notable features include lazy-loaded media assets, client-side form validation, real-time search suggestions, and animated page transitions between sections.',
  'The overall design language follows a minimal, glass-morphic aesthetic with layered depth cues, subtle shadows, and consistent spacing tokens throughout.',
]

export const WORD_COUNT = FAKE_SUMMARY.join(' ').split(' ').length
