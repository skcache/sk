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
 * hard press -> the word cross-resolves into `thinking` alongside a
 * 20px ThinkingOrb (state="solving"), the orb works for ~1.1s, a brief
 * resolved marker appears, then the word cleanly returns.
 *
 * Layout: a fixed inline grid slot. Its single max-content column
 * always sizes to the WIDEST state ("inference" vs "thinkin" + the
 * 20px orb + gap); base and overlay share one cell (grid-area 1/1)
 * with no absolute positioning, so neither state can escape and
 * surrounding prose never moves or reflows - on any viewport or line
 * wrap. The overlay stays mounted and hidden at rest, so the slot
 * width is reserved from first paint.
 *
 * Reduced motion: instant static swap "inference"/"thinking" + a frozen
 * orb for the hold, no morph travel, no animation layered on top.
 */
export default function InferenceWord() {
  const reduceMotion = useReducedMotion();
  const [run, setRun] = useState(0);
  const [phase, setPhase] = useState<"idle" | "thinking" | "resolved">("idle");
  const safety = useRef<ReturnType<typeof setTimeout>[]>([]);

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
        {/* in-flow base text; hidden while the orb thinks */}
        <motion.span
          className="word-morph-base"
          animate={{ opacity: phase === "thinking" ? 0 : 1 }}
          transition={
            phase === "thinking"
              ? quick ?? { duration: 0.05, ease: "easeOut" }
              : quick ?? { duration: 0.3, ease: "easeOut" }
          }
        >
          inference
        </motion.span>

        {/* always mounted so the grid cell reserves the widest state
            from first paint; hidden via opacity + aria until the press */}
        <motion.span
          key={`think-${run}`}
          className="word-morph-overlay"
          aria-label={phase === "idle" ? undefined : "thinking"}
          aria-hidden={phase === "idle" || undefined}
          initial={false}
          animate={{ opacity: phase === "idle" || phase === "resolved" ? 0 : 1 }}
          transition={quick ?? { duration: 0.2, ease: "easeOut" }}
        >
            {/* clean cross-resolve: chars settle into place, no scramble.
                the orb takes the place of the final "g": the word is
                visibly thinking inside its own footprint */}
            {"thinkin".split("").map((c, i) => (
              <motion.span
                key={i}
                className="word-morph-char"
                initial={{ opacity: 0, y: 2, scale: 0.985 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={
                  quick ?? {
                    delay: i * 0.024,
                    duration: 0.16,
                    ease: "easeOut",
                  }
                }
              >
                {c}
              </motion.span>
            ))}

            {/* the tiny living orb: the word itself is thinking */}
            <ThinkingOrb
              state="solving"
              size={20}
              theme="dark"
              paused={!!reduceMotion}
              style={{ flex: "none", opacity: phase === "resolved" ? 0.65 : 1 }}
            />
        </motion.span>

        {/* brief resolved marker under the returning word */}
        {phase === "resolved" && (
          <span className="word-morph-overlay word-morph-resolve" key={`res-${run}`}>
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