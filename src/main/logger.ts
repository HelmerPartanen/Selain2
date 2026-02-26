// ─── Main process logger ───────────────────────────────────────────────────
// In development: forwards to console. In production: no-op for log/debug/warn;
// error is still forwarded for diagnostics.

const isDev = process.env.NODE_ENV !== 'production'

export const logger = {
  log: (...args: unknown[]) => {
    if (isDev) console.log(...args)
  },
  warn: (...args: unknown[]) => {
    if (isDev) console.warn(...args)
  },
  debug: (...args: unknown[]) => {
    if (isDev) console.debug(...args)
  },
  error: (...args: unknown[]) => {
    if (isDev) console.error(...args)
    else console.error(...args)
  }
}
