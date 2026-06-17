import { useTabStore } from '@/store/tabStore'
import { webviewRegistry } from '@/webview/webviewRegistry'
import { isSpecialPage } from '@/utils/urlUtils'

export type PageContentSource = 'webpage' | 'pdf'

export interface PageContentForSummary {
  text: string
  source: PageContentSource
}

/** Returns true when the URL likely points at a PDF document. */
export function isLikelyPdfUrl(url: string): boolean {
  try {
    const parsed = new URL(url)
    if (parsed.protocol === 'file:') {
      return parsed.pathname.toLowerCase().endsWith('.pdf')
    }
    if (parsed.protocol === 'http:' || parsed.protocol === 'https:') {
      const pathAndQuery = `${parsed.pathname}${parsed.search}`.toLowerCase()
      return /\.pdf(?:$|[?#])/i.test(pathAndQuery) || pathAndQuery.endsWith('.pdf')
    }
    return false
  } catch {
    return false
  }
}

function shouldTryPdfExtraction(url: string, webText: string, title: string): boolean {
  if (isLikelyPdfUrl(url)) return true
  const trimmed = webText.trim()
  if (trimmed.length >= 120) return false
  if (/\.pdf/i.test(url) || /\.pdf/i.test(title)) return true
  if (/^page\s+\d+/i.test(trimmed)) return true
  if (trimmed.length < 30) return true
  return false
}

const EXTRACT_WEBPAGE_TEXT_SCRIPT = `
(function() {
  function clean(value) {
    return String(value || '').replace(/\\s+/g, ' ').trim();
  }

  function isVisible(el) {
    if (el.hidden || el.getAttribute('aria-hidden') === 'true') return false;
    const style = el.getAttribute('style') || '';
    return !/display\\s*:\\s*none|visibility\\s*:\\s*hidden/i.test(style);
  }

  function pushUnique(parts, seen, label, value) {
    const text = clean(value);
    if (!text || text.length < 30) return;
    const key = text.toLowerCase();
    if (seen.has(key)) return;
    seen.add(key);
    parts.push(label ? label + ': ' + text : text);
  }

  function linkDensity(el) {
    const textLength = clean(el.innerText || el.textContent).length;
    if (!textLength) return 0;
    const linkText = Array.from(el.querySelectorAll('a'))
      .map((a) => clean(a.innerText || a.textContent))
      .join(' ');
    return linkText.length / textLength;
  }

  function isTeaserOrRelated(el) {
    const haystack = [
      el.id,
      el.className,
      el.getAttribute('role'),
      el.getAttribute('aria-label'),
      el.getAttribute('data-testid')
    ].join(' ').toLowerCase();

    return /related|recommend|recirc|latest|popular|more[-_ ]?from|read[-_ ]?more|most[-_ ]?read|trending|teaser|card|promo|nosto|luetuimmat|uusimmat|aiheeseen/.test(haystack);
  }

  const parts = [];
  const seen = new Set();
  const title = document.title && document.title.trim();
  if (title && title !== 'about:blank') pushUnique(parts, seen, 'Title', title);

  const metaDesc = document.querySelector('meta[name="description"]');
  const desc = metaDesc && metaDesc.getAttribute('content');
  if (desc && desc.trim()) pushUnique(parts, seen, 'Description', desc);

  const root = document.body ? document.body.cloneNode(true) : null;
  if (!root) return parts.join('\\n\\n');

  root.querySelectorAll([
    'script',
    'style',
    'noscript',
    'template',
    'svg',
    'canvas',
    'iframe',
    'nav',
    'footer',
    'aside',
    'form',
    'button',
    'input',
    'select',
    'textarea',
    '[role="navigation"]',
    '[role="banner"]',
    '[role="contentinfo"]',
    '[aria-hidden="true"]',
    '[hidden]',
    '.ad',
    '.ads',
    '.advertisement',
    '.cookie',
    '.newsletter',
    '.subscribe',
    '.share',
    '.social',
    '[class*="related"]',
    '[class*="recommend"]',
    '[class*="recirc"]',
    '[class*="latest"]',
    '[class*="popular"]',
    '[class*="teaser"]',
    '[class*="card"]',
    '[class*="promo"]',
    '[class*="nosto"]',
    '[class*="luetuimmat"]',
    '[class*="uusimmat"]',
    '[id*="related"]',
    '[id*="recommend"]',
    '[id*="recirc"]',
    '[id*="latest"]',
    '[id*="popular"]'
  ].join(',')).forEach((el) => el.remove());

  const container =
    root.querySelector('article') ||
    root.querySelector('main') ||
    root.querySelector('[role="main"]') ||
    root;

  const selectors = 'h1, h2, h3, p, li, blockquote';
  Array.from(container.querySelectorAll(selectors)).forEach((el) => {
    if (!isVisible(el)) return;
    if (el.closest('a')) return;
    let parent = el.parentElement;
    while (parent && parent !== container) {
      if (isTeaserOrRelated(parent) || linkDensity(parent) > 0.55) return;
      parent = parent.parentElement;
    }
    const tag = el.tagName.toLowerCase();
    const text = clean(el.innerText || el.textContent);
    if ((tag === 'li' || tag === 'h2' || tag === 'h3') && linkDensity(el) > 0.35) return;
    if (tag === 'h1') pushUnique(parts, seen, 'Heading', text);
    else if (tag === 'h2' || tag === 'h3') pushUnique(parts, seen, 'Section', text);
    else pushUnique(parts, seen, '', text);
  });

  if (parts.length < 3) {
    pushUnique(parts, seen, '', container.innerText || container.textContent);
  }

  return parts.join('\\n\\n');
})()
`

const WEB_SUMMARY_CHAR_BUDGET = 4200

function compactWhitespace(text: string): string {
  return text.replace(/[ \t\r\f\v]+/g, ' ').replace(/\n{3,}/g, '\n\n').trim()
}

function fitSummaryBudget(text: string, budget = WEB_SUMMARY_CHAR_BUDGET): string {
  const compact = compactWhitespace(text)
  if (compact.length <= budget) return compact

  const headSize = Math.floor(budget * 0.78)
  const tailSize = budget - headSize - 7
  return `${compact.slice(0, headSize).trim()}\n\n[...]\n\n${compact.slice(-tailSize).trim()}`
}

async function tryExtractPdfText(url: string): Promise<string | null> {
  try {
    const text = await window.electronAPI.extractPdfText(url)
    return text.trim() ? text : null
  } catch {
    return null
  }
}

/**
 * Extract readable text from the active tab for AI summarization.
 * Uses PDF parsing for documents and DOM text for normal web pages.
 *
 * For web pages, a lightweight DOM extraction pass removes obvious chrome
 * (nav, footer, sidebars, forms, scripts, ads) and keeps title, metadata,
 * headings, paragraphs, list items, and quotes.
 */
export async function extractPageContentForSummary(tabId: string): Promise<PageContentForSummary> {
  const tab = useTabStore.getState().tabs[tabId]
  const url = tab?.url ?? ''
  const title = tab?.title ?? ''

  if (!url || url === 'about:blank' || isSpecialPage(url)) {
    return { text: '', source: 'webpage' }
  }

  if (isLikelyPdfUrl(url)) {
    const pdfText = await tryExtractPdfText(url)
    if (pdfText) return { text: pdfText, source: 'pdf' }
  }

  const webview = webviewRegistry.get(tabId)
  let webText = ''

  if (webview) {
    try {
      const result = await webview.executeJavaScript(EXTRACT_WEBPAGE_TEXT_SCRIPT)
      if (typeof result === 'string') webText = result
    } catch {
      // DOM extraction failed — may still recover via PDF path below
    }
  }

  if (webText.trim() && !shouldTryPdfExtraction(url, webText, title)) {
    return { text: fitSummaryBudget(webText), source: 'webpage' }
  }

  const pdfText = await tryExtractPdfText(url)
  if (pdfText) return { text: pdfText, source: 'pdf' }

  if (webText.trim()) {
    return { text: fitSummaryBudget(webText), source: 'webpage' }
  }

  return { text: '', source: 'webpage' }
}
