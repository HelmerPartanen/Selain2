// ── OllamaSetupContent ────────────────────────────────────────────────────────
// Renders the appropriate setup UI for each AI readiness state.
// Lives inside the AI Summary panel (same fixed CONTENT_HEIGHT container).

import { useCallback } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { useAIStore, type AIStatus } from '@/store/aiStore'
import ollamaIcon from '@/assets/ollama/ollama-icon.svg'
import { CONTENT_HEIGHT } from './constants'
import boxSvg from '@/assets/icons/Interface/Warn_Info.svg?raw'
import { SvgIcon } from '../ui/SvgIcon'

// ── Helpers ───────────────────────────────────────────────────────────────────

function getOS(): 'windows' | 'mac' | 'linux' {
  const ua = navigator.userAgent
  if (ua.includes('Windows')) return 'windows'
  if (ua.includes('Mac')) return 'mac'
  return 'linux'
}

const OLLAMA_INSTALL: Record<'windows' | 'mac' | 'linux', { label: string; url: string; command?: string }> = {
  windows: {
    label: 'Download for Windows',
    url: 'https://ollama.com/download/windows',
    command: 'winget install Ollama.Ollama',
  },
  mac: {
    label: 'Download for macOS',
    url: 'https://ollama.com/download/mac',
    command: 'brew install ollama',
  },
  linux: {
    label: 'Install on Linux',
    url: 'https://ollama.com/download/linux',
    command: 'curl -fsSL https://ollama.com/install.sh | sh',
  },
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B'
  const gb = bytes / 1024 / 1024 / 1024
  if (gb >= 1) return `${gb.toFixed(1)} GB`
  const mb = bytes / 1024 / 1024
  return `${Math.round(mb)} MB`
}

// ── Shared primitives ─────────────────────────────────────────────────────────

function SetupShell({ children }: { children: React.ReactNode }): React.JSX.Element {
  return (
    <div
      className="flex flex-col items-center justify-center gap-5 text-center px-2"
      style={{ height: CONTENT_HEIGHT }}
    >
      {children}
    </div>
  )
}

async function openExternalUrl(url: string): Promise<void> {
  if (typeof window.electronAPI?.openExternal === 'function') {
    await window.electronAPI.openExternal(url)
    return
  }

  window.open(url, '_blank', 'noopener,noreferrer')
}

function PrimaryButton({
  onClick,
  children,
  disabled,
  variant = 'default',
}: {
  onClick: () => void
  children: React.ReactNode
  disabled?: boolean
  variant?: 'default' | 'danger'
}): React.JSX.Element {
  return (
    <motion.button
      onClick={onClick}
      disabled={disabled}
      whileTap={{ scale: 0.96 }}
      transition={{ duration: 0.1 }}
      className="px-4 py-2 rounded-lg text-[12px] font-medium transition-colors duration-100 hover:opacity-80 disabled:opacity-40 disabled:cursor-not-allowed"
      style={
        variant === 'danger'
          ? { background: 'rgba(239,68,68,0.1)', color: '#f87171', border: '1px solid rgba(239,68,68,0.2)' }
          : { background: 'rgb(255, 255, 255)', color: '#000000' }
      }
    >
      {children}
    </motion.button>
  )
}

function GhostButton({ onClick, children }: { onClick: () => void; children: React.ReactNode }): React.JSX.Element {
  return (
    <button
      onClick={onClick}
      className="px-3 py-1.5 rounded-full text-[11px] text-gray-400 dark:text-neutral-500 hover:text-gray-600 dark:hover:text-neutral-300 hover:bg-black/[0.04] dark:hover:bg-white/[0.05] transition-colors duration-100"
    >
      {children}
    </button>
  )
}

// ── State screens ─────────────────────────────────────────────────────────────

function CheckingScreen(): React.JSX.Element {
  return (
    <SetupShell>
      <motion.div
        className="w-8 h-8 rounded-full border-2 border-blue-400/30 border-t-blue-400"
        animate={{ rotate: 360 }}
        transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
      />
      <p className="text-[12px] text-gray-400 dark:text-neutral-500 font-light">
        Checking AI status…
      </p>
    </SetupShell>
  )
}

function MissingOllamaScreen({ onRetry }: { onRetry: () => void }): React.JSX.Element {
  const os = getOS()
  const info = OLLAMA_INSTALL[os]

  return (
    <SetupShell>
      {/* Icon */}
      <div
        className="w-12 h-12 rounded-xl flex items-center justify-center bg-white"
      >
        <img src={ollamaIcon} alt="Ollama" className="w-8 h-8" />
      </div>

      <div className="space-y-1.5">
        <p className="text-[13px] font-medium text-gray-800 dark:text-neutral-200">
          Ollama required
        </p>
        <p className="text-[12px] text-gray-400 dark:text-neutral-500 font-light leading-relaxed max-w-[300px]">
          AI summaries need Ollama installed locally. It runs models privately on your device — no data leaves your machine.
        </p>
      </div>

      <div className="flex flex-col items-center gap-2 w-full">
        <PrimaryButton onClick={() => void openExternalUrl(info.url)}>
          {info.label} ↗
        </PrimaryButton>

        {info.command && (
          <div
            className="mt-2 flex items-center gap-2 px-3 py-2 bg-black/[0.04] dark:bg-white/[0.05] rounded-lg w-full max-w-[290px]"
          >
            <span className="text-[10px] text-gray-400 dark:text-neutral-500 font-mono select-all flex-1 text-left truncate">
              {info.command}
            </span>
          </div>
        )}

        <GhostButton onClick={onRetry}>Already installed — check again</GhostButton>
      </div>
    </SetupShell>
  )
}

function ServiceDownScreen({ onRetry }: { onRetry: () => void }): React.JSX.Element {
  return (
    <SetupShell>
      <div
        className="w-10 h-10 rounded-2xl flex items-center justify-center text-lg"
        style={{ background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.2)' }}
      >
        ⚡
      </div>

      <div className="space-y-1.5">
        <p className="text-[13px] font-medium text-gray-800 dark:text-neutral-200">
          Ollama isn't running
        </p>
        <p className="text-[12px] text-gray-400 dark:text-neutral-500 font-light leading-relaxed max-w-[300px]">
          Ollama is installed but the service isn't running. Start it to enable AI features.
        </p>
      </div>

      <div className="flex flex-col items-center gap-2">
        <div
          className="flex items-center gap-2 px-3 py-2 rounded-xl"
          style={{ background: 'var(--glass-bg)', border: '1px solid var(--border-subtle)' }}
        >
          <span className="text-[11px] text-gray-400 dark:text-neutral-400 font-mono select-all">
            ollama serve
          </span>
        </div>
        <PrimaryButton onClick={onRetry}>Check again</PrimaryButton>
      </div>
    </SetupShell>
  )
}

function MissingModelScreen({ onDownload }: { onDownload: () => void }): React.JSX.Element {
  return (
    <SetupShell>
      <div
        className="w-10 h-10 rounded-lg bg-white flex items-center justify-center text-lg"
      >
        <SvgIcon svg={boxSvg} size={24} className="text-black"/>
      </div>

      <div className="space-y-1.5">
        <p className="text-[13px] font-medium text-gray-800 dark:text-neutral-200">
          AI model not downloaded
        </p>
        <p className="text-[12px] text-gray-400 dark:text-neutral-500 font-light leading-relaxed max-w-[300px]">
          The <span className="font-mono text-blue-400">Qwen-2.5-3b</span> model needs to be downloaded once. It runs fully offline after that.
        </p>
      </div>

      <div className="flex flex-col items-center gap-2">
        <PrimaryButton onClick={onDownload}>
          Download Qwen-2.5-3b
        </PrimaryButton>
        <p className="text-[10px] text-gray-400 dark:text-neutral-600 font-light">
          Stored locally · No account required · Runs on-device
        </p>
      </div>
    </SetupShell>
  )
}

function DownloadingScreen(): React.JSX.Element {
  const { pullProgress, cancelDownload } = useAIStore()
  const progress = pullProgress?.progress ?? 0
  const total = pullProgress?.total ?? 0
  const completed = pullProgress?.completed ?? 0
  const statusText = pullProgress?.status ?? 'Connecting…'

  // Human-readable status
  const displayStatus = statusText.startsWith('pulling')
    ? `Downloading${total > 0 ? ` ${formatBytes(completed)} / ${formatBytes(total)}` : '…'}`
    : statusText.charAt(0).toUpperCase() + statusText.slice(1)

  return (
    <SetupShell>
      <div className="space-y-1 w-full max-w-[320px]">
        <div className="flex items-center justify-between mb-3">
          <p className="text-[13px] font-medium text-gray-800 dark:text-neutral-200">
            Downloading model
          </p>
          <span className="text-[12px] font-medium tabular-nums text-gray-400 dark:text-neutral-500">
            {progress}%
          </span>
        </div>

        {/* Progress bar */}
        <div
          className="w-full h-1.5 rounded-full overflow-hidden"
          style={{ background: 'var(--glass-bg-heavy)' }}
        >
          <motion.div
            className="h-full rounded-full bg-blue-500"
            style={{
            }}
            animate={{ width: `${Math.max(progress, 2)}%` }}
            transition={{ duration: 0.4, ease: 'easeOut' }}
          />
        </div>

        {/* Status text */}
        <AnimatePresence mode="wait">
          <motion.p
            key={displayStatus}
            className="text-[11px] text-gray-400 dark:text-neutral-500 font-light mt-2"
            initial={{ opacity: 0, y: 3 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -3 }}
            transition={{ duration: 0.2 }}
          >
            {displayStatus}
          </motion.p>
        </AnimatePresence>
      </div>

      <GhostButton onClick={cancelDownload}>Cancel</GhostButton>
    </SetupShell>
  )
}

function ErrorScreen({ onRetry }: { onRetry: () => void }): React.JSX.Element {
  const error = useAIStore((s) => s.error)
  return (
    <SetupShell>
      <div
        className="w-10 h-10 rounded-2xl flex items-center justify-center text-lg"
        style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)' }}
      >
        ⚠️
      </div>

      <div className="space-y-1.5">
        <p className="text-[13px] font-medium text-gray-800 dark:text-neutral-200">
          Something went wrong
        </p>
        {error && (
          <p className="text-[11px] font-mono text-gray-400 dark:text-neutral-500 max-w-[300px] leading-relaxed break-all">
            {error}
          </p>
        )}
      </div>

      <PrimaryButton onClick={onRetry}>Try again</PrimaryButton>
    </SetupShell>
  )
}

// ── Exported component ────────────────────────────────────────────────────────

export function OllamaSetupContent(): React.JSX.Element {
  const status = useAIStore((s) => s.status)
  const checkStatus = useAIStore((s) => s.checkStatus)
  const startDownload = useAIStore((s) => s.startDownload)

  const handleRetry = useCallback(() => checkStatus(), [checkStatus])
  const handleDownload = useCallback(() => startDownload(), [startDownload])

  const screenMap: Partial<Record<AIStatus, React.ReactNode>> = {
    checking: <CheckingScreen />,
    'missing-ollama': <MissingOllamaScreen onRetry={handleRetry} />,
    'service-down': <ServiceDownScreen onRetry={handleRetry} />,
    'missing-model': <MissingModelScreen onDownload={handleDownload} />,
    downloading: <DownloadingScreen />,
    error: <ErrorScreen onRetry={handleRetry} />,
  }

  const screen = screenMap[status]

  return (
    <div className="relative" style={{ height: CONTENT_HEIGHT }}>
      <AnimatePresence mode="wait">
        <motion.div
          key={status}
          className="absolute inset-0"
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={{ duration: 0.25, ease: [0.25, 0.46, 0.45, 0.94] }}
        >
          {screen}
        </motion.div>
      </AnimatePresence>
    </div>
  )
}
