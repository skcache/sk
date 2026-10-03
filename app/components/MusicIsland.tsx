"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Image from "next/image";
import { motion, useReducedMotion } from "motion/react";
import { favoriteSong } from "../config/favorite-song";
import {
  DynamicIsland,
  DynamicIslandProvider,
  DynamicContainer,
  useDynamicIslandSize,
  SIZE_PRESETS,
} from "./kit/dynamic-island";

/* THE ONE absolute clock. The whole performance lives here:
   press -> the seed is born at the word -> it moves toward the stage
   WHILE the shell begins widening -> the seed arrives as the finished
   Apple-style COMPACT island (235x44) -> ~2s hold with the live
   waveform -> waveform fades -> art fades -> the shell shrinks AND
   the seed travels home at the SAME beat (MOVE + SHRINK is one
   gesture) -> it dissolves into the word -> idle.
   One clock for the Cult states, the content beats, and the travel. */
const MUSIC_TIMING = {
  expand: 70, // the shell starts widening while the seed is still moving
  skinFade: 110, // the seed skin fades out almost immediately (one shell)
  artIn: 190, // album art fades/scale-forms as the shell reaches its width
  waveIn: 230, // the waveform follows a beat later
  waveOut: 2700, // the waveform fades (shell still full)
  artOut: 2880, // the art fades
  closing: 3000, // the seed skin re-forms under the shell
  shrink: 3080, // COMPACT -> EMPTY: the shell begins shrinking
  returnMs: 3080, // SAME beat: the seed travels home WHILE shrinking
  done: 3400, // the seed dissolves at the word; unmount; idle
} as const;

/* The seed's travel spring: near-critical (damping ratio ~1.0) -
   magnetically pulled, no bounce, no float. Motion's ONLY job:
   POSITION. The Cult shell owns SIZE (its official 400/30 spring). */
const SEED_SPRING = {
  type: "spring" as const,
  stiffness: 500,
  damping: 42,
  mass: 0.8,
};

type Phase = "opening" | "open" | "closing" | "returning";

/**
 * The music egg as Apple's COMPACT Now Playing Dynamic Island:
 * a tiny pure-black pill (235x44) with album art at the LEADING edge,
 * a live waveform at the TRAILING edge, and intentional black void in
 * the center - the island wraps around the "camera region", it is NOT
 * a media card. No title, no artist, no expanded state in this pass.
 *
 * One visible object: the seed born at `music` IS the shell being
 * born - Motion carries the position while the Cult shell stretches
 * around the traveler, and the seed skin fades within ~110ms so there
 * is never a second black capsule underneath. Closing mirrors the
 * opening: the seed begins moving home at the exact beat the shell
 * starts shrinking. Lifecycle ~3.4s, one deterministic performance.
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
  // as the shell covers it, the content exit fades, and the MOVE+SHRINK
  // closing begins at the exact beat the shell contracts
  useEffect(() => {
    if (!origin || !stage || reduce) return;
    schedule(MUSIC_TIMING.skinFade, () => setPhase("open"));
    schedule(MUSIC_TIMING.waveOut, () => {
      const wave = document.querySelector(".dynamic-island-wave");
      if (wave) {
        wave.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 220, easing: "ease-in", fill: "forwards" });
      }
    });
    schedule(MUSIC_TIMING.artOut, () => {
      const art = document.querySelector(".dynamic-island-art");
      if (art) {
        art.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 200, easing: "ease-in", fill: "forwards" });
      }
    });
    schedule(MUSIC_TIMING.closing, () => setPhase("closing"));
    schedule(MUSIC_TIMING.returnMs, () => setPhase("returning")); // with the shrink
    schedule(MUSIC_TIMING.done, () => onDoneRef.current());
  }, [origin, stage, reduce, schedule]);

  const seedW = origin ? Math.max(36, Math.min(56, origin.w * 0.7)) : 46;
  const seedH = origin ? Math.max(18, Math.min(24, origin.h * 0.5)) : 22;
  const delta = useMemo(() => {
    if (!origin || !stage) return { x: 0, y: 0 };
    return { x: stage.x - origin.x, y: stage.y - origin.y };
  }, [origin, stage]);

  const island = <IslandInner onDone={onDone} />;

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
  // the trident portals). The Cult shell is mounted from the START:
  // Motion carries its position, Cult stretches its dimensions, and
  // the skin fades within ~110ms so only ONE black object exists.
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
 * The island itself: the official size machine driven by the reducer's
 * STABLE dispatch on the same absolute clock (never the cumulative
 * queue). ONE size transition in this pass: EMPTY -> COMPACT (the
 * Apple compact Now Playing form), then EMPTY again at the close.
 * Content is edge-aligned: art at the leading edge, waveform at the
 * trailing edge, intentful black void between them.
 */
function IslandInner({ onDone }: { onDone: () => void }) {
  const { state, dispatch } = useDynamicIslandSize();
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const onDoneRef = useRef(onDone);
  useEffect(() => {
    onDoneRef.current = onDone;
  }, [onDone]);
  void state.isAnimating;

  /* ONE absolute clock. The Cult queue's delays are cumulative and
     setSize gets re-created on every state change - so the reducer's
     stable dispatch drives the shell, exactly like the outer beats. */
  useEffect(() => {
    const at = (ms: number, fn: () => void) => timers.current.push(setTimeout(fn, ms));
    at(MUSIC_TIMING.expand, () => dispatch({ type: "SET_SIZE", newSize: SIZE_PRESETS.COMPACT }));
    at(MUSIC_TIMING.shrink, () => dispatch({ type: "SET_SIZE", newSize: SIZE_PRESETS.EMPTY }));
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
        <span className="island-row-content">
          <Image
            className="dynamic-island-art"
            src={favoriteSong.artwork}
            alt=""
            width={28}
            height={28}
            unoptimized
          />
          <span className="dynamic-island-wave" aria-hidden="true">
            <i />
            <i />
            <i />
            <i />
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