"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import {
  motion,
  useReducedMotion,
  type Transition,
  type Variants,
} from "motion/react";
import { favoriteSong } from "../config/favorite-song";

/**
 * The music island: a Dynamic Island style state machine
 * (empty -> compact -> compactLong -> long -> compactLong -> compact
 * -> empty) driven by ONE master timer chain, fully cleaned up on
 * unmount so no state update can ever fire after the island leaves.
 *
 * The container morphs width / height / border-radius on springs while
 * the artwork and track meta fade in only during the long state. A
 * quiet dark card on the site palette; not a phone clone.
 */

type Phase = "empty" | "compact" | "compactLong" | "long";

// expansion: soft, slight overshoot; collapse: crisp, no bounce
const EXPAND: Transition = {
  type: "spring",
  stiffness: 280,
  damping: 26,
  mass: 1,
};
const COLLAPSE: Transition = {
  type: "spring",
  stiffness: 340,
  damping: 30,
  mass: 1,
};
const INSTANT: Transition = { duration: 0.01 };

// master schedule, ms from mount; the long state is held ~2.6s
const ENTER_COMPACT = 60;
const ENTER_COMPACT_LONG = 240;
const ENTER_LONG = 480;
const HOLD_LONG = 2600;
const EXIT_COMPACT_LONG = ENTER_LONG + HOLD_LONG; // 3080
const EXIT_COMPACT = EXIT_COMPACT_LONG + 300; // 3380
const EXIT_EMPTY = EXIT_COMPACT + 180; // 3560
const CALL_DONE = EXIT_EMPTY + 120; // 3680

export default function MusicIsland({ onDone }: { onDone: () => void }) {
  const reduceMotion = useReducedMotion();
  const [phase, setPhase] = useState<Phase>("empty");

  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const alive = useRef(true);
  const onDoneRef = useRef(onDone);
  useEffect(() => {
    onDoneRef.current = onDone;
  }, [onDone]);

  // the expanded card never exceeds the viewport
  const longWidth = useMemo(() => {
    if (typeof window === "undefined") return 320;
    return Math.min(320, window.innerWidth - 48);
  }, []);

  useEffect(() => {
    alive.current = true;
    timers.current = [];
    const at = (delay: number, fn: () => void) => {
      timers.current.push(
        setTimeout(() => {
          if (!alive.current) return;
          fn();
        }, delay)
      );
    };

    at(ENTER_COMPACT, () => setPhase("compact"));
    at(ENTER_COMPACT_LONG, () => setPhase("compactLong"));
    at(ENTER_LONG, () => setPhase("long"));
    at(EXIT_COMPACT_LONG, () => setPhase("compactLong"));
    at(EXIT_COMPACT, () => setPhase("compact"));
    at(EXIT_EMPTY, () => setPhase("empty"));
    at(CALL_DONE, () => onDoneRef.current());

    return () => {
      alive.current = false;
      timers.current.forEach(clearTimeout);
      timers.current = [];
    };
  }, []);

  const container: Variants = {
    empty: {
      width: 0,
      height: 0,
      borderRadius: 22,
      opacity: 0,
      scale: 0.86,
      transition: reduceMotion ? INSTANT : COLLAPSE,
    },
    compact: {
      width: 150,
      height: 40,
      borderRadius: 22,
      opacity: 1,
      scale: 1,
      transition: reduceMotion ? INSTANT : EXPAND,
    },
    compactLong: {
      width: 210,
      height: 40,
      borderRadius: 22,
      opacity: 1,
      scale: 1,
      transition: reduceMotion ? INSTANT : EXPAND,
    },
    long: {
      width: longWidth,
      height: 132,
      borderRadius: 22,
      opacity: 1,
      scale: 1,
      transition: reduceMotion ? INSTANT : EXPAND,
    },
  };

  const content: Variants = {
    empty: {
      opacity: 0,
      scale: 0.92,
      transition: reduceMotion ? INSTANT : { duration: 0.14, ease: "easeIn" },
    },
    compact: {
      opacity: 0,
      scale: 0.92,
      transition: reduceMotion ? INSTANT : { duration: 0.14, ease: "easeIn" },
    },
    compactLong: {
      opacity: 0,
      scale: 0.92,
      transition: reduceMotion ? INSTANT : { duration: 0.14, ease: "easeIn" },
    },
    long: {
      opacity: 1,
      scale: 1,
      transition: reduceMotion
        ? INSTANT
        : { delay: 0.08, duration: 0.22, ease: "easeOut" },
    },
  };

  return (
    <motion.div
      className="island"
      initial={false}
      animate={phase}
      variants={container}
      exit={
        reduceMotion
          ? { opacity: 0, transition: INSTANT }
          : {
              opacity: 0,
              scale: 0.96,
              transition: { duration: 0.18, ease: "easeOut" },
            }
      }
      aria-label={`now playing: ${favoriteSong.title} by ${favoriteSong.artist}`}
    >
      <motion.div className="island-content" variants={content}>
        <Image
          className="island-art"
          src={favoriteSong.artwork}
          alt=""
          width={56}
          height={56}
          unoptimized
        />
        <div className="island-meta">
          <span className="island-title">{favoriteSong.title}</span>
          <span className="island-artist">{favoriteSong.artist}</span>
        </div>
      </motion.div>
    </motion.div>
  );
}