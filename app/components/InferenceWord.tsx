"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import { ThinkingOrb } from "thinking-orbs";
import TactileWord from "./TactileWord";

const THINK_MS = 1100; // the word visibly thinks
const RESOLVE_MS = 380; // brief resolved marker, then back

/**
 * Signature interaction: "inference" becomes a tiny thinking process.
 *
 * hard press -> the word becomes ONE inline status unit: a single
 * `Thinking` word + a 20px ThinkingOrb (state="solving") sitting 3px
 * beside it, the orb works for ~1.1s, a brief resolved marker appears,
 * then the word cleanly returns.
 *
 * Layout: no reservation. Two invisible probes measure the real widths
 * of "inference" and "Thinking + orb"; a Motion spring animates the
 * live cell between those widths only while active, so at rest the
 * button is exactly word-sized (no dead gap, no oversized focus ring)
 * and the surrounding prose shifts smoothly by only a few pixels
 * during the deliberate interaction. The orb can never overlap
 * "systems" because the cell is its real inline size.
 *
 * Reduced motion: instant static swap "inference"/"Thinking" + a frozen
 * orb for the hold, no morph travel, no animation layered on top.
 */
export default function InferenceWord() {
  const reduceMotion = useReducedMotion();
  const [run, setRun] = useState(0);
  const [phase, setPhase] = useState<"idle" | "thinking" | "resolved">("idle");
  const safety = useRef<ReturnType<typeof setTimeout>[]>([]);

  const [widths, setWidths] = useState<{ idle: number; active: number } | null>(null);
  const idleProbe = useRef<HTMLSpanElement>(null);
  const activeProbe = useRef<HTMLSpanElement>(null);

  useEffect(() => {
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
    clearSafety();
    setPhase("thinking");
    setRun((r) => r + 1);
    safety.current = [
      setTimeout(() => setPhase("resolved"), THINK_MS),
      setTimeout(() => {
        setPhase("idle");
        safety.current = [];
      }, THINK_MS + RESOLVE_MS),
    ];
  }, [clearSafety]);

  useEffect(() => clearSafety, [clearSafety]);

  const quick = reduceMotion ? { duration: 0.01 } : undefined;

  return (
    <TactileWord label="inference" onActivate={activate} className="word-morph-btn">
      <span className="word-morph">
        {/* measurement probes: absolute, invisible, zero layout weight */}
        <span ref={idleProbe} className="word-morph-probe" aria-hidden="true">
          inference
        </span>
        <span
          ref={activeProbe}
          className="word-morph-probe word-morph-probe-flex"
          aria-hidden="true"
        >
          <span>Thinking</span>
          <ThinkingOrb
            state="solving"
            size={20}
            theme="dark"
            paused={!!reduceMotion}
            aria-hidden="true"
          />
        </span>

        {/* the live cell: width springs between the two measured widths.
            idle = the word; active = "Thinking" + orb. no permanent
            reservation - prose shifts smoothly only while it thinks */}
        <motion.span
          className="word-morph-cell"
          initial={false}
          animate={{
            width: widths ? (phase === "thinking" ? widths.active : widths.idle) : "auto",
          }}
          transition={quick ?? { type: "spring", stiffness: 420, damping: 34, mass: 0.7 }}
        >
          {phase === "idle" || phase === "resolved" ? (
            <span className="word-morph-base">inference</span>
          ) : (
            <span className="word-morph-active">
              <span>Thinking</span>
              <ThinkingOrb
                state="solving"
                size={20}
                theme="dark"
                paused={!!reduceMotion}
                style={{ flex: "none" }}
              />
            </span>
          )}
        </motion.span>

        {/* brief resolved marker under the returning word */}
        {phase === "resolved" && (
          <span className="word-morph-resolve" key={`res-${run}`}>
            <motion.span
              className="word-notch-cell"
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={quick ?? { duration: 0.08, ease: "easeOut" }}
            />
            <motion.span
              className="word-notch-line"
              initial={{ scaleX: 0 }}
              animate={{ scaleX: 1 }}
              transition={quick ?? { duration: 0.12, ease: "easeOut" }}
            />
          </span>
        )}
        <span className="sr-only">{phase === "thinking" ? "thinking" : "inference"}</span>
      </span>
    </TactileWord>
  );
}