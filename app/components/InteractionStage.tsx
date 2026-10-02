"use client";

import { AnimatePresence } from "motion/react";
import MusicIsland from "./MusicIsland";

/** Which Easter egg is occupying the shared stage right now. */
export type StageAction = "music" | "basketball" | "markets" | "ucsd";

/**
 * The shared interaction stage: a fixed-height anchor below the intro
 * where larger Easter eggs mount. Micro interactions stay micro: the
 * stage NEVER expands the page - the island renders as a floating
 * overlay anchored here (like a real Dynamic Island overlays the
 * screen instead of resizing it), so the layout below never moves.
 *
 * - exactly one active interaction at a time (AnimatePresence
 *   mode="wait"; exiting panels unmount and clear their timers, so
 *   switching can never leave stale state)
 * - fixed 44px idle box, nothing visible at rest
 * - the island floats below the anchor over the next section; it is
 *   opaque with its own shadow, so it reads as an intentional overlay
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
  return (
    <div className="interaction-stage" aria-hidden={!active}>
      <AnimatePresence mode="wait">
        {active === "music" && <MusicIsland key="music" onDone={onDone} />}
        {/* future panels mount here under their own keys, e.g.
            {active === "basketball" && <BasketballIsland key="basketball" onDone={onDone} />}
            {active === "markets" && <MarketsIsland key="markets" onDone={onDone} />}
            {active === "ucsd" && <UcsdLaunchIsland key="ucsd" onDone={onDone} />} */}
      </AnimatePresence>
    </div>
  );
}