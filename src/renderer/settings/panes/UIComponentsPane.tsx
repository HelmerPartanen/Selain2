import { memo, useState } from "react";
import { AnimatePresence } from "motion/react";
import { Button } from "@/components/ui/Button";
import { Card, Sheet } from "@/components/ui/Card";
import { TextInput } from "@/components/ui/Input";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { Text } from "@/components/ui/Text";
import { PanelModal } from "@/components/ui/PanelModal";
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
import componentsSvg from "@/assets/icons/Objects/Wrench.svg?raw";

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

function FullUIKitSheet({
  onClose,
  toggle,
  setToggle,
  segment,
  setSegment,
}: {
  onClose: () => void;
  toggle: boolean;
  setToggle: (value: boolean) => void;
  segment: "dynamic" | "light" | "dark";
  setSegment: (value: "dynamic" | "light" | "dark") => void;
}): React.JSX.Element {
  return (
    <PanelModal
      onClose={onClose}
      width="920px"
      height="640px"
      role="dialog"
      aria-label="Full UI Kit"
      aria-modal={true}
      className="flex flex-col"
    >
      <div
        className="flex flex-shrink-0 items-center justify-between px-6 pb-4 pt-5"
        style={{ borderBottom: "1px solid var(--border-subtle)" }}
      >
        <Text as="h2" size="title" tone="primary" className="flex items-center gap-2">
          <SvgIcon svg={componentsSvg} size={16} />
          Full UI Kit
        </Text>
        <Button variant="icon" rounded="rounded-full" onClick={onClose} aria-label="Close UI kit">
          <SvgIcon svg={closeSvg} size={13} />
        </Button>
      </div>

      <div className="glass-scroll flex-1 space-y-7 overflow-y-auto px-6 py-5">
        <div>
          <SectionHeader>Core Actions</SectionHeader>
          <div className="flex flex-wrap gap-2">
            <Button variant="primary">Primary</Button>
            <Button variant="solid">Solid</Button>
            <Button variant="subtle">Subtle</Button>
            <Button variant="ghost">Ghost</Button>
            <Button variant="danger">
              <SvgIcon svg={trashSvg} size={13} />
              Danger
            </Button>
            <Button variant="link">Link</Button>
            <Button variant="icon" aria-label="Search">
              <SvgIcon svg={searchSvg} size={14} />
            </Button>
          </div>
        </div>

        <div>
          <SectionHeader>Form Controls</SectionHeader>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <TextInput defaultValue="https://example.com" aria-label="URL field" />
            <TextInput defaultValue="Invalid field" invalid aria-label="Invalid field" />
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <Toggle checked={toggle} onChange={setToggle} label="UI kit toggle" />
            <SegmentedControl
              value={segment}
              onChange={setSegment}
              aria-label="UI kit mode"
              options={[
                { value: "dynamic", label: "Dynamic" },
                { value: "light", label: "Light" },
                { value: "dark", label: "Dark" },
              ]}
              className="min-w-[280px]"
            />
          </div>
        </div>

        <div>
          <SectionHeader>Surfaces</SectionHeader>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            <Card variant="surface">
              <Text size="label" tone="primary">Surface</Text>
              <Text size="caption" tone="muted">Default contained block.</Text>
            </Card>
            <Card variant="interactive">
              <Text size="label" tone="primary">Interactive</Text>
              <Text size="caption" tone="muted">Rows and menu items.</Text>
            </Card>
            <Card variant="elevated">
              <Text size="label" tone="primary">Elevated</Text>
              <Text size="caption" tone="muted">Popovers and dialogs.</Text>
            </Card>
          </div>
        </div>

        <div>
          <SectionHeader>Settings Composition</SectionHeader>
          <SettingGroup>
            <SettingRow label="Reusable setting row" desc="Composed from Card and Text primitives.">
              <Button variant="subtle">Action</Button>
            </SettingRow>
            <SettingRow label="Switch row" desc="Uses the shared Toggle primitive.">
              <Toggle checked={toggle} onChange={setToggle} label="Switch row" />
            </SettingRow>
          </SettingGroup>
        </div>
      </div>
    </PanelModal>
  );
}

function UIComponentsPaneInner(): React.JSX.Element {
  const [toggle, setToggle] = useState(true);
  const [segment, setSegment] = useState<"dynamic" | "light" | "dark">(
    "dynamic",
  );
  const [text, setText] = useState("https://example.com");
  const [isFullKitOpen, setIsFullKitOpen] = useState(false);

  return (
    <div className="space-y-7 pb-4">
      <div>
        <Card variant="surface" className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <Text as="h3" size="title" tone="primary">
              App UI Kit
            </Text>
            <Text size="caption" tone="muted" className="mt-1 max-w-xl">
              Open the full sheet to inspect the reusable components in one place.
            </Text>
          </div>
          <Button variant="primary" size="md" onClick={() => setIsFullKitOpen(true)}>
            <SvgIcon svg={componentsSvg} size={14} />
            Open Full UI Kit
          </Button>
        </Card>
      </div>

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
          <Swatch className="bg-black/[0.08] dark:bg-white/[0.10]" label="Muted fill" />
          <Swatch className="bg-white dark:bg-[#1D1F23]" label="Surface" />
        </div>
      </div>

      <AnimatePresence>
        {isFullKitOpen && (
          <FullUIKitSheet
            onClose={() => setIsFullKitOpen(false)}
            toggle={toggle}
            setToggle={setToggle}
            segment={segment}
            setSegment={setSegment}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

export const UIComponentsPane = memo(UIComponentsPaneInner);
