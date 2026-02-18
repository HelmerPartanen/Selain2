// ─── Settings Panel ──────────────────────────────────────────────────────────
// Shell component: sidebar navigation + content router.
// All panes are extracted to src/renderer/settings/panes/ for maintainability.

import { memo, useEffect, useRef, useState } from 'react'
import { motion } from 'motion/react'
import { SvgIcon } from '@/components/ui/SvgIcon'
import closeSvg from '@/assets/icons/Interface/Close_Cross.svg?raw'
import settingsSvg from '@/assets/icons/Objects/Settings.svg?raw'
import brushSvg from '@/assets/icons/Objects/Brush.svg?raw'
import cameraSvg from '@/assets/icons/News/Image_picture.svg?raw'
import shieldSvg from '@/assets/icons/Objects/Shield.svg?raw'
import searchSvg from '@/assets/icons/Objects/Search.svg?raw'
import infoSvg from '@/assets/icons/Interface/Warn_Info.svg?raw'
import { useUIStore } from '@/store/uiStore'
import { GeneralPane } from '@/settings/panes/GeneralPane'
import { AppearancePane } from '@/settings/panes/AppearancePane'
import { WallpaperPane } from '@/settings/panes/WallpaperPane'
import { PrivacyPane } from '@/settings/panes/PrivacyPane'
import { SearchEnginePane } from '@/settings/panes/SearchEnginePane'
import { AboutPane } from '@/settings/panes/AboutPane'

// --- Constants ----------------------------------------------------------------

const springPanel = { type: 'spring' as const, stiffness: 400, damping: 28, mass: 0.8 }

// --- Sidebar Categories -------------------------------------------------------

type SettingsCategory = 'general' | 'appearance' | 'wallpaper' | 'privacy' | 'search' | 'about'

interface CategoryItem {
  id: SettingsCategory
  label: string
  icon: string
}

const CATEGORIES: CategoryItem[] = [
  { id: 'general', label: 'General', icon: settingsSvg },
  { id: 'appearance', label: 'Appearance', icon: brushSvg },
  { id: 'wallpaper', label: 'Wallpaper', icon: cameraSvg },
  { id: 'privacy', label: 'Privacy', icon: shieldSvg },
  { id: 'search', label: 'Search Engine', icon: searchSvg },
  { id: 'about', label: 'About', icon: infoSvg }
]

// --- Content Pane Router ------------------------------------------------------

function SettingsContent({ category }: { category: SettingsCategory }): React.JSX.Element {
  switch (category) {
    case 'general':
      return <GeneralPane />
    case 'appearance':
      return <AppearancePane />
    case 'wallpaper':
      return <WallpaperPane />
    case 'privacy':
      return <PrivacyPane />
    case 'search':
      return <SearchEnginePane />
    case 'about':
      return <AboutPane />
  }
}

// --- Sidebar ------------------------------------------------------------------

function Sidebar({
  activeCategory,
  onSelect
}: {
  activeCategory: SettingsCategory
  onSelect: (id: SettingsCategory) => void
}): React.JSX.Element {
  return (
    <nav aria-label="Settings categories" className="flex flex-col gap-1">
      {CATEGORIES.map(({ id, label, icon }) => {
        const isActive = activeCategory === id
        return (
          <button
            key={id}
            onClick={() => onSelect(id)}
            aria-current={isActive ? 'page' : undefined}
            className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13px] font-normal transition-all duration-100 ${
              isActive
                ? 'bg-indigo-500 dark:bg-indigo-400 text-white dark:text-black shadow-sm'
                : 'text-gray-600 dark:text-neutral-400 hover:bg-gray-100 dark:hover:bg-neutral-700 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            <SvgIcon svg={icon} size={16} />
            {label}
          </button>
        )
      })}
    </nav>
  )
}

// --- Main Panel ---------------------------------------------------------------

function SettingsPanelInner(): React.JSX.Element {
  const closeSettings = useUIStore((s) => s.closeSettings)
  const panelRef = useRef<HTMLDivElement>(null)
  const [activeCategory, setActiveCategory] = useState<SettingsCategory>('general')

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') closeSettings()
    }
    window.addEventListener('keydown', handleEscape)
    return () => window.removeEventListener('keydown', handleEscape)
  }, [closeSettings])

  const categoryLabel = CATEGORIES.find((c) => c.id === activeCategory)?.label ?? ''

  return (
    <>
      <motion.div
        className="fixed inset-0 z-[80] bg-black/30 dark:bg-black/50"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.15 }}
        onMouseDown={closeSettings}
        aria-hidden="true"
      />

      <div className="fixed inset-0 z-[85] flex items-center justify-center pointer-events-none">
        <motion.div
          ref={panelRef}
          role="dialog"
          aria-label="Settings"
          aria-modal="true"
          className="w-[720px] h-[500px] rounded-3xl overflow-hidden bg-white/95 dark:bg-neutral-900/95 shadow-2xl border border-gray-200/80 dark:border-neutral-700 [app-region:no-drag] pointer-events-auto"
          style={{ transformOrigin: '50% 100%', perspective: 800 }}
          initial={{ y: 280, scaleX: 0.1, scaleY: 0.03, opacity: 0, rotateX: -20 }}
          animate={{ y: 0, scaleX: 1, scaleY: 1, opacity: 1, rotateX: 0 }}
          exit={{ y: 280, scaleX: 0.1, scaleY: 0.03, opacity: 0, rotateX: -14 }}
          transition={{ ...springPanel, damping: 26 }}
        >
          <div className="flex h-full">
            <div className="w-[180px] flex-shrink-0 bg-gray-50 dark:bg-neutral-800 border-r border-gray-200 dark:border-neutral-700 flex flex-col">
              <div className="px-4 pt-5 pb-3">
                <h2 className="text-[13px] font-semibold text-gray-900 dark:text-white tracking-relaxed flex items-center gap-2">
                  Settings
                </h2>
              </div>
              <div className="flex-1 px-2.5 pb-4">
                <Sidebar activeCategory={activeCategory} onSelect={setActiveCategory} />
              </div>
            </div>

            <div className="flex-1 flex flex-col min-w-0 bg-white dark:bg-neutral-900">
              <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-gray-100 dark:border-neutral-800">
                <h3 className="text-[15px] font-semibold text-gray-900 dark:text-white tracking-relaxed">
                  {categoryLabel}
                </h3>
                <button
                  onClick={closeSettings}
                  aria-label="Close settings"
                  className="w-7 h-7 rounded-full flex items-center justify-center text-gray-400 dark:text-neutral-500 hover:text-gray-700 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-neutral-800 transition-colors duration-150"
                >
                  <SvgIcon svg={closeSvg} size={13} />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto overflow-x-hidden px-6 py-5 [&::-webkit-scrollbar]:w-1 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-gray-200 dark:[&::-webkit-scrollbar-thumb]:bg-neutral-700">
                <SettingsContent category={activeCategory} />
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </>
  )
}

export const SettingsPanel = memo(SettingsPanelInner)