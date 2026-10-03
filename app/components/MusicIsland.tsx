"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Image from "next/image";
import { motion, useReducedMotion } from "motion/react";
import { favoriteSong } from "../config/favorite-song";
import {
  DynamicIsland,
  DynamicIslandProvider,
  useDynamicIslandSize,
  SIZE_PRESETS,
} from "./kit/dynamic-island";

/**
 * THE MUSIC DYNAMIC ISLAND - one physical black object.
 *
 * SEED -> COMPACT island -> (press) -> EXPANDED Now Playing island ->
 * COMPACT -> SEED, ~5.0s, one deterministic performance per click.
 *
 * ONE OWNER PER PROPERTY:
 *   - the Cult shell owns width / height / borderRadius (its official
 *     spring: stiffness 400, damping 30)
 *   - Motion owns EVERYTHING else: the seed travel, the tactile press
 *     cue, the art + waveform relocation/scale (on the SAME spring as
 *     the shell), and the expanded-content opacity/offset
 *
 * The album art, the waveform, and the expanded UI are ALWAYS MOUNTED,
 * the SAME DOM elements from seed to seed. There are no CSS keyframes
 * and no imperative animation calls in this file - React state flips
 * motion targets and Motion resolves the physics.
 */

/* THE ONE ABSOLUTE CLOCK - the whole performance lives on this table */
const MUSIC_TIMING = {
  compact: 70, // the shell starts widening while the seed is still gliding
  skinFade: 130, // the seed skin dissolves - one visible object remains
  artIn: 200, // the album art fades in as the shell reaches its width
  waveIn: 280, // the waveform drifts in after it
  pressStart: 900, // the tactile press cue begins (scale 1 -> .985)
  pressRelease: 960, // the release - the bloom starts while it returns to 1
  bloom: 970, // the SAME shell blooms into MUSIC_EXPANDED
  uiLeave: 3400, // expanded-only content begins fading (shell still full)
  collapse: 3520, // the same shell contracts; art + waveform return with it
  fadeShared: 4370, // art + waveform begin fading (80ms before the move)
  returnMs: 4450, // MOVE + SHRINK: EMPTY + travel home begin together
  dissolve: 4750, // the seed fades into the word (opacity 1 -> 0)
  done: 4960, // unmount after the dissolve; idle. Lifecycle ~5.0s.
} as const;

/* the exit curve: eased in-out (cubic-bezier(0.4, 0, 0.2, 1)) -
   never a cheap ease-in tail */
const EXIT_EASE: [number, number, number, number] = [0.4, 0, 0.2, 1];

/* THE shared spring for every shared-element relocation. This is the
   exact physics of the Cult shell (stiffness 400 / damping 30, mass 1)
   so the shell, the art, and the waveform accelerate and settle as ONE
   object instead of three systems with three different curves. */
const SHELL_SPRING = {
  type: "spring" as const,
  stiffness: 400,
  damping: 30,
  mass: 1,
};

/* the seed travel: near-critical, magnetically pulled - no bounce */
const SEED_SPRING = {
  type: "spring" as const,
  stiffness: 500,
  damping: 42,
  mass: 0.8,
};

/* the UI unfold: quick, overlapping, eased out on entry and eased
   in-out on exit - all on the same duration so the pieces overlap
   into one continuous reveal (and one continuous dissolve) */
const UI_EASE: [number, number, number, number] = [0.22, 1, 0.36, 1];

const COMPACT_FORM = {
  art: { left: 8, top: 8, width: 28, height: 28, borderRadius: 7 },
  wave: { right: 10, top: 13, height: 18 },
} as const;

const EXPANDED_FORM = {
  art: { left: 15, top: 14, width: 48, height: 48, borderRadius: 11 },
  wave: { right: 16, top: 20, height: 24 },
} as const;

type Phase = "opening" | "compact" | "expanded" | "compactClosing" | "returning" | "dissolve";

const seedSpringFor = { x: SEED_SPRING, y: SEED_SPRING } as const;

/**
 * The music egg: ONE black object that physically becomes
 * SEED -> COMPACT Dynamic Island -> EXPANDED Now Playing island ->
 * COMPACT -> SEED, without ever breaking the illusion.
 *
 * Compact is the ACCEPTED baseline (235x44, pure black, art leading,
 * waveform trailing, black void center - no metadata). The expansion
 * blooms the SAME shell and simply moves/resizes the SAME art and
 * waveform elements on the shell's own spring. The expanded view adds
 * Kick / Future, a thin static progress rail with mock times, and
 * three visual-only transport controls plus an output glyph.
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
  const [uiIn, setUiIn] = useState(false);
  const [pressed, setPressed] = useState(false);
  const [artIn, setArtIn] = useState(false);
  const [waveIn, setWaveIn] = useState(false);
  const [sharedFading, setSharedFading] = useState(false);
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
        // reduced motion: the island appears at the stage center and
        // simply lives its schedule in place - no travel, no skin
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

  // the whole performance on the ONE absolute clock: the skin, the
  // shared-element entrances, the press cue, the bloom + UI unfold,
  // the UI exit, the collapse, the shared fades, and the return home.
  // No cumulative delays - every beat is an absolute offset from t0.
  useEffect(() => {
    if (!origin || !stage || reduce) return;
    schedule(MUSIC_TIMING.skinFade, () => setPhase("compact"));
    schedule(MUSIC_TIMING.artIn, () => setArtIn(true));
    schedule(MUSIC_TIMING.waveIn, () => setWaveIn(true));
    schedule(MUSIC_TIMING.pressStart, () => setPressed(true));
    schedule(MUSIC_TIMING.pressRelease, () => setPressed(false));
    schedule(MUSIC_TIMING.bloom, () => {
      setPhase("expanded");
      setUiIn(true);
    });
    schedule(MUSIC_TIMING.uiLeave, () => setUiIn(false));
    schedule(MUSIC_TIMING.collapse, () => setPhase("compactClosing"));
    schedule(MUSIC_TIMING.fadeShared, () => setSharedFading(true));
    schedule(MUSIC_TIMING.returnMs, () => setPhase("returning"));
    schedule(MUSIC_TIMING.dissolve, () => setPhase("dissolve"));
    schedule(MUSIC_TIMING.done, () => onDoneRef.current());
  }, [origin, stage, reduce, schedule]);

  const seedW = origin ? Math.max(36, Math.min(56, origin.w * 0.7)) : 46;
  const seedH = origin ? Math.max(18, Math.min(24, origin.h * 0.5)) : 22;
  const delta = useMemo(() => {
    if (!origin || !stage) return { x: 0, y: 0 };
    return { x: stage.x - origin.x, y: stage.y - origin.y };
  }, [origin, stage]);

  // derived motion signals - plain booleans, no per-beat state
  const shared = phase === "expanded"; // art + waveform at the expanded placement
  const sharedGone = sharedFading || phase === "returning" || phase === "dissolve";
  const artOpacity = reduce ? 1 : sharedGone ? 0 : artIn ? 1 : 0;
  const waveOpacity = reduce ? 1 : sharedGone ? 0 : waveIn ? 1 : 0;
  const skinOpacity = phase === "opening" || phase === "returning" ? 1 : 0;

  const island = (
    <IslandInner uiIn={uiIn} shared={shared} artOpacity={artOpacity} waveOpacity={waveOpacity} />
  );

  // reduced motion: the island simply appears at the stage center and
  // lives its schedule in place - no travel, no skin
  if (reduce) {
    if (!stage) return null;
    return (
      <div
        className="music-projectile is-reduced"
        style={{ left: stage.x - seedW / 2, top: stage.y - seedH / 2, width: seedW, height: seedH }}
      >
        <span className="music-projectile-island">{island}</span>
      </div>
    );
  }

  if (!origin || !stage) return null;

  // PORTAL to the body: the page's reveal wrappers carry transforms,
  // which would turn position:fixed into a stage-relative offset - the
  // seed must live in TRUE viewport coordinates (the same reason the
  // trident portals). The Cult shell is mounted from the START: Motion
  // carries its position, Cult stretches its dimensions, and the skin
  // dissolves within ~130ms so only ONE black object exists.
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
        phase === "returning" || phase === "dissolve" ? { x: 0, y: 0 } : { x: delta.x, y: delta.y }
      }
      transition={seedSpringFor}
    >
      <motion.span
        className="music-seed-skin"
        aria-hidden="true"
        initial={false}
        animate={{ opacity: skinOpacity }}
        transition={{ duration: 0.18, ease: "easeInOut" }}
      />
      <span className="music-projectile-island">
        {/* the ONLY extra wrapper: the tactile press cue. The shell
            itself is never touched by imperative animation. */}
        <motion.div
          className="music-island-press-wrap"
          initial={false}
          animate={{ scale: pressed ? 0.985 : 1 }}
          transition={{ duration: pressed ? 0.055 : 0.07, ease: "easeInOut" }}
        >
          {island}
        </motion.div>
      </span>
    </motion.div>,
    document.body
  );
}

type IslandProps = {
  uiIn: boolean;
  shared: boolean;
  artOpacity: number;
  waveOpacity: number;
};

/**
 * The island itself: the official Cult size machine driven by the
 * reducer's STABLE dispatch on the same absolute clock. The SAME shell
 * moves COMPACT -> MUSIC_EXPANDED -> COMPACT -> EMPTY. The album art,
 * the waveform, and the expanded UI are ALWAYS MOUNTED; the expanded
 * form simply moves the shared elements and fades the UI in. Nothing
 * here is conditionally rendered except by way of motion targets.
 */
function IslandInner({ uiIn, shared, artOpacity, waveOpacity }: IslandProps) {
  const { dispatch } = useDynamicIslandSize();
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  /* ONE absolute clock for the shell states too - the Cult queue's
     delays are cumulative and setSize gets re-created on every state
     change, so the reducer's stable dispatch drives the shell. */
  useEffect(() => {
    const at = (ms: number, fn: () => void) => timers.current.push(setTimeout(fn, ms));
    at(MUSIC_TIMING.compact, () => dispatch({ type: "SET_SIZE", newSize: SIZE_PRESETS.COMPACT }));
    at(MUSIC_TIMING.bloom, () => dispatch({ type: "SET_SIZE", newSize: SIZE_PRESETS.MUSIC_EXPANDED }));
    at(MUSIC_TIMING.collapse, () => dispatch({ type: "SET_SIZE", newSize: SIZE_PRESETS.COMPACT }));
    at(MUSIC_TIMING.returnMs, () => dispatch({ type: "SET_SIZE", newSize: SIZE_PRESETS.EMPTY }));
    return () => {
      timers.current.forEach(clearTimeout);
      timers.current = [];
    };
  }, [dispatch]);

  // the UI unfold: quick, overlapping, eased out on entry and eased
  // in-out on exit - all on the same duration so the pieces overlap
  // into one continuous reveal (and one continuous dissolve)
  const uiTransition = (delay: number) => ({
    duration: 0.2,
    ease: uiIn ? UI_EASE : EXIT_EASE,
    delay: uiIn ? delay : 0,
  });

  return (
    <DynamicIsland
      id="music-stage-island"
      className="music-island-shell mx-auto h-0 w-0 shrink-0 items-center justify-center border text-center text-ink"
    >
      <span className="island-row-content">
        {/* the album art: ONE element from seed to seed - it physically
            resizes and relocates on the shell's own spring */}
        <motion.div
          className="dynamic-island-art"
          initial={false}
          animate={shared ? { ...EXPANDED_FORM.art, opacity: artOpacity } : { ...COMPACT_FORM.art, opacity: artOpacity }}
          transition={{
            left: SHELL_SPRING,
            top: SHELL_SPRING,
            width: SHELL_SPRING,
            height: SHELL_SPRING,
            borderRadius: SHELL_SPRING,
            opacity: { duration: 0.3, ease: UI_EASE },
          }}
        >
          <Image src={favoriteSong.artwork} alt="" width={48} height={48} unoptimized />
        </motion.div>

        {/* the expanded-only Now Playing content: ALWAYS MOUNTED, so
            the fade is a real continuous dissolve - no mount pop, no
            unmount pop, no phase boundary */}
        <span className="island-expanded-ui" aria-hidden="true">
          <motion.span
            className="island-expanded-meta"
            initial={false}
            animate={{ opacity: uiIn ? 1 : 0, y: uiIn ? 0 : 5 }}
            transition={uiTransition(0.11)}
          >
            <span className="island-expanded-title">{favoriteSong.title}</span>
            <span className="island-expanded-artist">{favoriteSong.artist}</span>
          </motion.span>
          <motion.span
            className="island-progress-row"
            initial={false}
            animate={{ opacity: uiIn ? 1 : 0, y: uiIn ? 0 : 4 }}
            transition={uiTransition(0.19)}
          >
            <span className="island-time">1:20</span>
            <span className="island-progress">
              <i className="island-progress-fill" />
              <i className="island-progress-thumb" />
            </span>
            <span className="island-time">-0:45</span>
          </motion.span>
          <motion.span
            className="island-controls"
            initial={false}
            animate={{ opacity: uiIn ? 1 : 0, y: uiIn ? 0 : 4 }}
            transition={uiTransition(0.25)}
          >
            <span className="island-controls-main">
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                <path d="M3.5 2.5v11" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
                <path d="M5 8l7.5-5.5v11z" fill="currentColor" />
              </svg>
              <svg width="15" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                <rect x="4" y="2.5" width="3" height="11" rx="1.3" fill="currentColor" />
                <rect x="9" y="2.5" width="3" height="11" rx="1.3" fill="currentColor" />
              </svg>
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                <path d="M12.5 2.5v11" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
                <path d="M11 8l-7.5-5.5v11z" fill="currentColor" />
              </svg>
            </span>
            <span className="island-airplay">
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                <path
                  d="M3.2 10.6V5.6c0-.77.63-1.4 1.4-1.4h6.8c.77 0 1.4.63 1.4 1.4v5"
                  stroke="currentColor"
                  strokeWidth="1.3"
                  strokeLinecap="round"
                />
                <path d="M8 9.6l3.1 4H4.9z" fill="currentColor" />
              </svg>
            </span>
          </motion.span>
        </span>

        {/* the live waveform: ONE element from seed to seed - it moves
            to the expanded trailing slot on the shell's own spring */}
        <motion.span
          className="dynamic-island-wave"
          aria-hidden="true"
          initial={false}
          animate={
            shared
              ? { ...EXPANDED_FORM.wave, opacity: waveOpacity }
              : { ...COMPACT_FORM.wave, opacity: waveOpacity }
          }
          transition={{
            right: SHELL_SPRING,
            top: SHELL_SPRING,
            height: SHELL_SPRING,
            opacity: { duration: 0.32, ease: "easeInOut" },
          }}
        >
          <i />
          <i />
          <i />
          <i />
          <i />
          <i />
          <i />
          <i />
        </motion.span>
      </span>
    </DynamicIsland>
  );
}