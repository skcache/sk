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

/* THE ONE ABSOLUTE CLOCK - the whole performance lives on this table.
   Every phase overlaps the next one: nothing pauses between states. */
const MUSIC_TIMING = {
  compact: 0, // the shell EMPTY -> COMPACT immediately: the tiny pill
  artIn: 120, // content begins appearing BEFORE the shell finishes
  waveIn: 170, //
  pressStart: 650, // the force-touch press begins (stored compression)
  pressRelease: 710, // ~45ms hold at full compression, then the POP
  bloom: 740, // shell expansion starts DURING the release pop
  metaIn: 840, // metadata begins before the shell is fully expanded
  progressIn: 900, //
  controlsIn: 960, //
  uiLeave: 2350, // expanded-only UI starts fading (200ms)
  collapse: 2430, // ~80ms later: the shell contracts WHILE UI fades
  fadeShared: 3150, // art + waveform begin fading (280ms)
  close: 3250, // pill shrinks + fades + slight scaleY, mirrored outro
  done: 3550, // unmount after the dissolve; idle. ~3.5s total.
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

/* the intro/outro fade + the force-touch press, both on the island's
   single outer wrapper (never the shell itself) */
const WRAP_FADE = { duration: 0.28, ease: "easeInOut" } as const;

/* the force-touch press: real stored compression - squashes (scaleX
   0.982 / scaleY 0.95 / y 1) held ~45ms, then a spring-SHAPED POP
   through ~1.008 -> ~1.0015 -> settle 1, while the shell blooms
   DURING the release. Keyframed so the rebound is VISIBLE: with a
   ~1.8% press amplitude, a true underdamped spring's overshoot is
   only ~0.0005 (mathematically invisible). PRESS -> POP. */
const PRESS_DOWN = { duration: 0.04, ease: "easeInOut" as const };
const PRESS_POP = {
  duration: 0.18,
  times: [0, 0.4, 0.75, 1],
  ease: ["easeOut", "easeInOut", "easeOut"] as ("easeOut" | "easeInOut")[],
} satisfies { duration: number; times: number[]; ease: ("easeOut" | "easeInOut")[] };

/* the UI unfold: quick, overlapping, eased out on entry and eased
   in-out on exit - all on the same duration so the pieces overlap
   into one continuous reveal (and one continuous dissolve) */
const UI_EASE: [number, number, number, number] = [0.22, 1, 0.36, 1];

/* the compact baseline (ACCEPTED - never redesigned) */
const COMPACT_FORM = {
  art: { left: 8, top: 8, width: 28, height: 28, borderRadius: 7 },
  wave: { right: 10, top: 13, height: 18 },
} as const;

/* the expanded Now Playing form: 335x132, Apple's own rhythm */
const EXPANDED_FORM = {
  art: { left: 16, top: 14, width: 46, height: 46, borderRadius: 10 },
  wave: { right: 17, top: 25, height: 24 },
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
  const sharedGone = phase === "closing"; // art/wave fade with the outro
  const artOpacity = sharedGone ? 0 : artIn ? 1 : 0;
  const waveOpacity = sharedGone ? 0 : waveIn ? 1 : 0;

  const island = (
    <IslandInner uiIn={uiIn} shared={shared} artOpacity={artOpacity} waveOpacity={waveOpacity} />
  );

  // ABSOLUTE inside the fixed stage: the island never participates in
  // flow, so the page/divider below NEVER moves. The wrapper fades the
  // whole object in (mirrored on the way out), hosts the force-touch
  // press, and applies the slight outro squash.
  const closing = phase === "closing";
  return (
    <div className="music-projectile">
      <motion.div
        className="music-island-press-wrap"
        initial={{ opacity: 0 }}
        animate={{
          opacity: closing ? 0 : 1,
          scaleX: pressed ? 0.982 : [0.982, 1.008, 1.0015, 1],
          scaleY: pressed ? 0.95 : closing ? 0.9 : [0.95, 1.006, 1.001, 1],
          y: pressed ? 1 : [1, 0.4, 0.1, 0],
        }}
        transition={{
          opacity: WRAP_FADE,
          scaleX: pressed ? PRESS_DOWN : PRESS_POP,
          scaleY: pressed ? PRESS_DOWN : closing ? WRAP_FADE : PRESS_POP,
          y: pressed ? PRESS_DOWN : PRESS_POP,
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
            transition={uiTransition(0.22)}
          >
            <span className="island-star">
              <svg width="21" height="21" viewBox="0 0 24 24" aria-hidden="true">
                <path
                  d="M12 3.8l2.5 5.05 5.6.82-4.05 3.95.95 5.57L12 16.35l-5.01 2.64.95-5.57-4.05-3.95 5.6-.82z"
                  fill="currentColor"
                />
              </svg>
            </span>
            <span className="island-controls-main">
              <svg width="25" height="25" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path d="M15 6 8.5 12l6.5 6" stroke="currentColor" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M21.5 6 15 12l6.5 6" stroke="currentColor" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              <svg className="island-control-play" width="30" height="30" viewBox="0 0 24 24" aria-hidden="true">
                <rect x="3.5" y="2.5" width="6.5" height="19" rx="2.6" fill="currentColor" />
                <rect x="14" y="2.5" width="6.5" height="19" rx="2.6" fill="currentColor" />
              </svg>
              <svg width="25" height="25" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path d="M9 6l6.5 6L9 18" stroke="currentColor" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M15 6l6.5 6L15 18" stroke="currentColor" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </span>
            <span className="island-airplay">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path d="M5.6 8.4a8.4 8.4 0 0 1 12.8 0" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
                <path d="M8.3 10.9a5.2 5.2 0 0 1 7.4 0" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
                <path d="M10.4 12.7a2.6 2.6 0 0 1 3.2 0" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
                <path
                  d="M12 11.4c.78 0 1.5.38 1.94 1L17.4 16.5c.5.62.07 1.6-.7 1.6H7.3c-.78 0-1.2-.98-.7-1.6L10.06 12.4c.44-.62 1.16-1 1.94-1z"
                  fill="currentColor"
                />
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