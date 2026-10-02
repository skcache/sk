"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import { ThinkingOrb, type OrbState } from "thinking-orbs";
import TactileWord from "./TactileWord";

const THINK_MS = 2500; // the word visibly thinks, then returns

// randomized reasoning states: a fresh orb picks one per activation
const INFER_ORB_STATES: OrbState[] = ["solving", "working", "searching", "weaving", "composing", "breathing"];
const pickOrbState = (): OrbState => INFER_ORB_STATES[Math.floor(Math.random() * INFER_ORB_STATES.length)];

/**
 * Signature interaction: "inference" becomes a tiny thinking process.
 *
 * hard press -> the word becomes ONE inline status unit: a single
 * lowercase `thinking` word with a soft light glow sweeping left ->
 * right across the letters, plus a 20px solving ThinkingOrb 3px
 * beside it. The text crossfades in place while the cell springs
 * open, CLIPPING the orb so it is revealed smoothly from behind the
 * word's edge; the orb works for ~2.5s, then the unit retracts (orb
 * clipped away) and the word returns. No trailing marker - the
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
  const [orbState, setOrbState] = useState<OrbState>("solving");
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
          <ThinkingOrb
            state="solving"
            size={20}
            theme="dark"
            paused={!!reduceMotion}
            aria-hidden="true"
          />
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
            {/* idle word */}
            <motion.span
              className="word-morph-base"
              initial={false}
              animate={{ opacity: phase === "thinking" ? 0 : 1 }}
              transition={
                phase === "thinking"
                  ? quick ?? { duration: 0.07, ease: "easeOut" }
                  : quick ?? { duration: 0.22, ease: "easeOut", delay: 0.05 }
              }
            >
              inference
            </motion.span>

            {/* thinking unit: crossfades in as the cell opens; the orb
                is progressively revealed by the clip until the unit
                fits. deterministic: always the solving state */}
            <motion.span
              className="word-morph-active"
              initial={false}
              animate={{ opacity: phase === "thinking" ? 1 : 0 }}
              transition={
                phase === "thinking"
                  ? quick ?? { duration: 0.16, ease: "easeOut", delay: 0.05 }
                  : quick ?? { duration: 0.12, ease: "easeIn" }
              }
              aria-hidden={phase === "thinking" ? undefined : true}
            >
              <span className="thinking-glow" data-text="thinking">
                thinking
              </span>
              <ThinkingOrb
                state={orbState}
                size={20}
                theme="dark"
                paused={!!reduceMotion}
                style={{ flex: "none" }}
              />
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