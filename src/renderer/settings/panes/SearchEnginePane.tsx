// ─── Search Engine Settings Pane ─────────────────────────────────────────────

import { memo, useState } from "react";
import { motion } from "motion/react";
import { SvgIcon } from "@/components/ui/SvgIcon";
import { Desc, SectionHeader, SettingGroup } from "@/settings/components/SettingsShared";
import {
  useSearchEngineStore,
  SEARCH_ENGINES,
} from "@/store/searchEngineStore";
import { SPRING_SNAPPY } from "@/utils/springs";
import checkSvg from "@/assets/icons/Interface/Check.svg?raw";
import googleImg from "@/assets/searchengines/Google.svg";
import duckduckgoImg from "@/assets/searchengines/DuckDuckGo.svg";
import bingImg from "@/assets/searchengines/Bing.svg";
import yahooImg from "@/assets/searchengines/Yahoo.svg";
import braveImg from "@/assets/searchengines/Brave.svg";
import startpageImg from "@/assets/searchengines/Startpage.svg";

const ENGINE_ICONS: Record<string, string> = {
  google: googleImg,
  duckduckgo: duckduckgoImg,
  bing: bingImg,
  yahoo: yahooImg,
  brave: braveImg,
  startpage: startpageImg,
};

function SearchEnginePaneInner(): React.JSX.Element {
  const [hoveredEngineId, setHoveredEngineId] = useState<string | null>(null)
  const engineId = useSearchEngineStore((s) => s.engineId);
  const setEngine = useSearchEngineStore((s) => s.setEngine);

  return (
    <div className="space-y-7">
      <div>
        <SectionHeader>Default Search Engine</SectionHeader>
        <Desc>
          Choose the search engine used for address bar and new tab searches.
        </Desc>
        <SettingGroup>
          <div
            className="space-y-0.5"
            role="radiogroup"
            aria-label="Search engine selection"
          >
            {SEARCH_ENGINES.map((engine) => {
              const isActive = engineId === engine.id;
              return (
                <button
                  key={engine.id}
                  role="radio"
                  aria-checked={isActive}
                  aria-label={`${engine.name} search engine`}
                  onClick={() => setEngine(engine.id)}
                  onMouseEnter={() => setHoveredEngineId(engine.id)}
                  onMouseLeave={() => setHoveredEngineId(null)}
                  onFocus={() => setHoveredEngineId(engine.id)}
                  onBlur={() => setHoveredEngineId(null)}
                  className={`relative w-full flex items-center gap-3 px-3.5 py-3 rounded-full transition-all duration-150 ${isActive
                      ? "text-gray-900 dark:text-white"
                      : "text-gray-600 dark:text-neutral-400"
                    }`}
                >
                  {(isActive || hoveredEngineId === engine.id) && (
                    <motion.div
                      layoutId="history-hover"
                      className="absolute inset-0 rounded-full glass glass-interactive"
                      initial={{ opacity: 0.5, filter: 'blur(2px)' }}
                      animate={{ opacity: 1, filter: 'blur(0px)' }}
                      exit={{ opacity: 0, filter: 'blur(2px)' }}
                      transition={SPRING_SNAPPY}
                    />
                  )}
                  <div className="relative w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 bg-white dark:bg-white/[0.08] shadow-sm ring-1 ring-black/[0.04] dark:ring-white/[0.06]">
                    {ENGINE_ICONS[engine.id] ? (
                      <img src={ENGINE_ICONS[engine.id]} alt={engine.name} className="w-4.5 h-4.5" />
                    ) : (
                      <span className="text-[11px] font-medium">{engine.icon}</span>
                    )}
                  </div>
                  <span className="relative text-[13px] font-normal">{engine.name}</span>
                  {isActive && (
                    <span className="relative ml-auto">
                      <SvgIcon svg={checkSvg} size={16} className="text-blue-500 dark:text-blue-400" />
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </SettingGroup>
      </div>
    </div>
  );
}

export const SearchEnginePane = memo(SearchEnginePaneInner);
