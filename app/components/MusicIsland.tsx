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
  void state.isAnimating;

  // official animation queue - the island GLIDES from the word at
  // EMPTY (fast projection), then expands IN PLACE with the official
  // Apple-like springs into compactLong (~300x56), HOLDS with the
  // equalizer alive, then CONTRACTS back through compact to empty
  // and resolves into the word. The whole lifecycle is ~3 seconds -
  // a performance, not a toggle.
  useScheduledAnimations([
    { size: SIZE_PRESETS.COMPACT, delay: 300 },
    { size: SIZE_PRESETS.COMPACT_LONG, delay: 620 },
    { size: SIZE_PRESETS.COMPACT, delay: 2350 },
    { size: SIZE_PRESETS.EMPTY, delay: 2650 },
  ]);

  // after the contract, return to the word (the layoutId resolves the
  // island back into the seed; the stage closes)
  useEffect(() => {
    const t = setTimeout(() => onDoneRef.current(), 3350);
    return () => clearTimeout(t);
  }, []);

  // the island lives its full ~3.3s lifecycle then returns
  return (
    <motion.span
      className="music-island-anchor"
      layoutId="music-island"
      transition={{ layout: { duration: 0.26, ease: [0.16, 1, 0.3, 1] } }}
    >
      <DynamicIsland id="music-stage-island">
        <IslandContent>
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
        </IslandContent>
      </DynamicIsland>
    </motion.span>
  );
}

/**
 * Apple's island rhythm: the SHELL expands first, the content arrives
 * a beat later (a quiet crossfade + settle); on the way out the
 * content leaves BEFORE the shell contracts - the exit mirrors the
 * entry. WAAPI-driven because declarative keyframes snap in this
 * motion version.
 */
function IslandContent({ children }: { children: React.ReactNode }) {
  const ref = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const settle = el.animate(
      [
        { opacity: 0, transform: "scale(0.92)" },
        { opacity: 1, transform: "scale(1)" },
      ],
      {
        delay: 700,
        duration: 280,
        easing: "cubic-bezier(0.22, 1, 0.36, 1)",
        fill: "forwards",
      },
    );
    const leave = el.animate(
      [
        { opacity: 1, transform: "scale(1)" },
        { opacity: 0, transform: "scale(0.9)" },
      ],
      {
        delay: 2360,
        duration: 220,
        easing: "ease-in",
        fill: "forwards",
      },
    );
    return () => {
      settle.cancel();
      leave.cancel();
    };
  }, []);
  return (
    <span className="island-row-content" ref={ref}>
      {children}
    </span>
  );
}