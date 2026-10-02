"use client";

import { motion } from "motion/react";
import TactileWord from "./TactileWord";
import { useStage } from "./StageProvider";

/**
 * The `music` word. It is ONLY the trigger: a hard tactile click opens
 * the shared stage's music island. While the island is mounted the
 * word renders a layoutId seed that Motion shares with the island
 * shell - the seed is invisible, but its box is where the island is
 * born and where it resolves back to. The morph from/to the word IS
 * the interaction.
 */
export default function MusicWord() {
  const { open, active } = useStage();
  return (
    <TactileWord label="music" onActivate={() => open("music")}>
      <span className="music-word">
        music
        {active !== "music" && (
          <motion.span
            layoutId="music-island"
            className="music-seed"
            aria-hidden="true"
            transition={{ layout: { duration: 0.26, ease: [0.16, 1, 0.3, 1] } }}
          />
        )}
      </span>
    </TactileWord>
  );
}