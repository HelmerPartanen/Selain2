import { webviewRegistry } from '@/webview/webviewRegistry'

const STYLE_ID = 'browser-ai-pdf-summary-glow'
const ROOT_CLASS = 'browser-ai-pdf-summarizing'

function buildGlowCss(animated: boolean): string {
  const animationRule = animated
    ? 'animation: browser-ai-pdf-rainbow-glow 3.5s ease-in-out infinite !important;'
    : ''

  const pageGlow = `
    border-radius: 3px !important;
    background: #ffffff !important;
    ${animationRule}
    box-shadow:
      0 10px 36px rgba(15, 23, 42, 0.24),
      0 0 0 2px rgba(255, 224, 102, 0.65),
      0 0 28px rgba(255, 143, 177, 0.45),
      0 0 52px rgba(111, 168, 255, 0.35) !important;
  `

  return `
    @keyframes browser-ai-pdf-rainbow-glow {
      0%, 100% {
        box-shadow:
          0 10px 36px rgba(15, 23, 42, 0.24),
          0 0 0 2px rgba(255, 224, 102, 0.72),
          0 0 24px rgba(255, 143, 177, 0.58),
          0 0 48px rgba(111, 168, 255, 0.42),
          0 0 72px rgba(199, 125, 255, 0.3);
      }
      33% {
        box-shadow:
          0 10px 36px rgba(15, 23, 42, 0.24),
          0 0 0 2px rgba(255, 111, 216, 0.72),
          0 0 24px rgba(199, 125, 255, 0.58),
          0 0 48px rgba(111, 227, 201, 0.42),
          0 0 72px rgba(255, 224, 102, 0.3);
      }
      66% {
        box-shadow:
          0 10px 36px rgba(15, 23, 42, 0.24),
          0 0 0 2px rgba(111, 168, 255, 0.72),
          0 0 24px rgba(111, 227, 201, 0.58),
          0 0 48px rgba(255, 224, 102, 0.42),
          0 0 72px rgba(255, 143, 177, 0.3);
      }
    }

    html.${ROOT_CLASS},
    html.${ROOT_CLASS} body {
      transition: background-color 0.4s ease !important;
    }

    html.${ROOT_CLASS} body {
      background: #52565e !important;
    }

    html.${ROOT_CLASS} #viewerContainer,
    html.${ROOT_CLASS} #mainContainer,
    html.${ROOT_CLASS} #viewer,
    html.${ROOT_CLASS} .pdfViewer {
      background: #52565e !important;
    }

    html.${ROOT_CLASS} #viewer .page,
    html.${ROOT_CLASS} .pdfViewer .page,
    html.${ROOT_CLASS} div.page[data-page-number],
    html.${ROOT_CLASS} .page {
      margin-bottom: 18px !important;
      ${pageGlow}
    }

    html.${ROOT_CLASS} embed[type="application/pdf"],
    html.${ROOT_CLASS} object[type="application/pdf"] {
      border-radius: 6px !important;
      ${animationRule}
      box-shadow:
        0 16px 48px rgba(15, 23, 42, 0.28),
        0 0 0 2px rgba(255, 224, 102, 0.65),
        0 0 32px rgba(255, 143, 177, 0.5),
        0 0 64px rgba(111, 168, 255, 0.38) !important;
    }
  `
}

function buildInjectScript(css: string): string {
  return `(function() {
    var ROOT = ${JSON.stringify(ROOT_CLASS)};
    var STYLE_ID = ${JSON.stringify(STYLE_ID)};
    var css = ${JSON.stringify(css)};

    function apply() {
      document.documentElement.classList.add(ROOT);
      var style = document.getElementById(STYLE_ID);
      if (!style) {
        style = document.createElement('style');
        style.id = STYLE_ID;
        document.documentElement.appendChild(style);
      }
      style.textContent = css;
    }

    apply();

    if (!window.__browserAiPdfGlowObserver) {
      window.__browserAiPdfGlowObserver = new MutationObserver(function() {
        if (document.documentElement.classList.contains(ROOT)) apply();
      });
      window.__browserAiPdfGlowObserver.observe(document.documentElement, {
        childList: true,
        subtree: true,
      });
    }
  })()`
}

const REMOVE_SCRIPT = `(function() {
  var ROOT = ${JSON.stringify(ROOT_CLASS)};
  var STYLE_ID = ${JSON.stringify(STYLE_ID)};
  if (window.__browserAiPdfGlowObserver) {
    window.__browserAiPdfGlowObserver.disconnect();
    window.__browserAiPdfGlowObserver = null;
  }
  document.documentElement.classList.remove(ROOT);
  document.getElementById(STYLE_ID)?.remove();
})()`

/** Inject rainbow glow + drop shadow onto PDF pages inside the tab webview. */
export async function applyPdfSummaryGlow(tabId: string, animated = true): Promise<void> {
  const webview = webviewRegistry.get(tabId)
  if (!webview) return
  try {
    await webview.executeJavaScript(buildInjectScript(buildGlowCss(animated)))
  } catch {
    // PDF viewer DOM may not be ready yet — non-fatal
  }
}

/** Remove injected PDF summary styling from the tab webview. */
export async function removePdfSummaryGlow(tabId: string): Promise<void> {
  const webview = webviewRegistry.get(tabId)
  if (!webview) return
  try {
    await webview.executeJavaScript(REMOVE_SCRIPT)
  } catch {
    // webview may be destroyed or navigating
  }
}
