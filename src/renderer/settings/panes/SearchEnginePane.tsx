// ─── Search Engine Settings Pane ─────────────────────────────────────────────

import { memo } from "react";
import { SvgIcon } from "@/components/ui/SvgIcon";
import { Desc, SectionHeader } from "@/settings/components/SettingsShared";
import {
  useSearchEngineStore,
  SEARCH_ENGINES,
} from "@/store/searchEngineStore";
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
  const engineId = useSearchEngineStore((s) => s.engineId);
  const setEngine = useSearchEngineStore((s) => s.setEngine);

  return (
    <div className="space-y-6">
      <div>
        <SectionHeader>Default Search Engine</SectionHeader>
        <Desc>
          Choose the search engine used for address bar and new tab searches.
        </Desc>
        <div
          className="space-y-1.5"
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
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-150 ${
                  isActive
                    ? "bg-indigo-500 dark:bg-indigo-400 text-white dark:text-black shadow-sm"
                    : "bg-gray-100 dark:bg-neutral-800 text-gray-700 dark:text-neutral-300 border border-gray-200 dark:border-neutral-700 hover:bg-gray-200 dark:hover:bg-neutral-700"
                }`}
              >
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-[13px] font-medium flex-shrink-0 ${
                    isActive
                      ? "bg-white/20 dark:bg-black/20"
                      : "bg-gray-200 dark:bg-neutral-700"
                  }`}
                >
                  {ENGINE_ICONS[engine.id] ? (
                    <img src={ENGINE_ICONS[engine.id]} alt={engine.name} className="w-6 h-6" />
                  ) : (
                    engine.icon
                  )}
                </div>
                <span className="text-[13px] font-normal">{engine.name}</span>
                {isActive && (
                  <SvgIcon svg={checkSvg} size={18} className="ml-auto bg-white rounded-full text-indigo-500 dark:text-indigo-400" />
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export const SearchEnginePane = memo(SearchEnginePaneInner);
