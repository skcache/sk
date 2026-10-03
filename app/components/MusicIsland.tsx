"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { RefObject } from "react";
import { createPortal } from "react-dom";
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
  useScheduledAnimations,
  SIZE_PRESETS,
} from "./kit/dynamic-island";

/* THE ONE music time table - the whole performance lives here:
   click -> seed born at the word -> glides into the stage -> shell
   expands (album art + equalizer) -> title/artist resolve -> hold
   -> content leaves -> shell contracts -> seed glides home -> idle.
   No dead 300ms wait: the shell begins expanding the moment the
   seed's travel settles (~240ms), and the phases overlap on purpose
   - one continuous gesture, not wait/animate/wait/animate. */
const MUSIC_TIMING = {
  compact: 240, // the seed settles -> the shell expands (EMPTY -> COMPACT)
  full: 420, // title/artist resolve (COMPACT -> COMPACT_LONG)
  holdStart: 2360, // content exit begins: the meta narrows away
  rowExit: 2680, // equalizer softens + album art fades (still inside the shell)
  closing: 2860, // the seed re-forms underneath the contracting shell
  collapse: 2920, // EMPTY: the shell contracts with nothing inside
  returnMs: 3060, // the seed glides back toward the word
  done: 3380, // the seed dissolves at the word; unmount; idle
} as const;

/* The seed's travel spring: near-critical (damping ratio ~1.0) -
   fast response, smooth travel, almost no bounce. This is Motion's
   ONLY job: POSITION. The Cult island owns the shell dimensions. */
const SEED_SPRING = {
  type: "spring" as const,
  stiffness: 460,
  damping: 40,
  mass: 0.85,
};

type Phase = "opening" | "open" | "closing" | "returning";

/**
 * The music egg on the official Cult UI Dynamic Island machinery,
 * with ONE visible object: a small near-black seed is born exactly
 * where `music` was pressed, the seed GLIDES into the stable
 * interaction stage (Motion drives the transform - position only),
 * and once it arrives the Cult shell expands inside it (EMPTY ->
 * COMPACT -> COMPACT_LONG - width/height only). The seed and the
 * shell share the same dark skin, so the traveling object IS the
  * island being born - no invisible anchors, no shared-ID projection,
  * no two width systems fighting.
 *
 * Lifecycle (~3.4s, one deterministic performance per click):
 * seed leaves the word -> lands -> art + equalizer appear -> Kick /
 * Future resolve -> ~2.3s hold with the equalizer alive -> the meta
 * leaves -> art softens -> the shell contracts -> the seed glides
 * back to the word and dissolves. Repeat clicks are ignored by the
 * stage while it runs; every run returns to an identical idle.
 */
export default function MusicIsland({ onDone }: { onDone: () => void }) {
  return (
    <DynamicIslandProvider initialSize={SIZE_PRESETS.EMPTY}>
      <MusicBody onDone={onDone} />
    </DynamicIslandProvider>
  );
}

/* the word that was pressed: the seed is born from ITS box (the
   same measurement the press itself just used) */
function findWordOrigin() {
  const btn = [...document.querySelectorAll("button")].find(
    (b) => (b.textContent ?? "").trim() === "music"
  );
  const r = btn?.getBoundingClientRect();
  if (!r) return null;
  return { x: r.left + r.width / 2, y: r.top + r.height / 2, w: r.width, h: r.height };
}

/* the stable playground: the island always forms at the stage's
   center - the stage never grows or breathes for this */
function findStageCenter() {
  const el = document.querySelector(".interaction-stage");
  const r = el?.getBoundingClientRect();
  if (r) return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
  return { x: window.innerWidth / 2, y: 420 };
}

function MusicBody({ onDone }: { onDone: () => void }) {
  const reduce = useReducedMotion();
  const [origin, setOrigin] = useState<{ x: number; y: number; w: number; h: number } | null>(null);
  const [stage, setStage] = useState<{ x: number; y: number } | null>(null);
  const [phase, setPhase] = useState<Phase>("opening");
  const onDoneRef = useRef(onDone);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const rowRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    onDoneRef.current = onDone;
  }, [onDone]);

  const schedule = useCallback((ms: number, fn: () => void) => {
    timers.current.push(setTimeout(fn, ms));
  }, []);

  // measure once: the word's box (where the seed is born) and the
  // stage center (where it lands) - then the whole choreography is
  // deterministic from THE ONE time table. The measurement is
  // deferred one frame (the press's paint is already committed).
  useEffect(() => {
    const id = requestAnimationFrame(() => {
      setOrigin(findWordOrigin());
      setStage(findStageCenter());
      if (reduce) {
        // reduced motion: no travel - the island lives its schedule
        // in place, then returns with a clean fade
        setPhase("open");
        schedule(MUSIC_TIMING.done, () => onDoneRef.current());
      }
    });
    return () => {
      cancelAnimationFrame(id);
      timers.current.forEach(clearTimeout);
      timers.current = [];
    };
  }, [reduce, schedule]);

  // the closing choreography (the opening is the Cult schedule):
  // the meta leaves -> the art + equalizer soften -> the seed
  // re-forms -> the shell contracts -> the seed travels home
  useEffect(() => {
    if (!origin || !stage || reduce) return;
    schedule(MUSIC_TIMING.rowExit, () => {
      const el = rowRef.current;
      if (!el) return;
      el.animate(
        [
          { opacity: 1, transform: "scale(1)" },
          { opacity: 0, transform: "scale(0.94)" },
        ],
        { duration: 240, easing: "ease-in", fill: "forwards" }
      );
    });
    schedule(MUSIC_TIMING.closing, () => setPhase("closing"));
    schedule(MUSIC_TIMING.returnMs, () => setPhase("returning"));
    schedule(MUSIC_TIMING.done, () => onDoneRef.current());
  }, [origin, stage, reduce, schedule]);

  const seedW = origin ? Math.max(36, Math.min(56, origin.w * 0.7)) : 46;
  const seedH = origin ? Math.max(18, Math.min(24, origin.h * 0.5)) : 22;
  const delta = useMemo(() => {
    if (!origin || !stage) return { x: 0, y: 0 };
    return { x: stage.x - origin.x, y: stage.y - origin.y };
  }, [origin, stage]);

  // reduced motion: no spring travel - the island simply appears at
  // the stage center and returns with a clean fade
  if (reduce) {
    if (!stage) return null;
    return (
      <div
        className="music-projectile is-reduced"
        style={{ left: stage.x - seedW / 2, top: stage.y - seedH / 2, width: seedW, height: seedH }}
      >
        <span className="music-projectile-island">
          <IslandInner onDone={onDone} rowRef={rowRef} />
        </span>
      </div>
    );
  }

  if (!origin || !stage) return null;

  // PORTAL to the body: the page's reveal wrappers carry transforms,
  // which would turn position:fixed into a stage-relative offset -
  // the seed must live in TRUE viewport coordinates (the same reason
  // the trident portals). Inside: the seed skin (the visible object)
  // + the Cult island (it expands centered on the seed).
  return createPortal(
    <motion.div
      className="music-projectile"
      style={{
        left: origin.x - seedW / 2,
        top: origin.y - seedH / 2,
        width: seedW,
        height: seedH,
      }}
      initial={false}
      animate={
        phase === "opening" || phase === "open" || phase === "closing"
          ? { x: delta.x, y: delta.y }
          : { x: 0, y: 0 }
      }
      transition={SEED_SPRING}
    >
      <span className="music-seed-skin" aria-hidden="true" />
      <span className="music-projectile-island">
        <IslandInner onDone={onDone} rowRef={rowRef} />
      </span>
    </motion.div>,
    document.body
  );
}

/**
 * The island itself: the official size machine + progressive
 * disclosure. The shell is the SAME dark object the seed became -
 * only its internal width/height/radius animate (Cult's job).
 */
function IslandInner({
  onDone,
  rowRef,
}: {
  onDone: () => void;
  rowRef: RefObject<HTMLSpanElement | null>;
}) {
  const { state } = useDynamicIslandSize();
  const onDoneRef = useRef(onDone);
  useEffect(() => {
    onDoneRef.current = onDone;
  }, [onDone]);
  void state.isAnimating;

  /* the official animation queue - the SHELL states. The delays are
     the opening choreography: expansion the moment the seed settles,
     then the full song state; the closing keeps content exiting
     before the shell collapses. */
  useScheduledAnimations([
    { size: SIZE_PRESETS.COMPACT, delay: MUSIC_TIMING.compact },
    { size: SIZE_PRESETS.COMPACT_LONG, delay: MUSIC_TIMING.full },
    { size: SIZE_PRESETS.COMPACT, delay: MUSIC_TIMING.holdStart },
    { size: SIZE_PRESETS.EMPTY, delay: MUSIC_TIMING.collapse },
  ]);

  return (
    <DynamicIsland
      id="music-stage-island"
      className="music-island-shell mx-auto h-0 w-0 shrink-0 items-center justify-center border text-center text-ink"
    >
      <DynamicContainer className="dynamic-island-row">
        <span className="island-row-content" ref={rowRef}>
          <Image
            className="dynamic-island-art"
            src={favoriteSong.artwork}
            alt=""
            width={36}
            height={36}
            unoptimized
          />
          <span
            className={`dynamic-island-meta${
              state.size === SIZE_PRESETS.COMPACT_LONG ? " is-visible" : ""
            }`}
          >
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
        </span>
      </DynamicContainer>
    </DynamicIsland>
  );
}