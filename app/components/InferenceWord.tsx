"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import ReasoningOrb, { type ReasoningState } from "./ReasoningOrb";
import TactileWord from "./TactileWord";

const THINK_MS = 2500; // the word visibly thinks, then returns

// randomized reasoning states: a fresh spinner picks one per activation
const INFER_ORB_STATES: ReasoningState[] = [
  "solving",
  "working",
  "searching",
  "weaving",
  "composing",
  "breathing",
];
const pickOrbState = (): ReasoningState =>
  INFER_ORB_STATES[Math.floor(Math.random() * INFER_ORB_STATES.length)];

/**
 * Signature interaction: "inference" becomes a tiny thinking process.
 *
 * hard press -> the word becomes ONE inline status unit: a single
 * lowercase `thinking` word with a soft light glow sweeping left ->
 * right across the letters, plus a crisp 22px reasoning spinner 3px
 * beside it. The text resolves THROUGH a blur into focus while the
 * cell springs open, CLIPPING the spinner so it is revealed smoothly
 * from behind the word's edge; the spinner works for ~2.5s, then the
 * unit retracts (spinner clipped away) and the word returns. No trailing marker - the
 * return is the resolution.
 *
 * Deterministic: the orb state is ALWAYS "solving" and the glow is a
 * fixed CSS sweep, so every accepted activation replays the exact
 * same choreography; activation is IGNORED while already thinking
 * (no timeout reset, no partial restart). The next click after idle
 * runs the identical sequence.
 *
 * Layout: no permanent reservation. Two invisible probes measure the
 * real widths of "inference" and "Thinking + orb"; a Motion spring
 * animates the live cell between those widths only while active, so
 * at rest the button is exactly word-sized (no dead gap, no oversized
 * focus ring) and the surrounding prose shifts smoothly by only a few
 * pixels during the deliberate interaction. The cell clips its
 * content, so the orb can structurally never overlap "systems".
 *
 * Reduced motion: instant static swap "inference"/"Thinking" + a
 * frozen orb for the hold, no morph travel.
 */
export default function InferenceWord() {
  const reduceMotion = useReducedMotion();
  const [phase, setPhase] = useState<"idle" | "thinking">("idle");
  const [orbState, setOrbState] = useState<ReasoningState>("solving");
  const safety = useRef<ReturnType<typeof setTimeout>[]>([]);

  const [widths, setWidths] = useState<{ idle: number; active: number } | null>(null);
  const idleProbe = useRef<HTMLSpanElement>(null);
  const activeProbe = useRef<HTMLSpanElement>(null);

  // measure before first paint so there is never a max-content flash
  useLayoutEffect(() => {
    let mounted = true;
    const measure = () => {
      if (mounted && idleProbe.current && activeProbe.current) {
        setWidths({
          idle: idleProbe.current.offsetWidth,
          active: activeProbe.current.offsetWidth,
        });
      }
    };
    measure();
    document.fonts.ready.then(measure).catch(() => {});
    const ro = new ResizeObserver(measure);
    if (idleProbe.current) ro.observe(idleProbe.current);
    if (activeProbe.current) ro.observe(activeProbe.current);
    return () => {
      mounted = false;
      ro.disconnect();
    };
  }, []);

  const clearSafety = useCallback(() => {
    safety.current.forEach(clearTimeout);
    safety.current = [];
  }, []);

  const activate = useCallback(() => {
    // ignore activations while already thinking - no timeout reset,
    // no partial restart; the next click replays the full run
    if (phase === "thinking") return;
    clearSafety();
    setOrbState(pickOrbState()); // randomized reasoning state per run
    setPhase("thinking");
    safety.current = [
      setTimeout(() => {
        setPhase("idle");
        safety.current = [];
      }, THINK_MS),
    ];
  }, [phase, clearSafety]);

  useEffect(() => clearSafety, [clearSafety]);

  const quick = reduceMotion ? { duration: 0.01 } : undefined;

  // width spring: deliberate, near-critical, no bounce
  const widthT = quick ?? { type: "spring" as const, stiffness: 480, damping: 40, mass: 0.85 };

  return (
    <TactileWord label="inference" onActivate={activate} className="word-morph-btn">
      <span className="word-morph">
        {/* measurement probes: absolute, invisible, zero layout weight.
            the flex probe mirrors the live unit incl. the 3px gap */}
        <span ref={idleProbe} className="word-morph-probe" aria-hidden="true">
          inference
        </span>
        <span
          ref={activeProbe}
          className="word-morph-probe word-morph-probe-flex"
          aria-hidden="true"
        >
          <span>thinking</span>
          <span className="orb-22" aria-hidden="true">
            <ReasoningOrb state="solving" paused={!!reduceMotion} />
          </span>
        </span>

        {/* the live cell: width springs between the two measured widths,
            clipped so the orb is revealed/retracted by the growing box.
            pre-measure it renders as a plain word-sized cell (no flash) */}
        {widths ? (
          <motion.span
            className="word-morph-cell"
            initial={false}
            animate={{
              width: phase === "thinking" ? widths.active : widths.idle,
            }}
            transition={widthT}
          >
            {/* idle word: blurs OUT (a real morph, not a hard cut) */}
            <motion.span
              className="word-morph-base"
              initial={false}
              animate={{
                opacity: phase === "thinking" ? 0 : 1,
                filter: phase === "thinking" ? "blur(10px)" : "blur(0px)",
              }}
              transition={
                phase === "thinking"
                  ? quick ?? { duration: 0.28, ease: "easeIn" }
                  : quick ?? { duration: 0.26, ease: "easeOut", delay: 0.05 }
              }
            >
              inference
            </motion.span>

            {/* thinking unit: resolves THROUGH the blur into focus as
                the cell opens - the blur-through reads as a morph
                (~0.5s total); the orb is progressively revealed by
                the clip. randomized reasoning spinner per run */}
            <motion.span
              className="word-morph-active"
              initial={false}
              animate={{
                opacity: phase === "thinking" ? 1 : 0,
                filter: phase === "thinking" ? "blur(0px)" : "blur(10px)",
              }}
              transition={
                phase === "thinking"
                  ? quick ?? { duration: 0.42, ease: "easeOut", delay: 0.12 }
                  : quick ?? { duration: 0.2, ease: "easeIn" }
              }
              aria-hidden={phase === "thinking" ? undefined : true}
            >
              <span className="thinking-glow" data-text="thinking">
                thinking
              </span>
              <span className="orb-22">
                <ReasoningOrb state={orbState} paused={!!reduceMotion} />
              </span>
            </motion.span>
          </motion.span>
        ) : (
          <span className="word-morph-cell">
            <span className="word-morph-base">inference</span>
          </span>
        )}
        <span className="sr-only">{phase === "thinking" ? "thinking" : "inference"}</span>
      </span>
    </TactileWord>
  );
}