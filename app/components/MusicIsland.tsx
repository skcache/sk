"use client";

import { useCallback, useEffect, useRef, useState } from "react";
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
 * THE MUSIC DYNAMIC ISLAND - one physical black object that lives in
 * the whitespace below the intro. There is NO word->stage travel: the
 * island simply appears in place, mirrors its entrance and exit, and
 * plays compact -> press -> expanded -> relax -> compact -> gone.
 *
 * Intro/outro are mirrored (both ~250-300ms): a tiny centered pill
 * grows into the 235x44 compact while fading in; the compact shrinks
 * back to the tiny pill while fading out.
 *
 * ONE OWNER PER PROPERTY:
 *   - the Cult shell owns width / height / borderRadius (its official
 *     spring: stiffness 400, damping 30)
 *   - Motion owns EVERYTHING else: the intro/outro fade, the tactile
 *     press cue, the art + waveform relocation/scale (on the SAME
 *     spring as the shell), and the expanded-content opacity/offset
 *
 * The album art, the waveform, and the expanded UI are ALWAYS MOUNTED,
 * the same DOM elements from first frame to last. No CSS keyframes or
 * imperative animation calls exist for the choreography - React state
 * flips motion targets and Motion resolves the physics. CSS is static
 * styling only, except the repeating waveform pulse.
 */

/* THE ONE ABSOLUTE CLOCK - the whole performance lives on this table */
const MUSIC_TIMING = {
  compact: 0, // the shell EMPTY -> COMPACT immediately: the tiny pill
  artIn: 140, // album art fades in as the compact takes shape
  waveIn: 200, // waveform drifts in after it
  pressStart: 780, // the tactile press begins (scale 1 -> .985)
  pressRelease: 840, // the release - the bloom starts while it returns
  bloom: 840, // press release + expansion = ONE gesture, same beat
  uiLeave: 2680, // expanded-only UI fades while the shell relaxes
  collapse: 2680, // the same shell contracts; art + wave return with it
  close: 3520, // compact -> EMPTY + the whole object fades out (mirror)
  done: 3800, // unmount after the fade completes; idle. ~3.8s total.
} as const;

/* the exit curve: eased in-out (cubic-bezier(0.4, 0, 0.2, 1)) -
   never a cheap ease-in tail */
const EXIT_EASE: [number, number, number, number] = [0.4, 0, 0.2, 1];

/* THE shared spring for every shared-element relocation - the exact
   physics of the Cult shell (stiffness 400 / damping 30, mass 1), so
   the shell, the art, and the waveform accelerate and settle as ONE
   object instead of three systems with three different curves. */
const SHELL_SPRING = {
  type: "spring" as const,
  stiffness: 400,
  damping: 30,
  mass: 1,
};

/* the intro/outro fade + the tiny physical press, both on the island's
   single outer wrapper (never the shell itself) */
const WRAP_FADE = { duration: 0.28, ease: "easeInOut" } as const;

/* the UI unfold: quick, overlapping, eased out on entry and eased
   in-out on exit - all on the same duration so the pieces overlap
   into one continuous reveal (and one continuous dissolve) */
const UI_EASE: [number, number, number, number] = [0.22, 1, 0.36, 1];

/* the compact baseline (ACCEPTED - never redesigned) */
const COMPACT_FORM = {
  art: { left: 8, top: 8, width: 28, height: 28, borderRadius: 7 },
  wave: { right: 10, top: 13, height: 18 },
} as const;

/* the expanded Now Playing form: snug 345x112, tightly arranged */
const EXPANDED_FORM = {
  art: { left: 15, top: 14, width: 48, height: 48, borderRadius: 11 },
  wave: { right: 16, top: 19, height: 22 },
} as const;

type Phase = "opening" | "compact" | "expanded" | "compactClosing" | "closing";

/**
 * The music egg: ONE black object that physically becomes
 * tiny pill -> COMPACT Dynamic Island -> (press) -> EXPANDED Now
 * Playing island -> COMPACT -> tiny pill, without breaking the
 * illusion - mirrored intro and outro.
 *
 * The island renders IN FLOW inside the interaction stage (the fixed
 * whitespace below the intro), 24px below the intro paragraph - there
 * is no seed travel, no portal, nothing flies out of the word. The
 * expanded form stays comfortably above the divider.
 */
export default function MusicIsland({ onDone }: { onDone: () => void }) {
  return (
    <DynamicIslandProvider initialSize={SIZE_PRESETS.EMPTY}>
      <MusicBody onDone={onDone} />
    </DynamicIslandProvider>
  );
}

function MusicBody({ onDone }: { onDone: () => void }) {
  const reduce = useReducedMotion();
  // reduced motion: the island shows its compact form in place - no
  // press, no bloom, no UI - and fades out on schedule
  const [phase, setPhase] = useState<Phase>(reduce ? "compact" : "opening");
  const [uiIn, setUiIn] = useState(false);
  const [pressed, setPressed] = useState(false);
  const [artIn, setArtIn] = useState(reduce);
  const [waveIn, setWaveIn] = useState(reduce);
  const onDoneRef = useRef(onDone);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  useEffect(() => {
    onDoneRef.current = onDone;
  }, [onDone]);

  const schedule = useCallback((ms: number, fn: () => void) => {
    timers.current.push(setTimeout(fn, ms));
  }, []);

  // the whole performance on the ONE absolute clock: content
  // entrances, press, bloom + UI unfold, UI exit, collapse, and the
  // mirrored fade-out. No cumulative delays.
  useEffect(() => {
    if (reduce) {
      schedule(MUSIC_TIMING.done, () => onDoneRef.current());
      return;
    }
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
    schedule(MUSIC_TIMING.close, () => setPhase("closing"));
    schedule(MUSIC_TIMING.done, () => onDoneRef.current());
    return () => {
      timers.current.forEach(clearTimeout);
      timers.current = [];
    };
  }, [reduce, schedule]);

  // derived motion signals - plain booleans, no per-beat state
  const shared = phase === "expanded"; // art + waveform at the expanded placement
  const artOpacity = artIn ? 1 : 0;
  const waveOpacity = waveIn ? 1 : 0;

  const island = (
    <IslandInner uiIn={uiIn} shared={shared} artOpacity={artOpacity} waveOpacity={waveOpacity} />
  );

  // IN FLOW: the island lives in the stage's whitespace, 24px below
  // the intro. The stage is fixed-height and invisible; the island is
  // its only content, so the page never moves. The wrapper fades the
  // whole object in (mirrored on the way out) and hosts the press.
  return (
    <div className="music-projectile">
      <motion.div
        className="music-island-press-wrap"
        initial={{ opacity: 0 }}
        animate={{ opacity: phase === "closing" ? 0 : 1, scale: pressed ? 0.985 : 1 }}
        transition={{
          opacity: WRAP_FADE,
          scale: { duration: pressed ? 0.06 : 0.07, ease: "easeInOut" },
        }}
      >
        {island}
      </motion.div>
    </div>
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
    at(MUSIC_TIMING.close, () => dispatch({ type: "SET_SIZE", newSize: SIZE_PRESETS.EMPTY }));
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
        {/* the album art: ONE element from first frame to last - it
            physically resizes and relocates on the shell's spring */}
        <motion.div
          className="dynamic-island-art"
          initial={false}
          animate={
            shared
              ? { ...EXPANDED_FORM.art, opacity: artOpacity }
              : { ...COMPACT_FORM.art, opacity: artOpacity }
          }
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
            transition={uiTransition(0.18)}
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
            transition={uiTransition(0.24)}
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

        {/* the live waveform: ONE element from first frame to last -
            it moves to the expanded trailing slot on the shell's
            spring */}
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