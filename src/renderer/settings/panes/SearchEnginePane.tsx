// ─── Search Engine Settings Pane ─────────────────────────────────────────────

import { memo } from "react";
import { Button } from "@/components/ui/Button";
import { Text } from "@/components/ui/Text";
import { SvgIcon } from "@/components/ui/SvgIcon";
import { GroupBox, SettingGroup } from "@/settings/components/SettingsShared";
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
    <div className="space-y-7">
      <GroupBox
        title="Default Search Engine"
        desc="Choose the search engine used for address bar and new tab searches."
      >
        <SettingGroup>
          <div
            className="space-y-0.5"
            role="radiogroup"
            aria-label="Search engine selection"
          >
            {SEARCH_ENGINES.map((engine) => {
              const isActive = engineId === engine.id;
              return (
                <Button
                  key={engine.id}
                  variant="ghost"
                  size="md"
                  role="radio"
                  aria-checked={isActive}
                  aria-label={`${engine.name} search engine`}
                  onClick={() => setEngine(engine.id)}
                  active={isActive}
                  className={`relative h-auto w-full justify-start gap-3 rounded-xl px-3.5 py-3 ${isActive ? "!bg-[var(--app-control-active)] text-[var(--app-text-primary)]" : ""}`}
                >
                  <div className="relative w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0">
                    {ENGINE_ICONS[engine.id] ? (
                      <img src={ENGINE_ICONS[engine.id]} alt={engine.name} className="w-full h-full" />
                    ) : (
                      <span className="text-[11px] font-medium">{engine.icon}</span>
                    )}
                  </div>
                  <Text as="span" size="body" className="relative text-inherit">
                    {engine.name}
                  </Text>
                  {isActive && (
                    <span className="relative ml-auto">
                      <SvgIcon svg={checkSvg} size={18} className="text-blue-500 dark:text-blue-400" />
                    </span>
                  )}
                </Button>
              );
            })}
          </div>
        </SettingGroup>
      </GroupBox>
    </div>
  );
}

export const SearchEnginePane = memo(SearchEnginePaneInner);
