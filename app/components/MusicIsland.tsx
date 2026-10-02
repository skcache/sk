"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import Image from "next/image";
import { motion, useReducedMotion } from "motion/react";
import { ThinkingOrb } from "thinking-orbs";
import { favoriteSong } from "../config/favorite-song";
import {
  DynamicIsland,
  DynamicTitle,
  DynamicDescription,
  scheduleAnimation,
  type DynamicIslandSize,
} from "./kit/dynamic-island";

const MUSIC_ORB_STATES = ["breathing", "composing", "weaving", "shaping"] as const;

/* one continuous timeline (normalized); expanded holds ~2.3s */
const T = [0, 0.05, 0.12, 0.18, 0.72, 0.8, 0.88, 1];
const W = [0, 96, 190, 260, 260, 190, 96, 0];
const H = [0, 36, 36, 64, 64, 36, 36, 0];
const R = [0, 18, 20, 26, 26, 20, 18, 0];
/* artwork: centered at compact, walks to the left edge at expanded */
const AL = [35, 35, 50, 16, 16, 50, 35, 35];
const AW = [26, 26, 26, 36, 36, 36, 26, 26];
const AH = [26, 26, 26, 36, 36, 36, 26, 26];
const CL_KF = [0, 0, 1, 0, 0, 1, 0, 0]; // compactLong layer (eq + title)
const EL_KF = [0, 0, 0, 1, 1, 0, 0, 0]; // expanded layer (orb + meta)

const DUR = 4200;
const STEP_MS = 16;

const easeOut = (x: number) => 1 - Math.pow(1 - x, 3);
const easeIn = (x: number) => x * x * x;
const EASES = [easeOut, easeOut, easeOut, (x: number) => x, easeIn, easeIn, easeIn];

/* progress fill: starts when the expanded state arrives (850ms) and
   fills over 1700ms, tracked on the same clock */
const PROG_START = 850;
const PROG_LEN = 1700;

type Frame = {
  w: number;
  h: number;
  r: number;
  artL: number;
  artW: number;
  artH: number;
  clOp: number;
  elOp: number;
  prog: number;
};

function seg(kf: number[], u: number, round = false): number {
  let i = 0;
  while (i < T.length - 2 && u > T[i + 1]) i++;
  const span = T[i + 1] - T[i];
  const local = span === 0 ? 0 : Math.min(1, Math.max(0, (u - T[i]) / span));
  const e = EASES[i](local);
  const v = kf[i] + (kf[i + 1] - kf[i]) * e;
  return round ? Math.round(v) : v;
}

/* the entire eased morph precomputed as a frame table: one clock, one
   source of truth - shell, artwork, layers and progress are always
   perfectly in phase (no motion keyframe machinery involved) */
function buildFrames(): Frame[] {
  const frames: Frame[] = [];
  for (let t = 0; t <= DUR; t += STEP_MS) {
    const u = t / DUR;
    frames.push({
      w: seg(W, u, true),
      h: seg(H, u, true),
      r: seg(R, u, true),
      artL: seg(AL, u, true),
      artW: seg(AW, u, true),
      artH: seg(AH, u, true),
      clOp: Math.round(seg(CL_KF, u) * 100) / 100,
      elOp: Math.round(seg(EL_KF, u) * 100) / 100,
      prog:
        t < PROG_START ? 0 : Math.round(Math.min(1, (t - PROG_START) / PROG_LEN) * 100) / 100,
    });
  }
  const last = frames[frames.length - 1];
  frames[frames.length - 1] = { ...last, w: 0, h: 0, r: 0, clOp: 0, elOp: 0, prog: 1 };
  return frames;
}

/**
 * The music egg: Apple's Dynamic Island playing music, rebuilt on the
 * kit's shell with ONE continuous morph (researched from cingopablo's
 * Motion rebuild + ActivityKit naming: idle -> compact -> expanded).
 *
 * - Every state carries content: compact = the artwork walking center,
 *   compactLong = artwork + animated equalizer bars + title, expanded =
 *   artwork + randomized ThinkingOrb + title/artist + progress bar.
 * - The whole morph is one precomputed eased curve driven by a single
 *   rAF clock: the shell, the walking artwork, the layer crossfades
 *   and the progress fill are always perfectly in phase - liquid, not
 *   sequential (no preset stepping).
 * - Liquid glass material lives in CSS (backdrop blur, specular top
 *   highlight, soft glow). The page never moves: the stage is a fixed
 *   44px anchor and the island floats as an overlay.
 * - Reduced motion: expanded state appears instantly, holds ~2.2s,
 *   then closes - no morph travel.
 */
export default function MusicIsland({ onDone }: { onDone: () => void }) {
  const reduceMotion = useReducedMotion();
  const [orbState] = useState<(typeof MUSIC_ORB_STATES)[number]>(
    () => MUSIC_ORB_STATES[Math.floor(Math.random() * MUSIC_ORB_STATES.length)]
  );
  const onDoneRef = useRef(onDone);
  useEffect(() => {
    onDoneRef.current = onDone;
  }, [onDone]);

  const frames = useMemo(buildFrames, []);
  const [idx, setIdx] = useState(frames.length - 1); // collapsed until the clock runs

  useEffect(() => {
    if (reduceMotion) {
      // land on the expanded frame instantly, hold, close
      setIdx(frames.findIndex((f) => f.w === 260));
      const timer = scheduleAnimation(2200, () => onDoneRef.current());
      return () => clearTimeout(timer);
    }
    let raf = 0;
    let last = -1;
    const t0 = performance.now();
    const tick = () => {
      const t = performance.now() - t0;
      const i = Math.min(frames.length - 1, Math.floor(t / STEP_MS));
      if (i !== last) {
        last = i;
        setIdx(i);
      }
      if (i >= frames.length - 1) {
        onDoneRef.current();
        return;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [reduceMotion, frames]);

  const f = frames[idx];
  const shell: DynamicIslandSize = { width: f.w, height: f.h, borderRadius: f.r };

  return (
    <DynamicIsland
      className="dynamic-island-music"
      aria-label={`now playing: ${favoriteSong.title} by ${favoriteSong.artist}`}
      exit={
        reduceMotion
          ? { opacity: 0, transition: { duration: 0.01 } }
          : { opacity: 0, transition: { duration: 0.15 } }
      }
      morphSize={shell}
    >
      {/* hoisted artwork: walks between its resting places */}
      <motion.span
        className="dynamic-island-art"
        style={{ left: f.artL, width: f.artW, height: f.artH }}
      >
        <Image src={favoriteSong.artwork} alt="" width={36} height={36} unoptimized />
      </motion.span>

      {/* compactLong layer: equalizer bars + title */}
      <motion.span
        className="dynamic-island-compact-layer"
        style={{ opacity: f.clOp }}
        aria-hidden="true"
      >
        <span className="dynamic-island-eq" aria-hidden="true">
          <i />
          <i />
          <i />
        </span>
        <DynamicTitle>{favoriteSong.title}</DynamicTitle>
      </motion.span>

      {/* expanded layer: randomized orb + title/artist */}
      <motion.span className="dynamic-island-expanded-layer" style={{ opacity: f.elOp }}>
        <ThinkingOrb
          state={orbState}
          size={20}
          theme="dark"
          paused={!!reduceMotion}
          style={{ flex: "none" }}
          aria-hidden="true"
        />
        <span className="dynamic-island-meta">
          <DynamicTitle>{favoriteSong.title}</DynamicTitle>
          <DynamicDescription>{favoriteSong.artist}</DynamicDescription>
        </span>
      </motion.span>

      {/* hairline progress: fills across the expanded hold */}
      <motion.span
        className="dynamic-island-progress"
        style={{ opacity: f.elOp }}
        aria-hidden="true"
      >
        <motion.span
          className="dynamic-island-progress-fill"
          style={{ scaleX: f.prog }}
        />
      </motion.span>
    </DynamicIsland>
  );
}