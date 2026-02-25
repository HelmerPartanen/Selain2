import { memo } from "react";
import { motion, type Transition } from "motion/react";
import { SectionHeader, Desc } from "@/settings/components/SettingsShared";

function GestureVisualization({
    title,
    description,
    fingers,
    type
}: {
    title: string;
    description: string;
    fingers: number;
    type: "swipe-horizontal" | "pinch-in" | "pinch-out";
}): React.JSX.Element {

    // Removed the 'absolute' from the base class so we can use it in flex containers safely
    const baseFinger = "w-3 h-3 rounded-full bg-white dark:bg-neutral-900 ring-[1.5px] ring-white dark:ring-white/5 shadow-md backdrop-blur-sm";

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
                    {/* UI Context: Simulates tabs moving */}
                    <motion.div
                        className="absolute flex gap-3"
                        animate={{ x: [-15, -15, 15, 15, -15], opacity: [0, 0.4, 0.4, 0, 0] }}
                        transition={gestureTransition}
                    >
                        <div className="w-14 h-10 rounded-md bg-gray-400/20 dark:bg-white/10" />
                        <div className="w-14 h-10 rounded-md bg-indigo-500/30 border border-indigo-500/40 shadow-sm" />
                        <div className="w-14 h-10 rounded-md bg-gray-400/20 dark:bg-white/10" />
                    </motion.div>

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
                    {/* UI Context: Simulates zooming out to an overview */}
                    <motion.div
                        className="absolute w-20 h-20 rounded-xl bg-indigo-500/20 border border-indigo-500/40 shadow-sm"
                        animate={{
                            scale: [1, 1, 0.5, 0.5, 1],
                            opacity: [0, 0.5, 0.5, 0, 0]
                        }}
                        transition={gestureTransition}
                    />

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
                    {/* UI Context: Simulates expanding a tab to fullscreen */}
                    <motion.div
                        className="absolute w-20 h-20 rounded-xl bg-indigo-500/20 border border-indigo-500/40 shadow-sm"
                        animate={{
                            scale: [0.5, 0.5, 1, 1, 0.5],
                            opacity: [0, 0.5, 0.5, 0, 0]
                        }}
                        transition={gestureTransition}
                    />

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
        <div className="flex flex-col gap-3 p-4 rounded-2xl glass-subtle bg-white/25 dark:bg-white/5 border border-black/5 dark:border-white/5">
            <div className="flex items-center justify-between">
                <div>
                    <h3 className="font-medium text-[13px] text-gray-900 dark:text-gray-100">{title}</h3>
                    <p className="text-[12px] text-gray-500 dark:text-gray-400 mt-0.5 max-w-[200px] leading-relaxed">
                        {description}
                    </p>
                </div>
            </div>

            {/* Trackpad visualizer */}
            <div className="relative mt-2 h-32 rounded-xl bg-gray-200/50 dark:bg-black/20 border border-gray-300/50 dark:border-white/10 overflow-hidden shrink-0 shadow-inner">
                {/* Trackpad surface detail */}
                <div className="absolute inset-0 opacity-[0.03] dark:opacity-5 mix-blend-overlay" style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=\'0 0 200 200\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'noiseFilter\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.8\' numOctaves=\'3\' stitchTiles=\'stitch\'/%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23noiseFilter)\'/%3E%3C/svg%3E")' }} />
                {renderFingers()}
            </div>
        </div>
    );
}

function GesturesPaneInner(): React.JSX.Element {
    return (
        <div className="space-y-6 pb-4">
            <div>
                <SectionHeader>Trackpad Gestures</SectionHeader>
                <Desc>Master these intuitive, native-feeling gestures to navigate the browser natively.</Desc>
            </div>

            <div className="grid grid-cols-2 gap-4">
                <GestureVisualization
                    title="Switch Tabs"
                    description="Swipe horizontally with two fingers on your trackpad to cycle between open tabs."
                    fingers={2}
                    type="swipe-horizontal"
                />
                <div className="flex flex-col gap-4">
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
        </div>
    );
}

export const GesturesPane = memo(GesturesPaneInner);