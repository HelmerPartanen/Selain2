import { memo } from "react";
import { UIComponentsContent } from "@/settings/panes/UIComponentsPane";
import { Text } from "@/components/ui/Text";
import { SvgIcon } from "@/components/ui/SvgIcon";
import componentsSvg from "@/assets/icons/Objects/Wrench.svg?raw";

function UIKitPageInner(): React.JSX.Element {
  return (
    <main className="h-full overflow-y-auto bg-gray-50 px-6 py-8 text-gray-900 dark:bg-neutral-950 dark:text-gray-100">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-7">
        <header className="flex items-center gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-cyan-100 text-cyan-700 dark:bg-cyan-500/10 dark:text-cyan-300">
            <SvgIcon svg={componentsSvg} size={20} />
          </span>
          <div className="min-w-0">
            <Text as="h2" size="title" tone="primary">
              UI Kit
            </Text>
            <Text size="caption" tone="muted" className="mt-1">
              Reusable browser controls, surfaces, and settings primitives.
            </Text>
          </div>
        </header>

        <UIComponentsContent />
      </div>
    </main>
  );
}

export const UIKitPage = memo(UIKitPageInner);
