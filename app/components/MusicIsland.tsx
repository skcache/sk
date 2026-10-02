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
    at(260, () => setPreset("compactLong"));
    at(500, () => setPreset("long"));
    at(3200, () => setPreset("compactLong"));
    at(3520, () => setPreset("compact"));
    at(3700, () => setPreset("default"));
    at(3850, () => onDoneRef.current());
    return () => {
      alive = false;
      timers.forEach(clearTimeout);
      timers.length = 0;
    };
  }, []);

  const contentT = reduceMotion
    ? { duration: 0.01 }
    : { delay: 0.06, duration: 0.2, ease: "easeOut" as const };

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
        <motion.div
          className="dynamic-island-content"
          initial={false}
          animate={{ opacity: preset === "long" ? 1 : 0 }}
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