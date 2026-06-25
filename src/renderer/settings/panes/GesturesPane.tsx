import { memo } from "react";
import { motion, type Transition } from "motion/react";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { Text } from "@/components/ui/Text";
import { Desc, SectionHeader, SettingRow } from "@/settings/components/SettingsShared";
import { useSettingsStore, type TwoFingerSwipeAction } from "@/store/settingsStore";

function GestureVisualization({
  title,
  description,
  type
}: {
  title: string;
  description: string;
  fingers: number;
  type: "swipe-horizontal" | "pinch-in" | "pinch-out";
}): React.JSX.Element {
  // Removed the 'absolute' from the base class so we can use it in flex containers safely
  const baseFinger = "w-4 h-4 rounded-full bg-white dark:bg-white/70";

  // Standardized keyframe transition:
  // 1. Fade in & press down (0 -> 15%)
  // 2. Perform gesture (15% -> 65%)
  // 3. Lift up & fade out (65% -> 80%)
  // 4. Invisible reset (80% -> 100%)
  const gestureTransition: Transition = {
    duration: 2.6,
    repeat: Infinity,
    times: [0, 0.15, 0.65, 0.8, 1],
    ease: "easeInOut"
  };

  const renderFingers = () => {
    if (type === "swipe-horizontal") {
      return (
        <div className="absolute inset-0 flex items-center justify-center">
          {/* Fingers swiping left to right */}
          <motion.div
            className="absolute flex items-center gap-4"
            animate={{
              x: [-50, -50, 50, 50, -50],
              scale: [1.1, 0.95, 0.95, 1.1, 1.1],
              opacity: [0, 1, 1, 0, 0]
            }}
            transition={gestureTransition}
          >
            <div className={baseFinger} />
            <div className={baseFinger} />
          </motion.div>
        </div>
      );
    }

    if (type === "pinch-in") {
      return (
        <div className="absolute inset-0 flex items-center justify-center">
          {/* Finger 1 (Top Left moving to Center) */}
          <motion.div
            className={`${baseFinger} absolute`}
            animate={{
              x: [-45, -45, -12, -12, -45],
              y: [-45, -45, -12, -12, -45],
              scale: [1.1, 0.95, 0.95, 1.1, 1.1],
              opacity: [0, 1, 1, 0, 0]
            }}
            transition={gestureTransition}
          />
          {/* Finger 2 (Bottom Right moving to Center) */}
          <motion.div
            className={`${baseFinger} absolute`}
            animate={{
              x: [45, 45, 12, 12, 45],
              y: [45, 45, 12, 12, 45],
              scale: [1.1, 0.95, 0.95, 1.1, 1.1],
              opacity: [0, 1, 1, 0, 0]
            }}
            transition={gestureTransition}
          />
        </div>
      );
    }

    if (type === "pinch-out") {
      return (
        <div className="absolute inset-0 flex items-center justify-center">
          {/* Finger 1 (Center moving to Top Left) */}
          <motion.div
            className={`${baseFinger} absolute`}
            animate={{
              x: [-12, -12, -45, -45, -12],
              y: [-12, -12, -45, -45, -12],
              scale: [1.1, 0.95, 0.95, 1.1, 1.1],
              opacity: [0, 1, 1, 0, 0]
            }}
            transition={gestureTransition}
          />
          {/* Finger 2 (Center moving to Bottom Right) */}
          <motion.div
            className={`${baseFinger} absolute`}
            animate={{
              x: [12, 12, 45, 45, 12],
              y: [12, 12, 45, 45, 12],
              scale: [1.1, 0.95, 0.95, 1.1, 1.1],
              opacity: [0, 1, 1, 0, 0]
            }}
            transition={gestureTransition}
          />
        </div>
      );
    }

    return null;
  };

  return (
    <div className="flex flex-col gap-3 p-3">
      <div className="flex items-center justify-between">
        <div>
          <Text as="h3" size="label" tone="primary">
            {title}
          </Text>
          <Text size="caption" tone="muted" className="mt-0.5 max-w-[200px]">
            {description}
          </Text>
        </div>
      </div>

      {/* Trackpad visualizer */}
      <div className="relative mt-2 h-32 w-48 rounded-xl bg-black/[0.08] dark:bg-white/[0.10] overflow-hidden shrink-0 shadow-inner">
        {/* Trackpad surface detail */}
        <div
          className="absolute inset-0 opacity-[0.03] dark:opacity-5 mix-blend-overlay"
          style={{
            backgroundImage:
              'url("data:image/svg+xml,%3Csvg viewBox=\'0 0 200 200\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'noiseFilter\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.8\' numOctaves=\'3\' stitchTiles=\'stitch\'/%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23noiseFilter)\'/%3E%3C/svg%3E")'
          }}
        />
        {renderFingers()}
      </div>
    </div>
  );
}

function GesturesPaneInner(): React.JSX.Element {
  const twoFingerSwipeAction = useSettingsStore((s) => s.twoFingerSwipeAction);
  const setTwoFingerSwipeAction = useSettingsStore((s) => s.setTwoFingerSwipeAction);

  const swipeTitle = twoFingerSwipeAction === "tabs" ? "Switch Tabs" : "Navigate Back/Forward";
  const swipeDescription =
    twoFingerSwipeAction === "tabs"
      ? "Swipe horizontally with two fingers on your trackpad to cycle between open tabs."
      : "Swipe left/right with two fingers on your trackpad to navigate back/forward in browsing history.";

  return (
    <div className="space-y-3 p-3">
      <div>
        <SectionHeader>Trackpad Gestures</SectionHeader>
        <Desc>Master these intuitive, native-feeling gestures to navigate the browser natively.</Desc>
      </div>

      <div className="grid grid-cols-2">
        <GestureVisualization title={swipeTitle} description={swipeDescription} fingers={2} type="swipe-horizontal" />
        <div className="flex flex-col">
          <GestureVisualization
            title="Open Tab Overview"
            description="Pinch inwards with two fingers on your trackpad to smoothly zoom out into the birds-eye grid view."
            fingers={2}
            type="pinch-in"
          />
          <GestureVisualization
            title="Close Tab Overview"
            description="Pinch outwards to expand the selected tab back to full screen view."
            fingers={2}
            type="pinch-out"
          />
        </div>
      </div>

      <div className="mt-2">
        <SettingRow
          label="Horizontal two-finger swipe"
          desc="Choose whether the horizontal two-finger swipe cycles through tabs or navigates back/forward in the browser."
        >
          <SegmentedControl<TwoFingerSwipeAction>
            value={twoFingerSwipeAction}
            onChange={setTwoFingerSwipeAction}
            aria-label="Horizontal two-finger swipe behavior"
            options={[
              { value: "tabs", label: "Tabs" },
              { value: "navigation", label: "Navigation" },
            ]}
          />
        </SettingRow>
      </div>
    </div>
  );
}

export const GesturesPane = memo(GesturesPaneInner);
