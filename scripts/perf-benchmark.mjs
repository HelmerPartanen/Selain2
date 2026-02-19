import { spawn } from 'node:child_process'

const DEFAULT_DURATION_SEC = 120
const args = process.argv.slice(2)

function parseDuration() {
  const arg = args.find((a) => a.startsWith('--duration='))
  if (!arg) return DEFAULT_DURATION_SEC
  const raw = Number(arg.split('=')[1])
  if (!Number.isFinite(raw) || raw < 20) return DEFAULT_DURATION_SEC
  return Math.floor(raw)
}

const durationSec = parseDuration()
const withExtensions = args.includes('--with-extensions')
const isWindows = process.platform === 'win32'
const runCommand = isWindows ? 'cmd.exe' : 'npm'
const runArgs = isWindows ? ['/d', '/s', '/c', 'npm run dev'] : ['run', 'dev']

const childEnv = Object.fromEntries(
  Object.entries(process.env).filter(([, value]) => typeof value === 'string')
)
childEnv.BROWSER_PERF_BENCH = '1'
childEnv.BROWSER_PERF_LOG = childEnv.BROWSER_PERF_LOG ?? '0'
childEnv.BROWSER_SKIP_EXTENSIONS = withExtensions ? '0' : '1'

console.log(`[perf-benchmark] Starting browser benchmark for ${durationSec}s`)
console.log(`[perf-benchmark] Extensions: ${withExtensions ? 'enabled' : 'disabled'}`)
console.log('[perf-benchmark] Perform your workload in the opened browser window now...')

const child = spawn(runCommand, runArgs, {
  stdio: 'inherit',
  env: childEnv
})

const timeout = setTimeout(() => {
  console.log('[perf-benchmark] Duration elapsed, stopping app...')
  child.kill('SIGINT')
  setTimeout(() => {
    if (!child.killed) child.kill('SIGTERM')
  }, 5000)
}, durationSec * 1000)

child.on('exit', (code, signal) => {
  clearTimeout(timeout)
  if (signal) {
    console.log(`[perf-benchmark] Finished with signal: ${signal}`)
  } else {
    console.log(`[perf-benchmark] Finished with exit code: ${code ?? 0}`)
  }
  console.log('[perf-benchmark] Perf report written to app userData as perf-report-<timestamp>.json')
})
