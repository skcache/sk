"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { motion, useReducedMotion } from "motion/react";
import { favoriteSong } from "../config/favorite-song";
import {
  DynamicIsland,
  DynamicIslandProvider,
  DynamicContainer,
  DynamicTitle,
  DynamicDescription,
  useDynamicIslandSize,
  scheduleAnimation,
  type DynamicIslandPreset,
} from "./kit/dynamic-island";

/**
 * The music egg: the real Cult UI Dynamic Island state machine
 * (empty -> compact -> compactLong -> long -> compactLong -> compact
 * -> empty) driven by the kit's preset shell + scheduleAnimation queue.
 * The long state shows artwork, title and artist from the editable
 * favorite-song config. No audio, no APIs; compact and quiet.
 */
export default function MusicIsland({ onDone }: { onDone: () => void }) {
  return (
    <DynamicIslandProvider>
      <IslandBody onDone={onDone} />
    </DynamicIslandProvider>
  );
}

function IslandBody({ onDone }: { onDone: () => void }) {
  const onDoneRef = useRef(onDone);
  useEffect(() => {
    onDoneRef.current = onDone;
  }, [onDone]);

  const reduceMotion = useReducedMotion();
  const [preset, setPreset] = useState<DynamicIslandPreset>("default");
  useDynamicIslandSize(preset);

  useEffect(() => {
    let alive = true;
    const timers: number[] = [];
    const at = (delay: number, fn: () => void) => {
      timers.push(scheduleAnimation(delay, () => { if (alive) fn(); }));
    };
    at(80, () => setPreset("compact"));
    at(280, () => setPreset("compactLong"));
    at(520, () => setPreset("long"));
    at(3020, () => setPreset("compactLong"));
    at(3220, () => setPreset("compact"));
    at(3380, () => setPreset("default"));
    at(3500, () => onDoneRef.current());
    return () => {
      alive = false;
      timers.forEach(clearTimeout);
      timers.length = 0;
    };
  }, []);

  const contentT = reduceMotion
    ? { duration: 0.01 }
    : { delay: 0.05, duration: 0.24, ease: [0.16, 1, 0.3, 1] as const };
  const dotT = reduceMotion
    ? { duration: 0.01 }
    : { duration: 0.18, ease: "easeOut" as const };
  const showDot = preset === "compact" || preset === "compactLong";

  return (
    <DynamicIsland
      aria-label={`now playing: ${favoriteSong.title} by ${favoriteSong.artist}`}
      exit={
        reduceMotion
          ? { opacity: 0, transition: { duration: 0.01 } }
          : { opacity: 0, transition: { duration: 0.15 } }
      }
    >
      <DynamicContainer>
        {/* the compact pill is alive: a quiet dot while the island
            works up to its long state */}
        <motion.span
          className="dynamic-island-dot"
          initial={false}
          animate={{ opacity: showDot ? 0.8 : 0, scale: showDot ? 1 : 0.6 }}
          transition={dotT}
          aria-hidden="true"
        />
        <motion.div
          className="dynamic-island-content"
          initial={false}
          animate={{ opacity: preset === "long" ? 1 : 0, y: preset === "long" ? 0 : 6 }}
          transition={contentT}
        >
          <Image
            className="dynamic-island-art"
            src={favoriteSong.artwork}
            alt=""
            width={34}
            height={34}
            unoptimized
          />
          <span className="dynamic-island-meta">
            <DynamicTitle>{favoriteSong.title}</DynamicTitle>
            <DynamicDescription>{favoriteSong.artist}</DynamicDescription>
          </span>
        </motion.div>
      </DynamicContainer>
    </DynamicIsland>
  );
}