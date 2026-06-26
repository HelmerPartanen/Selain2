import { memo, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Card, Sheet } from "@/components/ui/Card";
import { TextInput } from "@/components/ui/Input";
import { SearchInput } from "@/components/ui/Search";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { Text } from "@/components/ui/Text";
import {
  Desc,
  SectionHeader,
  SettingGroup,
  SettingRow,
  Toggle,
} from "@/settings/components/SettingsShared";
import { SvgIcon } from "@/components/ui/SvgIcon";
import settingsSvg from "@/assets/icons/Objects/Settings.svg?raw";
import searchSvg from "@/assets/icons/Objects/Search.svg?raw";
import trashSvg from "@/assets/icons/Objects/Trash.svg?raw";
import closeSvg from "@/assets/icons/Interface/Close_Cross.svg?raw";

function Swatch({ className, label }: { className: string; label: string }) {
  return (
    <Card variant="surface" padding="sm" className="flex items-center gap-2">
      <div className={`h-8 w-8 rounded-lg ${className}`} />
      <Text size="caption" tone="muted">
        {label}
      </Text>
    </Card>
  );
}

export function UIComponentsContent(): React.JSX.Element {
  const [toggle, setToggle] = useState(true);
  const [segment, setSegment] = useState<"dynamic" | "light" | "dark">(
    "dynamic",
  );
  const [text, setText] = useState("https://example.com");
  const [search, setSearch] = useState("Open tabs");

  return (
    <div className="space-y-7 pb-4">
      <div>
        <SectionHeader>Text</SectionHeader>
        <Desc>Shared text scale and semantic colors used throughout the UI.</Desc>
        <Sheet inset className="space-y-1">
          <Card variant="interactive" padding="md">
            <Text size="title" tone="primary">
              Title text
            </Text>
            <Text size="body" tone="secondary">
              Body text for settings rows, panels, popovers, and compact pages.
            </Text>
            <Text size="caption" tone="muted">
              Caption text for descriptions, metadata, and secondary labels.
            </Text>
          </Card>
        </Sheet>
      </div>

      <div>
        <SectionHeader>Buttons</SectionHeader>
        <Desc>Action, icon, danger, link, and segmented button variants.</Desc>
        <div className="flex flex-wrap gap-2">
          <Button variant="primary">Label</Button>
          <Button variant="solid">Label</Button>
          <Button variant="subtle">Label</Button>
          <Button variant="ghost">Label</Button>
          <Button variant="danger">
            Label
          </Button>
          <Button variant="link">Link</Button>
          <Button variant="icon" aria-label="Search">
            <SvgIcon svg={searchSvg} size={14} />
          </Button>
          <Button variant="icon" aria-label="Close">
            <SvgIcon svg={closeSvg} size={13} />
          </Button>
        </div>
      </div>

      <div>
        <SectionHeader>Inputs</SectionHeader>
        <Desc>Text input, invalid state, toggles, and segmented controls.</Desc>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <TextInput
            value={text}
            onChange={(event) => setText(event.target.value)}
            aria-label="Example URL"
            spellCheck={false}
          />
          <TextInput
            value="Invalid value"
            invalid
            aria-label="Invalid example"
            readOnly
          />
          <div className="h-10 rounded-xl border border-[var(--app-separator)] px-3">
            <SearchInput
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              aria-label="Search example"
              placeholder="Search"
              clearable
              onClear={() => setSearch("")}
            />
          </div>
        </div>
        <div className="mt-3 flex items-center gap-3">
          <Toggle checked={toggle} onChange={setToggle} label="Example toggle" />
          <SegmentedControl
            value={segment}
            onChange={setSegment}
            aria-label="Example segmented control"
            options={[
              { value: "dynamic", label: "Dynamic" },
              { value: "light", label: "Light" },
              { value: "dark", label: "Dark" },
            ]}
            className="min-w-[260px]"
          />
        </div>
      </div>

      <div>
        <SectionHeader>Cards and Sheets</SectionHeader>
        <Desc>Reusable surfaces for rows, controls, and contained groups.</Desc>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          <Card variant="surface">
            <Text size="label" tone="primary">
              Surface Card
            </Text>
            <Text size="caption" tone="muted">
              Default contained surface.
            </Text>
          </Card>
          <Card variant="interactive">
            <Text size="label" tone="primary">
              Interactive Card
            </Text>
            <Text size="caption" tone="muted">
              Hover row surface.
            </Text>
          </Card>
          <Card variant="elevated">
            <Text size="label" tone="primary">
              Elevated Card
            </Text>
            <Text size="caption" tone="muted">
              Modal and popover content.
            </Text>
          </Card>
        </div>
      </div>

      <div>
        <SectionHeader>Settings Rows</SectionHeader>
        <Desc>Canonical preference row composition.</Desc>
        <SettingGroup>
          <SettingRow
            label="Reusable row"
            desc="Rows compose Card, Text, and the child control slot."
          >
            <Button variant="subtle">
              <SvgIcon svg={settingsSvg} size={13} />
              Action
            </Button>
          </SettingRow>
          <SettingRow label="Toggle row" desc="Shared switch control.">
            <Toggle checked={toggle} onChange={setToggle} label="Toggle row" />
          </SettingRow>
        </SettingGroup>
      </div>

      <div>
        <SectionHeader>Color Tokens</SectionHeader>
        <Desc>Common semantic color pairings used by the reusable variants.</Desc>
        <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
          <Swatch className="bg-blue-400" label="Primary" />
          <Swatch className="bg-red-500" label="Danger" />
          <Swatch className="bg-[var(--app-control-hover)]" label="Muted fill" />
          <Swatch className="bg-[var(--app-bg-tertiary)]" label="Surface" />
        </div>
      </div>

    </div>
  );
}

function UIComponentsPaneInner(): React.JSX.Element {
  return <UIComponentsContent />;
}

export const UIComponentsPane = memo(UIComponentsPaneInner);
