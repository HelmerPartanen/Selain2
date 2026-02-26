import { app } from 'electron'
import { writeFileSync } from 'fs'
import { join } from 'path'
import { logger } from './logger'

interface MemoryStatsMb {
  rss: number
  heapUsed: number
  heapTotal: number
  external: number
  arrayBuffers: number
}

interface ProcessCounts {
  total: number
  renderer: number
  browser: number
  gpu: number
  utility: number
  other: number
}

export interface PerfSnapshot {
  timestamp: number
  uptimeSec: number
  processCounts: ProcessCounts
  memoryMb: MemoryStatsMb
}

interface PerfState {
  intervalId: NodeJS.Timeout | null
  sampleIntervalMs: number
  snapshots: PerfSnapshot[]
}

const MAX_SNAPSHOTS = 720
const DEFAULT_INTERVAL_MS = 10_000
const BENCHMARK_INTERVAL_MS = 5_000
const state: PerfState = {
  intervalId: null,
  sampleIntervalMs: DEFAULT_INTERVAL_MS,
  snapshots: []
}

function pushSnapshot(snapshot: PerfSnapshot): void {
  state.snapshots.push(snapshot)
  if (state.snapshots.length > MAX_SNAPSHOTS) {
    state.snapshots.splice(0, state.snapshots.length - MAX_SNAPSHOTS)
  }
}

function sampleProcessCounts(): ProcessCounts {
  const metrics = app.getAppMetrics()
  const counts: ProcessCounts = {
    total: metrics.length,
    renderer: 0,
    browser: 0,
    gpu: 0,
    utility: 0,
    other: 0
  }

  for (const metric of metrics) {
    switch (metric.type) {
      case 'Tab':
        counts.renderer += 1
        break
      case 'Browser':
        counts.browser += 1
        break
      case 'GPU':
        counts.gpu += 1
        break
      case 'Utility':
        counts.utility += 1
        break
      default:
        counts.other += 1
        break
    }
  }

  return counts
}

function toMb(value: number): number {
  return Math.round((value / (1024 * 1024)) * 100) / 100
}

export function collectPerfSnapshot(): PerfSnapshot {
  const memory = process.memoryUsage()
  const snapshot: PerfSnapshot = {
    timestamp: Date.now(),
    uptimeSec: Math.round(process.uptime()),
    processCounts: sampleProcessCounts(),
    memoryMb: {
      rss: toMb(memory.rss),
      heapUsed: toMb(memory.heapUsed),
      heapTotal: toMb(memory.heapTotal),
      external: toMb(memory.external),
      arrayBuffers: toMb(memory.arrayBuffers)
    }
  }

  pushSnapshot(snapshot)
  return snapshot
}

export function startPerfMonitor(intervalMs = DEFAULT_INTERVAL_MS): { started: boolean; intervalMs: number } {
  const clamped = Math.max(1000, Math.floor(intervalMs))
  state.sampleIntervalMs = clamped

  if (state.intervalId) {
    clearInterval(state.intervalId)
    state.intervalId = null
  }

  collectPerfSnapshot()
  state.intervalId = setInterval(() => {
    const snapshot = collectPerfSnapshot()
    if (process.env['BROWSER_PERF_LOG'] === '1') {
      logger.log('[perf][snapshot]', {
        ts: snapshot.timestamp,
        uptimeSec: snapshot.uptimeSec,
        renderer: snapshot.processCounts.renderer,
        total: snapshot.processCounts.total,
        rssMb: snapshot.memoryMb.rss,
        heapUsedMb: snapshot.memoryMb.heapUsed
      })
    }
  }, clamped)

  return { started: true, intervalMs: clamped }
}

export function stopPerfMonitor(): { stopped: boolean; samples: number } {
  if (state.intervalId) {
    clearInterval(state.intervalId)
    state.intervalId = null
  }
  return { stopped: true, samples: state.snapshots.length }
}

export function getPerfSnapshots(limit = 120): PerfSnapshot[] {
  const safeLimit = Math.max(1, Math.floor(limit))
  return state.snapshots.slice(-safeLimit)
}

export function getLatestPerfSnapshot(): PerfSnapshot {
  if (state.snapshots.length === 0) return collectPerfSnapshot()
  return state.snapshots[state.snapshots.length - 1]!
}

export function initBenchmarkPerfMonitor(): void {
  if (process.env['BROWSER_PERF_BENCH'] !== '1') return
  startPerfMonitor(BENCHMARK_INTERVAL_MS)
}

export function writeBenchmarkPerfReport(): string | null {
  if (process.env['BROWSER_PERF_BENCH'] !== '1') return null
  const latest = getLatestPerfSnapshot()
  const payload = {
    generatedAt: new Date().toISOString(),
    sampleIntervalMs: state.sampleIntervalMs,
    sampleCount: state.snapshots.length,
    latest,
    snapshots: state.snapshots
  }
  const reportPath = join(app.getPath('userData'), `perf-report-${Date.now()}.json`)
  writeFileSync(reportPath, JSON.stringify(payload, null, 2), 'utf-8')
  return reportPath
}
