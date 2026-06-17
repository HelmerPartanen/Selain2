import { memo } from 'react'

import { AnimatePresence, motion } from 'motion/react'

import { SvgIcon } from '@/components/ui/SvgIcon'

import chevronLeftSvg from '@/assets/icons/Arrows/Chevron_Left.svg?raw'

import chevronRightSvg from '@/assets/icons/Arrows/Chevron_Right.svg?raw'

import unsplitSvg from '@/assets/icons/Arrows/Triangle_Merge.svg?raw'

import { useFocusedTabCanNavigate, useIsSplitView } from '@/hooks/useTabSelector'

import { useBrowserNavigation } from '@/hooks/useBrowserNavigation'

import { useTabStore } from '@/store/tabStore'

import { useSettingsStore } from '@/store/settingsStore'

import { URLBar } from '@/components/browser/URLBar'

import { AppMenu } from '@/components/layout/AppMenu'

import { SpaceSwitcher } from '@/components/layout/SpaceSwitcher'

import { TabStrip } from '@/components/browser/TabStrip'

import { DownloadPill } from '@/components/browser/DownloadPill'

import { WindowControls } from '@/components/layout/WindowControls'

import { CLASSIC_CHROME_HEIGHT } from '@/components/layout/layoutConstants'

import { SPRING_EXPAND } from '@/utils/springs'



function ClassicBrowserChromeInner(): React.JSX.Element {

  const { handleGoBack, handleGoForward, handleUnsplit } = useBrowserNavigation()

  const { canGoBack, canGoForward } = useFocusedTabCanNavigate()

  const isSplit = useIsSplitView()

  const focusedPanel = useTabStore((s) => s.focusedPanel)

  const disableAnimations = useSettingsStore((s) => s.disableAnimations)

  const disableBlurEffects = useSettingsStore((s) => s.disableBlurEffects)



  const chromeSurface = disableBlurEffects

    ? 'bg-gray-100 dark:bg-neutral-900 border-black/10 dark:border-white/10'

    : 'bg-gray-100/95 dark:bg-neutral-900/95 backdrop-blur-md border-black/5 dark:border-white/5'



  const toolbarSurface = disableBlurEffects

    ? 'bg-white dark:bg-[#1D1F23] border-black/10 dark:border-white/10'

    : 'bg-white/95 dark:bg-[#1D1F23]/95 backdrop-blur-md border-black/5 dark:border-white/5'



  return (

    <div

      className="fixed top-0 left-0 right-0 z-[85] flex flex-col [app-region:no-drag]"

      style={{ height: CLASSIC_CHROME_HEIGHT }}

    >

      {/* Tab strip row */}

      <div

        className={`flex items-start h-11 px-0.5 border-b ${chromeSurface} [app-region:drag]`}

      >

        <div className="flex-1 min-w-0 flex items-end pr-2 [app-region:no-drag]">

          <TabStrip />

        </div>

        <div className="flex-shrink-0 [app-region:no-drag]">

          <WindowControls embedded />

        </div>

      </div>



      {/* Toolbar row */}

      <div className={`flex items-center gap-1 h-11 px-2 border-b ${chromeSurface}`}>

        <div className="flex items-center gap-0.5 flex-shrink-0">

          <AppMenu />

          <SpaceSwitcher />

        </div>



        <div className="flex items-center flex-shrink-0">

          <button

            type="button"

            onClick={handleGoBack}

            disabled={!canGoBack}

            aria-label="Go back"

            className="h-9 w-9 flex items-center justify-center rounded-lg text-gray-700 dark:text-neutral-300 hover:bg-black/[0.04] dark:hover:bg-white/[0.06] disabled:opacity-40 disabled:pointer-events-none transition-colors"

          >

            <SvgIcon svg={chevronLeftSvg} size={16} />

          </button>

          <button

            type="button"

            onClick={handleGoForward}

            disabled={!canGoForward}

            aria-label="Go forward"

            className="h-9 w-9 flex items-center justify-center rounded-lg text-gray-700 dark:text-neutral-300 hover:bg-black/[0.04] dark:hover:bg-white/[0.06] disabled:opacity-40 disabled:pointer-events-none transition-colors"

          >

            <SvgIcon svg={chevronRightSvg} size={16} />

          </button>

        </div>



        <div className="flex-1 min-w-0 flex items-center px-1">

          <div className="w-full min-w-0 rounded-lg bg-black/[0.03] dark:bg-white/[0.04]">

            <URLBar layout="classic" popoverDirection="down" />

          </div>

        </div>



        <AnimatePresence initial={false}>

          {isSplit && (

            <motion.button

              key="unsplit"

              type="button"

              onClick={handleUnsplit}

              aria-label="Exit split view"

              initial={disableAnimations ? undefined : { width: 0, opacity: 0 }}

              animate={{ width: 36, opacity: 1 }}

              exit={disableAnimations ? undefined : { width: 0, opacity: 0 }}

              transition={disableAnimations ? { duration: 0 } : SPRING_EXPAND}

              className="h-9 w-9 flex items-center justify-center rounded-lg text-blue-500 hover:bg-black/[0.04] dark:hover:bg-white/[0.06] overflow-hidden flex-shrink-0"

            >

              <SvgIcon svg={unsplitSvg} size={15} />

            </motion.button>

          )}

        </AnimatePresence>



        <DownloadPill />



        {/* Split panel indicator dots */}

        <AnimatePresence initial={false}>

          {isSplit && (

            <motion.div

              initial={{ opacity: 0 }}

              animate={{ opacity: 1 }}

              exit={{ opacity: 0 }}

              className="flex gap-1.5 px-1 flex-shrink-0"

            >

              <div

                className={`w-1.5 h-1.5 rounded-full transition-colors ${focusedPanel === 'primary' ? 'bg-blue-500' : 'bg-gray-300 dark:bg-neutral-600'}`}

              />

              <div

                className={`w-1.5 h-1.5 rounded-full transition-colors ${focusedPanel === 'split' ? 'bg-blue-500' : 'bg-gray-300 dark:bg-neutral-600'}`}

              />

            </motion.div>

          )}

        </AnimatePresence>

      </div>

    </div>

  )

}



export const ClassicBrowserChrome = memo(ClassicBrowserChromeInner)


