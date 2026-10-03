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

/* THE ONE ABSOLUTE CLOCK. The whole ~5.2s performance lives here:
   press -> seed born at the word -> it moves toward the stage WHILE
   the shell widens -> COMPACT (235x44) forms and holds -> a tiny
   physical press cue -> the SAME black shell BLOOMS into the real
   EXPANDED Now Playing form (371x148) -> Kick / Future / progress /
   controls unfold -> ~2.3s hold -> the expanded-only content leaves
   -> the same shell contracts back to the EXACT compact state ->
   compact holds briefly -> the shell shrinks AND travels home at the
   same beat -> the seed dissolves into the word -> idle.
   One clock for the Cult states, the content beats, and the travel. */
const MUSIC_TIMING = {
  expand: 70, // the shell starts widening while the seed is still moving
  skinFade: 110, // the seed skin fades out (one visible object)
  artIn: 200, // album art CSS entrance delay (mounts with the shell)
  waveIn: 280, // waveform CSS entrance delay
  compactAt: 350, // COMPACT fully formed
  press: 1000, // the tactile press cue (130ms, scale 1 -> .975 -> 1)
  bloom: 1080, // the shell BLOOMS into MUSIC_EXPANDED
  metaIn: 1180, // title / artist unfold
  progressIn: 1270, // the progress rail appears
  controlsIn: 1340, // the controls resolve
  expandedHold: 3750, // expanded-only content begins leaving (~200ms)
  collapse: 3920, // MUSIC_EXPANDED -> COMPACT (same shell, art/wave move with it)
  compactHold: 4250, // the exact compact state is restored and held
  returnMs: 4850, // MOVE + SHRINK: fades + EMPTY + travel home begin together
  dissolve: 5100, // the seed fades into the word (240ms, no pop)
  done: 5340, // unmount AFTER the dissolve; idle
} as const;

/* the exit fade: long and eased in-out - never a cheap ease-in tail */
const EXIT_EASE = "cubic-bezier(0.4, 0, 0.2, 1)";

/* The seed's travel spring: near-critical (damping ratio ~1.0) -
   magnetically pulled, no bounce, no float. Motion's ONLY job:
   POSITION. The Cult shell owns SIZE (its official 400/30 spring). */
const SEED_SPRING = {
  type: "spring" as const,
  stiffness: 500,
  damping: 42,
  mass: 0.8,
};

type Phase = "opening" | "compact" | "expanded" | "compactClosing" | "returning" | "dissolve";

/**
 * The music egg: ONE black object that physically becomes
 * SEED -> COMPACT Dynamic Island -> EXPANDED Now Playing island ->
 * COMPACT -> SEED, without ever breaking the illusion.
 *
 * Compact is the ACCEPTED baseline (235x44, pure black, art leading,
 * waveform trailing, black void center - no title/artist). The
 * expansion blooms the SAME shell, and the album art + waveform are
 * the SAME DOM elements the whole time - they reposition/resize with
 * the shell. The expanded view adds Kick / Future, a thin progress
 * rail, and three visual-only transport controls.
 *
 * Motion owns position; the Cult shell owns dimensions; the seed skin
 * fades within ~110ms so there is never a second black object.
 * Lifecycle ~5.3s, one deterministic performance per click.
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
        // in place (compact -> expanded -> compact), then fades clean
        setPhase("compact");
        schedule(MUSIC_TIMING.done, () => onDoneRef.current());
      }
    });
    return () => {
      cancelAnimationFrame(id);
      timers.current.forEach(clearTimeout);
      timers.current = [];
    };
  }, [reduce, schedule]);

  // the outer choreography on the SAME absolute clock: phases, the
  // press cue, the expanded-content exit, and the MOVE+SHRINK closing
  useEffect(() => {
    if (!origin || !stage || reduce) return;
    schedule(MUSIC_TIMING.skinFade, () => setPhase("compact"));
    schedule(MUSIC_TIMING.bloom, () => setPhase("expanded"));
    schedule(MUSIC_TIMING.press, () => {
      const shell = document.querySelector(".music-island-shell");
      if (!shell) return;
      shell.animate(
        [
          { transform: "scale(1)" },
          { transform: "scale(0.975)", offset: 0.5 },
          { transform: "scale(1)" },
        ],
        { duration: 130, easing: "ease-in-out" }
      );
    });
    schedule(MUSIC_TIMING.expandedHold, () => {
      const ui = document.querySelector(".island-expanded-ui");
      if (ui) {
        ui.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 200, easing: EXIT_EASE, fill: "forwards" });
      }
    });
    schedule(MUSIC_TIMING.collapse, () => setPhase("compactClosing"));
    schedule(MUSIC_TIMING.returnMs, () => {
      setPhase("returning"); // MOVE + SHRINK: the travel begins with the shell's EMPTY
      const wave = document.querySelector(".dynamic-island-wave");
      if (wave) {
        wave.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 300, easing: EXIT_EASE, fill: "forwards" });
      }
      const art = document.querySelector(".dynamic-island-art");
      if (art) {
        art.animate(
          [{ opacity: 1, transform: "translateY(-50%) scale(1)" }, { opacity: 0, transform: "translateY(-50%) scale(0.94)" }],
          { duration: 300, easing: EXIT_EASE, fill: "forwards" }
        );
      }
    });
    schedule(MUSIC_TIMING.dissolve, () => setPhase("dissolve"));
    schedule(MUSIC_TIMING.done, () => onDoneRef.current());
  }, [origin, stage, reduce, schedule]);

  const seedW = origin ? Math.max(36, Math.min(56, origin.w * 0.7)) : 46;
  const seedH = origin ? Math.max(18, Math.min(24, origin.h * 0.5)) : 22;
  const delta = useMemo(() => {
    if (!origin || !stage) return { x: 0, y: 0 };
    return { x: stage.x - origin.x, y: stage.y - origin.y };
  }, [origin, stage]);

  const island = <IslandInner phase={phase} />;

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
        phase === "opening" || phase === "compact" || phase === "expanded" || phase === "compactClosing"
          ? { x: delta.x, y: delta.y }
          : { x: 0, y: 0 }
      }
      transition={SEED_SPRING}
    >
      <span
        className="music-seed-skin"
        aria-hidden="true"
        style={{
          opacity:
            phase === "compact" || phase === "expanded" || phase === "compactClosing" || phase === "dissolve"
              ? 0
              : 1,
        }}
      />
      <span className="music-projectile-island">{island}</span>
    </motion.div>,
    document.body
  );
}

/**
 * The island itself: the official size machine driven by the reducer's
 * STABLE dispatch on the same absolute clock (never the cumulative
 * queue). The SAME shell moves COMPACT -> MUSIC_EXPANDED -> COMPACT ->
 * EMPTY; the compact art + waveform are the SAME elements throughout
 * and simply reposition when the shell blooms. The expanded UI
 * (title/artist/progress/controls) mounts only for the expanded phase.
 */
function IslandInner({ phase }: { phase: Phase }) {
  const { state, dispatch } = useDynamicIslandSize();
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  void state.isAnimating;

  /* ONE absolute clock. The Cult queue's delays are cumulative and
     setSize gets re-created on every state change - so the reducer's
     stable dispatch drives the shell, exactly like the outer beats. */
  useEffect(() => {
    const at = (ms: number, fn: () => void) => timers.current.push(setTimeout(fn, ms));
    at(MUSIC_TIMING.expand, () => dispatch({ type: "SET_SIZE", newSize: SIZE_PRESETS.COMPACT }));
    at(MUSIC_TIMING.bloom, () => dispatch({ type: "SET_SIZE", newSize: SIZE_PRESETS.MUSIC_EXPANDED }));
    at(MUSIC_TIMING.collapse, () => dispatch({ type: "SET_SIZE", newSize: SIZE_PRESETS.COMPACT }));
    at(MUSIC_TIMING.returnMs, () => dispatch({ type: "SET_SIZE", newSize: SIZE_PRESETS.EMPTY }));
    return () => {
      timers.current.forEach(clearTimeout);
      timers.current = [];
    };
  }, [dispatch]);

  const expanded = phase === "expanded";

  return (
    <DynamicIsland
      id="music-stage-island"
      className="music-island-shell mx-auto h-0 w-0 shrink-0 items-center justify-center border text-center text-ink"
    >
      <DynamicContainer className="dynamic-island-row">
        <span className={`island-row-content${expanded ? " is-expanded" : ""}`}>
          <Image
            className="dynamic-island-art"
            src={favoriteSong.artwork}
            alt=""
            width={28}
            height={28}
            unoptimized
          />
          {expanded && (
            <span className="island-expanded-ui">
              <span className="island-expanded-meta">
                <span className="island-expanded-title">{favoriteSong.title}</span>
                <span className="island-expanded-artist">{favoriteSong.artist}</span>
              </span>
              <span className="island-progress" aria-hidden="true">
                <i className="island-progress-fill" />
              </span>
              <span className="island-controls" aria-hidden="true">
                <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                  <path d="M3.5 2.5v11" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
                  <path d="M5 8l7.5-5.5v11z" fill="currentColor" />
                </svg>
                <svg width="17" height="17" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                  <path d="M4.5 2.5l9 5.5-9 5.5z" fill="currentColor" />
                </svg>
                <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                  <path d="M12.5 2.5v11" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
                  <path d="M11 8l-7.5-5.5v11z" fill="currentColor" />
                </svg>
              </span>
            </span>
          )}
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