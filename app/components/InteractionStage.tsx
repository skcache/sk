"use client";

import { AnimatePresence } from "motion/react";
import MusicIsland from "./MusicIsland";
import BasketballStage from "./BasketballStage";
import UcsdStage from "./UcsdStage";

/** Which Easter egg is occupying the shared stage right now. */
export type StageAction = "music" | "basketball" | "markets" | "ucsd";

/**
 * The shared stage: a real, bounded playground between the intro and
 * the experience section. It keeps one fixed height at rest (72px
 * mobile / 88px desktop) as intentional breathing room - invisible
 * chrome, never resizes for an animation - and toys animate INSIDE it.
 *
 * - exactly one active interaction at a time (AnimatePresence
 *   mode="wait"; exiting panels unmount and cancel their clocks, so
 *   switching can never leave stale state)
 * - panels: music island (Cult UI machinery, morphs out of the word),
 *   basketball (gravity ball), ucsd (trident projectile)
 * - markets mounts here later, same pattern
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
        {active === "basketball" && <BasketballStage key="basketball" onDone={onDone} />}
        {active === "ucsd" && <UcsdStage key="ucsd" onDone={onDone} />}
        {/* {active === "markets" && <MarketsStage key="markets" onDone={onDone} />} */}
      </AnimatePresence>
    </div>
  );
}