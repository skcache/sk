"use client";

import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import MusicIsland from "./MusicIsland";

/** Which Easter egg is occupying the shared stage right now. */
export type StageAction = "music" | "basketball" | "markets" | "ucsd";

/**
 * The shared interaction stage: a bounded, quiet region below the intro
 * where larger Easter eggs animate instead of being crammed into inline
 * text.
 *
 * - exactly one active interaction at a time (AnimatePresence
 *   mode="wait"; exiting panels unmount and clear their timers, so
 *   switching can never leave stale state)
 * - idle height ~44px with nothing visible; active height ~88px,
 *   expanded by one smooth spring (music's compact shell fits inside;
 *   future panels may raise this ceiling when they land)
 * - overflow hidden (nothing can spill into the page), mobile safe
 * - future panels: basketball / markets / ucsd mount here the same way
 *   music does (add `active === "..."` branches and their keys)
 */
export default function InteractionStage({
  active,
  onDone,
}: {
  active: StageAction | null;
  onDone: () => void;
}) {
  const reduceMotion = useReducedMotion();
  const t = reduceMotion
    ? { duration: 0.01 }
    : { type: "spring" as const, stiffness: 320, damping: 30, mass: 0.9 };

  return (
    <motion.div
      className="interaction-stage"
      initial={false}
      animate={{ height: active ? 88 : 44 }}
      transition={t}
      aria-hidden={!active}
    >
      <AnimatePresence mode="wait">
        {active === "music" && <MusicIsland key="music" onDone={onDone} />}
        {/* future panels mount here under their own keys, e.g.
            {active === "basketball" && <BasketballIsland key="basketball" onDone={onDone} />}
            {active === "markets" && <MarketsIsland key="markets" onDone={onDone} />}
            {active === "ucsd" && <UcsdLaunchIsland key="ucsd" onDone={onDone} />} */}
      </AnimatePresence>
    </motion.div>
  );
}