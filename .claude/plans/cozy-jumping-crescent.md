# Browser Performance & Polish Plan

## Context

A high-performance Chromium-based browser shell built on Electron 42 (Vite + React 19 + Zustand + Motion). All features (tabs, reader, AI, downloads, bookmarks, history, spaces, split view, adblock, wallpaper picker, classic/floating chrome) are kept. The current build works but the cold-start path is heavyweight: dynamic wallpapers (≈ 2.8 MB) are eagerly bundled, `themeStore` makes an IPC roundtrip *before React mounts*, `BrowserLayout` is a 884-line god-component with ~15 hooks, the motion vendor chunk is 291 KB, thumbnails are persisted in `tab-session.json` (≈ 1 MB per save) and captured on every active-tab switch.

**Goals (no scope cuts):**
1. Faster cold start and first paint.
2. Lower idle RAM and CPU.
3. Lower per-action cost (tab switch, settings open, store save).
4. Drop dead CSS, dead code paths, eager imports.

User decisions confirmed:
- **Drop persisted thumbnails** (regenerate on demand).
- **LazyMotion everywhere** (motion vendor 291 KB → ~30 KB initial).
- **Keep onboarding lazy**.

---

## A. Bundle & startup (biggest wins)

### A1. Lazy-load dynamic wallpapers — `src/renderer/theme/dynamicWallpapers.ts`
- Drop `{ eager: true }` from `import.meta.glob`.
- Replace the synchronous `DYNAMIC_WALLPAPERS` list with `loadDynamicWallpapers(): Promise<DynamicWallpaperSet[]>` built from the lazy glob (call once, cache).
- Export a plain `DYNAMIC_DEFAULT_KEY = 'dynamic:default'` (string constant — no asset reference).
- All current consumers (`BrowserLayout.tsx:259, 348, 378`) already call `getDynamicWallpaperLayers(...)` and `getDynamicWallpaperVariantUrls(...)`. Convert them to await the loaded set.
- **Effect**: ~2.8 MB of PNGs no longer pulled at startup. Dynamic wallpaper layer now resolves in background.

### A2. Lazy-load preset wallpapers — `src/renderer/theme/presets.ts`
- Audit the file (already async via `resolvePresetUrl`). Ensure no eager data URIs at module top.

### A3. Lazy-load `NewTabPage` and `UIKitPage` — `src/renderer/webview/WebViewManager.tsx:5-6`
- Replace `import { NewTabPage } from '@/newtab/NewTabPage'` with `const NewTabPage = lazy(() => import('@/newtab/NewTabPage').then(m => ({ default: m.NewTabPage })))`.
- Same for `UIKitPage`.
- Wrap `<SpecialPage>` render in `<Suspense fallback={null}>`.
- **Effect**: 14 KB chunk loaded only when the user opens a `browser://newtab` or `browser://uikit` page.

### A4. Lazy-load every settings pane — `src/renderer/settings/SettingsPanel.tsx:23-31`
- Each pane is statically imported. Convert to `React.lazy()` per pane with a tiny skeleton fallback inside `SettingsContent`.
- Keep `useState<SettingsCategory>("general")` so the default pane loads first; subsequent panes prefetch on hover via `import(...)` in `onMouseEnter` of the sidebar item.
- **Effect**: ~120 KB drop from the first opening of Settings. Subsequent panes stream in as the user clicks them.

### A5. Wrap motion in `LazyMotion` — multi-file
- Add `<LazyMotion features={domAnimation}>` in `src/renderer/App.tsx` (root). Remove the existing `<MotionConfig>`.
- Convert every leaf `motion.X` import to `m.X` from `motion/react` (same package). Use `m.div`, `m.button`, etc. where the component lives inside a `LazyMotion` ancestor.
- Components that need full `motion.*` (drag handlers like `SplitDivider`) get their own `<LazyMotion features={domMax}>` ancestor.
- Scope the conversion: `FloatingControls`, `AppMenu`, `SpaceSwitcher`, `TabPill`, `DownloadPill`, `TabOverview`, `SettingsPanel`, `BookmarksPage`, `HistoryPage`, `DownloadsPage`, `OnboardingFlow`, `AIFullscreenPage`, `ReaderModePage`, `URLBar`, `Toast`, `PanelModal`, `SiteInfoPopover`, `FindBar`.
- **Effect**: vendor-motion chunk 291 KB → ~30 KB initial. Subsequent motion features stream in.

### A6. Drop dead CSS utility classes — `src/renderer/assets/main.css:103-138`
- Remove `.glass`, `.glass-heavy`, `.glass-subtle`, `.glass-blur`. None are referenced anywhere except in this file. Tailwind v4 still scans, but the CSS bytes ship.

### A7. Audit icon imports
- 891 SVG files in `src/renderer/assets/icons/`. All imported with `?raw` (inline string). Each import is a separate module, but the build already handles this. No action.

---

## B. Main process

### B1. Defer perf-monitor setup — `src/main/index.ts:30` and `src/main/perfMonitor.ts`
- `initBenchmarkPerfMonitor()` is currently awaited in the `whenReady().then` chain. Move the call into `setImmediate` so the window is created first.
- The 4 `ipcMain.handle('perf-*', ...)` handlers in `ipc.ts:589-605` should only be registered when `BROWSER_PERF_BENCH=1`. Move them into a `setupPerfIpc()` that's called from `initBenchmarkPerfMonitor`.

### B2. Move `setupCSP()` after `createWindow()` — `src/main/index.ts:29-32`
- The CSP only applies to the local renderer (`file://` URL). Window creation doesn't trigger any `file://` navigation immediately, but ordering it last is correct and removes any chance of CSP delaying first paint.
- Actually `setupCSP` itself is cheap (just two `webRequest.onHeadersReceived` registrations). It's the *ordering* I want to fix: it should run after `createWindow()` so the CSP can't block the first `did-finish-load` event of the renderer.

### B3. No change to adblocker (already `setImmediate`). No change to permissions. No change to the IPC handler registration.

---

## C. Renderer — `BrowserLayout` decomposition

### C1. Split `BrowserLayout.tsx` (884 lines) into:
- `AppShell.tsx` — root `<div>` + wallpaper layer + click-away overlay + chrome + Toasts.
- `hooks/useAppSideEffects.ts` — keyboard, downloads, AI, permissions, trackpad, URL-bar focus, settings hydration gate, open-url-in-new-tab.
- `hooks/useClearOnExit.ts` — `beforeunload` cleanup of history/bookmarks/downloads.
- `hooks/useWallpaperBackground.ts` — wallpaper resolution (bundled/preset/data-URL → blob URL).
- `hooks/useModalPreload.ts` — `setTimeout(10000)` then prefetch all heavy modal chunks.
- `hooks/useReadingTools.ts` — `setTimeout(2500)` then reveal AI summary button.
- `hooks/useDownloadToasts.ts` — subscribe to `useDownloadStore` and emit toasts.
- `hooks/useOpenUrlInterceptor.ts` — `onOpenUrlInNewTab` listener.

The net effect: `BrowserLayout.tsx` becomes a thin orchestrator that calls hooks and renders JSX. Each hook has tight, focused deps and the same `useEffect` doesn't re-run because of unrelated store updates.

### C2. Stop `themeStore.hydrateWallpaper()` at module load — `src/renderer/store/themeStore.ts:79`
- Remove the bottom-of-file `useThemeStore.getState().hydrateWallpaper()` call.
- Add a tiny `useThemeHydration` hook in `App.tsx` that runs in a `useEffect` once.
- **Effect**: no IPC roundtrip before React mounts. Cold start = just Vite + React.

### C3. Memoize click-away overlay booleans
- Already uses `useShallow`. Keep.

### C4. Throttle `useLRUTabManager` thumbnail clear — `src/renderer/webview/useLRUTabManager.ts:55-62`
- Replace the `for...of` loop with a single `useTabStore.setState` that updates all cleared tabs in one mutation.
- **Effect**: 1 store mutation per active-tab switch instead of N.

### C5. Skip `captureTab` IPC on every active-tab switch — `src/renderer/webview/WebViewInstance.tsx:316-329`
- Add a ref tracking the last active duration. Only capture when:
  - The tab was active for > 1500ms (skip rapid switching), AND
  - The capture is debounced (coalesce to once per 500ms globally).
- Since thumbnails are no longer persisted (see E1), the cost of regenerating them when the user opens Tab Overview is acceptable.

---

## D. State & persistence

### D1. Drop persisted thumbnails — `src/renderer/store/tabStore.ts:531-559`
- Remove `thumbnail` from `PersistedTabState` and from the `partialize` block.
- Keep the `thumbnail` field in the runtime `Tab` interface (so the tab overview still works during a session).
- **Effect**: `tab-session.json` save shrinks from ~1 MB to <100 KB. Saves are 10× faster.

### D2. `partialize` for `tabStore` is fine — already minimal.

### D3. Confirm `ipcStorage` debounce — already 150ms. Good.

---

## E. Webview performance

### E1. Already filtered by `WebViewManager` (suspended tabs are not mounted). Good.

### E2. Dynamic wallpaper preload — `src/renderer/components/layout/BrowserLayout.tsx:382-388`
- Use `img.decode()` for proper async decode. Cheap win.

### E3. The console-message listener is fine.

---

## F. Memory

### F1. `blobUrlsRef` revocation — `src/renderer/components/layout/BrowserLayout.tsx:424-456`
- Already correct. Keep.

### F2. Adblocker allowlist merge — `src/main/index.ts:87-95`
- Runs once at startup, no change.

---

## G. Critical files (representative — for execution reference)

- `src/renderer/components/layout/BrowserLayout.tsx` — biggest single change (decompose into hooks + shell).
- `src/renderer/App.tsx` — `LazyMotion` wrapper, `useThemeHydration` call.
- `src/renderer/theme/dynamicWallpapers.ts` — eager → lazy.
- `src/renderer/theme/presets.ts` — eager → lazy.
- `src/renderer/store/themeStore.ts` — remove `hydrateWallpaper()` at module load.
- `src/renderer/store/tabStore.ts` — drop `thumbnail` from `partialize`.
- `src/renderer/webview/WebViewManager.tsx` — lazy `NewTabPage`/`UIKitPage`.
- `src/renderer/webview/WebViewInstance.tsx` — debounce `captureTab`.
- `src/renderer/webview/useLRUTabManager.ts` — batch thumbnail clear.
- `src/renderer/settings/SettingsPanel.tsx` — lazy each pane.
- `src/renderer/components/layout/FloatingControls.tsx` + `AppMenu.tsx` + `SpaceSwitcher.tsx` + `TabPill.tsx` + `DownloadPill.tsx` + `URLBar.tsx` + `Toast.tsx` + `PanelModal.tsx` + `SiteInfoPopover.tsx` + `FindBar.tsx` — convert `motion.*` → `m.*` inside `LazyMotion`.
- `src/renderer/assets/main.css` — drop dead glass utility classes.
- `src/main/index.ts` — defer perf init; move `setupCSP()` after `createWindow()`.
- `src/main/perfMonitor.ts` — split `setupPerfIpc()` so handlers only register under `BROWSER_PERF_BENCH=1`.
- `src/main/ipc.ts` — move perf handlers into `setupPerfIpc()`.

---

## H. Reused utilities (already in the codebase)

- `LazyMotion`, `domAnimation`, `domMax` from `motion/react` — standard API, no new dep.
- `useShallow` from `zustand/react/shallow` — already used.
- `React.lazy()` + `<Suspense>` — already used for several panels.
- `ErrorBoundary` — already used.
- `import.meta.glob` lazy variant — already used in `bundledWallpapers.ts`.

---

## I. Verification

1. **Cold-start benchmark**
   - `npm run build`.
   - `BROWSER_PERF_BENCH=1 BROWSER_PERF_LOG=1 npm start`.
   - Time from process start to `ready-to-show` (measured in `window.ts:54-56`).
   - Perf report at `userData/perf-report-*.json` (process counts, RSS, snapshots every 5s).
   - **Target**: < 800ms cold start on a developer machine.

2. **Bundle size**
   - `du -sh out/renderer/assets/*.{js,css}` before/after.
   - **Target**: `index-*.js` < 700 KB; `vendor-motion-*.js` < 100 KB; total assets < 25 MB.

3. **Steady-state memory**
   - Open 5 tabs, idle 30s, snapshot RSS. **Target**: < 600 MB.
   - With 20 tabs (most suspended). **Target**: < 1 GB.

4. **Functional checks**
   - Dynamic wallpaper: pick `dynamic:base-blue`, switch dark/light, confirm 3 layers blend.
   - Settings: open each of 9 panes, confirm render.
   - Tab overview: open with 5+ tabs, confirm thumbnails render (regenerate on demand, may be empty briefly).
   - Restore session: close browser, reopen, confirm previous session loads.

5. **Re-render sanity**
   - Add `console.log('BrowserLayout')` at the top of `BrowserLayoutInner` and click around (open settings, switch tabs, type in URL bar). Should re-render only on actual UI state changes, not on every IPC event.

---

## J. Risk & rollback

- **LazyMotion**: if any `m.div` lives outside a `LazyMotion` ancestor, it throws at render. The fallback is to keep `MotionConfig` at root and convert component-by-component. Easy to catch in dev.
- **Lazy dynamic wallpapers**: a user with a saved `dynamic:base-blue` wallpaper will see "no wallpaper" briefly until the chunk loads. Acceptable; the layer was already async.
- **Drop thumbnails**: tab overview / tab strip show fallback placeholders until the user views the tab. Acceptable trade for memory and save cost.
- **Lazy settings panes**: ~50-100ms chunk load on first pane open. Acceptable since Settings is rarely opened.

---

## K. Out of scope

- Switching from Motion to CSS animations (would require rewriting 30+ components).
- Replacing the `webview` tag with a custom renderer (Electron architecture).
- Replacing Zustand with a smaller store.
- Building a webview-tag pool (LRU already handles suspension).