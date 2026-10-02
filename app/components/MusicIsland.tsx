"use client";

import { useEffect, useRef } from "react";
import Image from "next/image";
import { motion } from "motion/react";
import { favoriteSong } from "../config/favorite-song";
import {
  DynamicIsland,
  DynamicIslandProvider,
  DynamicContainer,
  DynamicTitle,
  DynamicDescription,
  useDynamicIslandSize,
  useScheduledAnimations,
  SIZE_PRESETS,
} from "./kit/dynamic-island";

/**
 * The music egg, on the CURRENT official Cult UI Dynamic Island
 * machinery: provider + scheduled-animation queue + official presets.
 * No frame tables, no rAF, no hand timers - the queue is the timing.
 *
 * Sequence: empty -> compact -> compactLong (the ~300x56 music state,
 * held ~2.5s) -> compact -> empty. Content is the "what I'm listening
 * to" row: album art, title, artist and a tiny animated equalizer.
 *
 * The shell carries layoutId="music-island", shared with the seed span
 * in MusicWord: when this island mounts, Motion projects it out of the
 * `music` word; when it unmounts the island resolves back into the
 * word. The connection between word and island is the interaction.
 */
export default function MusicIsland({ onDone }: { onDone: () => void }) {
  return (
    <DynamicIslandProvider initialSize={SIZE_PRESETS.EMPTY}>
      <MusicBody onDone={onDone} />
    </DynamicIslandProvider>
  );
}

function MusicBody({ onDone }: { onDone: () => void }) {
  const { state } = useDynamicIslandSize();
  const onDoneRef = useRef(onDone);
  useEffect(() => {
    onDoneRef.current = onDone;
  }, [onDone]);

  // official animation queue - delays are incremental: the island
  // GLIDES from the word at EMPTY (fast projection, ~260ms), then
  // expands IN PLACE with the official Apple-like springs: compact
  // at t=300ms, compactLong at t=920ms, held to t=3320ms (~2.4s of
  // music state), collapsing back through compact to empty at
  // t=3550ms. separating the glide from the expansion is what makes
  // it feel composed instead of warped
  useScheduledAnimations([
    { size: SIZE_PRESETS.COMPACT, delay: 300 },
    { size: SIZE_PRESETS.COMPACT_LONG, delay: 620 },
    { size: SIZE_PRESETS.COMPACT, delay: 2400 },
    { size: SIZE_PRESETS.EMPTY, delay: 230 },
  ]);

  // when the queue has run to completion (shell back at EMPTY), the
  // stage clears this island and it resolves back into the word. the
  // official reducer sets isAnimating false on every SET_SIZE, so the
  // gate is: queue started once AND final size reached.
  const queueStarted = useRef(false);
  useEffect(() => {
    if (state.isAnimating) queueStarted.current = true;
    if (queueStarted.current && state.size === SIZE_PRESETS.EMPTY && !state.isAnimating) {
      onDoneRef.current();
    }
  }, [state.isAnimating, state.size]);

  return (
    <motion.span
      className="music-island-anchor"
      layoutId="music-island"
      transition={{ layout: { duration: 0.26, ease: [0.16, 1, 0.3, 1] } }}
    >
      <DynamicIsland id="music-stage-island">
        <DynamicContainer className="dynamic-island-row">
        <Image
          className="dynamic-island-art"
          src={favoriteSong.artwork}
          alt=""
          width={36}
          height={36}
          unoptimized
        />
        <span className="dynamic-island-meta">
          <DynamicTitle className="dynamic-island-title">
            {favoriteSong.title}
          </DynamicTitle>
          <DynamicDescription className="dynamic-island-description">
            {favoriteSong.artist}
          </DynamicDescription>
        </span>
        <span className="dynamic-island-eq" aria-hidden="true">
          <i />
          <i />
          <i />
          <i />
        </span>
      </DynamicContainer>
      </DynamicIsland>
    </motion.span>
  );
}