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
  SIZE_PRESETS,
} from "./kit/dynamic-island";

/* THE ONE absolute clock. Every beat of the performance lives here:
   press -> seed appears -> the shell starts expanding WHILE the seed
   is still gliding -> COMPACT_LONG flows on -> the metadata resolves
   -> ~2s hold -> metadata fades -> art + EQ fade -> the shell
   contracts -> the seed returns -> idle.
   This table drives BOTH the Cult shell states (setSize) and the
   outer choreography (phases, fades, return) - ONE clock, no
   cumulative queue, no second schedule. */
const MUSIC_TIMING = {
  compact: 120, // the shell starts expanding while the seed is mid-flight
  full: 320, // the shell flows fluidly into COMPACT_LONG
  metaMount: 400, // the metadata mounts once the shell has the room
  skinFade: 150, // the seed skin fades as the shell grows over it
  metaExit: 2340, // the metadata fades out (240ms) - shell still full
  rowExit: 2580, // the art + EQ fade (220ms) - shell still full
  contract: 2720, // the shell narrows to COMPACT (content invisible)
  closing: 2900, // the seed skin re-forms under the nearly-empty shell
  empty: 2940, // EMPTY - the shell contracts down to the seed
  returnMs: 3060, // the seed glides back toward the word
  done: 3300, // the seed dissolves at the word; unmount; idle
} as const;

/* The seed's travel spring: near-critical (damping ratio ~1.0) -
   magnetically pulled, no bounce, no float. Motion's ONLY job:
   POSITION. The Cult island owns the shell dimensions. */
const SEED_SPRING = {
  type: "spring" as const,
  stiffness: 500,
  damping: 42,
  mass: 0.8,
};

type Phase = "opening" | "open" | "closing" | "returning";

/**
 * The music egg on the official Cult UI Dynamic Island machinery,
 * with ONE visible object and ONE clock:
 *  - Motion animates ONLY the position (word -> stage -> word).
 *  - The Cult shell animates ONLY its dimensions (EMPTY -> COMPACT ->
 *    COMPACT_LONG -> ...), driven by setSize on the SAME absolute
 *    MUSIC_TIMING table - no cumulative queue.
 *  - The seed skin is the visible object during the travel; the shell
 *    (same near-black skin) grows over it, so the traveling object IS
 *    the island being born.
 *
 * Lifecycle (~3.3s, one deterministic performance per click):
 * seed leaves the word at once -> mid-flight the shell begins
 * expanding -> art + EQ appear -> Kick/Future resolve -> ~2s hold
 * with the equalizer alive -> metadata fades -> art + EQ fade ->
 * shell contracts -> seed skin re-forms -> the seed glides home and
 * dissolves. Repeat clicks are ignored by the stage; every run
 * returns to an identical idle.
 */
export default function MusicIsland({ onDone }: { onDone: () => void }) {
  return (
    <DynamicIslandProvider initialSize={SIZE_PRESETS.EMPTY}>
      <MusicBody onDone={onDone} />
    </DynamicIslandProvider>
  );
}

/* the word that was pressed: the seed is born from ITS box */
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
  // stage center (where it lands) - deferred one frame so the press's
  // paint is committed before we read it
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

  // the outer choreography on the SAME absolute clock: the skin fades
  // as the shell covers it, the content exit fades, then the phases
  // that drive the seed's return. The shell states are driven by the
  // same table inside IslandInner - one clock, two owners.
  useEffect(() => {
    if (!origin || !stage || reduce) return;
    schedule(MUSIC_TIMING.skinFade, () => setPhase("open"));
    schedule(MUSIC_TIMING.metaExit, () => {
      const meta = document.querySelector(".dynamic-island-meta");
      if (meta) {
        meta.animate(
          [{ opacity: 1 }, { opacity: 0 }],
          { duration: 240, easing: "ease-in", fill: "forwards" }
        );
      }
    });
    schedule(MUSIC_TIMING.rowExit, () => {
      const el = rowRef.current;
      if (!el) return;
      el.animate(
        [
          { opacity: 1, transform: "scale(1)" },
          { opacity: 0, transform: "scale(0.94)" },
        ],
        { duration: 220, easing: "ease-in", fill: "forwards" }
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

  const island = <IslandInner onDone={onDone} rowRef={rowRef} />;

  // reduced motion: the island simply appears at the stage center and
  // lives its schedule in place - no travel, no skin
  if (reduce) {
    if (!stage) return null;
    return (
      <div className="music-projectile is-reduced" style={{ left: stage.x - seedW / 2, top: stage.y - seedH / 2, width: seedW, height: seedH }}>
        <span className="music-projectile-island">{island}</span>
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
      <span
        className="music-seed-skin"
        aria-hidden="true"
        style={{ opacity: phase === "open" ? 0 : 1 }}
      />
      <span className="music-projectile-island">{island}</span>
    </motion.div>,
    document.body
  );
}

/**
 * The island itself: the official size machine driven by setSize on
 * THE SAME absolute clock as the outer choreography (never the
 * cumulative queue). The shell is the SAME dark object the seed
 * became - only its internal width/height/radius animate (Cult's
 * job), while the content mounts progressively.
 */
function IslandInner({
  onDone,
  rowRef,
}: {
  onDone: () => void;
  rowRef: RefObject<HTMLSpanElement | null>;
}) {
  const { state, dispatch } = useDynamicIslandSize();
  const [metaIn, setMetaIn] = useState(false);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const onDoneRef = useRef(onDone);
  useEffect(() => {
    onDoneRef.current = onDone;
  }, [onDone]);
  void state.isAnimating;

  /* ONE absolute clock: the shell states are dispatched directly with
     the reducer's STABLE dispatch (setSize would be re-created on
     every state change and re-run this effect, shifting the later
     beats out of sync with the outer choreography). The Cult queue is
     NOT used - its delays are cumulative. */
  useEffect(() => {
    const at = (ms: number, fn: () => void) => timers.current.push(setTimeout(fn, ms));
    at(MUSIC_TIMING.compact, () => dispatch({ type: "SET_SIZE", newSize: SIZE_PRESETS.COMPACT }));
    at(MUSIC_TIMING.full, () => dispatch({ type: "SET_SIZE", newSize: SIZE_PRESETS.COMPACT_LONG }));
    at(MUSIC_TIMING.metaMount, () => setMetaIn(true));
    at(MUSIC_TIMING.contract, () => dispatch({ type: "SET_SIZE", newSize: SIZE_PRESETS.COMPACT }));
    at(MUSIC_TIMING.empty, () => dispatch({ type: "SET_SIZE", newSize: SIZE_PRESETS.EMPTY }));
    return () => {
      timers.current.forEach(clearTimeout);
      timers.current = [];
    };
  }, [dispatch]);

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
          {metaIn && (
            <span className="dynamic-island-meta">
              <DynamicTitle className="dynamic-island-title">
                {favoriteSong.title}
              </DynamicTitle>
              <DynamicDescription className="dynamic-island-description">
                {favoriteSong.artist}
              </DynamicDescription>
            </span>
          )}
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