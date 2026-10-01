"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import TactileWord from "./TactileWord";

// Machine phase: chassis + beam + registers (fast, hard).
const MACHINE_MS = 620;
// After-state: the resolved notch sits for ~850ms, then everything goes.
const NOTCH_MS = 850;
const INK = "#f3f1ea";

// The word is carved into four register cells. The overlay renders the
// same glyphs line-for-line over the in-flow text, which is fully
// hidden while the carriage runs, so only one crisp text layer exists
// in any frame. All geometry sits inside the word's own box.
const SEGMENTS = ["inf", "er", "en", "ce"];

// Pop times track the reader beam crossing each register center.
const SEG_DELAYS = [0.05, 0.1, 0.15, 0.2];

/**
 * Object: "inference" briefly becomes a tiny computation carriage.
 *
 * Press -> the word is consumed into the machine, a hairline chassis
 * frames the box, a narrow high-contrast reader beam sweeps left to
 * right on a linear track, each register chunk SNAPS into registration
 * (opacity 0->1, scale 0.985->1, no overshoot) as the beam passes, then
 * a 3px result cell + 1px resolved underline remain for ~850ms as the
 * output state, and disappear. Interaction -> consequence -> resolution.
 */
export default function InferenceWord() {
  const reduceMotion = useReducedMotion();
  const [run, setRun] = useState(0);
  const [active, setActive] = useState(false);
  const [notch, setNotch] = useState(false);
  const safety = useRef<ReturnType<typeof setTimeout>[]>([]);

  const clearSafety = useCallback(() => {
    safety.current.forEach(clearTimeout);
    safety.current = [];
  }, []);

  const activate = useCallback(() => {
    clearSafety();
    setNotch(false);
    setActive(true);
    setRun((r) => r + 1);
    // single controlling timeline: machine phase, then notch, then out
    safety.current = [
      setTimeout(() => setNotch(true), MACHINE_MS),
      setTimeout(() => {
        setActive(false);
        setNotch(false);
        safety.current = [];
      }, MACHINE_MS + NOTCH_MS),
    ];
  }, [clearSafety]);

  useEffect(() => clearSafety, [clearSafety]);

  if (reduceMotion) {
    // Static state change: instant bright-blue highlight, no moving parts.
    return (
      <TactileWord label="inference" onActivate={activate} signature>
        <motion.span
          key={run}
          animate={active ? { color: "#4fa3d1" } : { color: INK }}
          transition={{ duration: 0.01 }}
        >
          inference
        </motion.span>
      </TactileWord>
    );
  }

  return (
    <TactileWord label="inference" onActivate={activate} signature>
      <motion.span
        className="word-machine"
        animate={active && !notch ? { scaleX: 0.991 } : { scaleX: 1 }}
        transition={
          active && !notch
            ? { duration: 0.1, ease: "easeOut" }
            : { duration: 0.15, ease: "easeOut" }
        }
      >
        {/* in-flow base text: hidden while the machine runs, visible
            again for the notch after-state */}
        <motion.span
          className="word-text"
          animate={{ opacity: active && !notch ? 0 : 1 }}
          transition={
            active && !notch
              ? { duration: 0.03, ease: "easeOut" }
              : { duration: 0.12, ease: "easeOut" }
          }
        >
          inference
        </motion.span>

        {active && !notch && (
          <span key={`machine-${run}`}>
            {/* hairline chassis frames the machine from inside the box */}
            <motion.span
              className="word-chassis"
              aria-hidden="true"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.04 }}
            />

            {/* clipped stage: beam below, registers above */}
            <span className="word-stage" aria-hidden="true">
              {/* hard-edged reader beam: narrow, linear, crisp */}
              <motion.span
                className="word-beam"
                initial={{ x: "-115%" }}
                animate={{ x: "315%" }}
                transition={{ duration: 0.28, delay: 0.04, ease: "linear" }}
              />

              {/* register cells snap into registration, no overshoot */}
              <span className="word-segs">
                {SEGMENTS.map((seg, i) => (
                  <motion.span
                    key={`${seg}-${i}`}
                    className="word-seg"
                    initial={{ opacity: 0, scale: 0.985 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{
                      duration: 0.08,
                      delay: SEG_DELAYS[i],
                      ease: "easeOut",
                    }}
                  >
                    {seg}
                  </motion.span>
                ))}
              </span>
            </span>
          </span>
        )}

        {/* after-state: 3px result cell + 1px resolved underline */}
        {notch && (
          <span className="word-notch" aria-hidden="true">
            <motion.span
              key={`cell-${run}`}
              className="word-notch-cell"
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.08, ease: "easeOut" }}
            />
            <motion.span
              key={`line-${run}`}
              className="word-notch-line"
              initial={{ scaleX: 0 }}
              animate={{ scaleX: 1 }}
              transition={{ duration: 0.12, ease: "easeOut" }}
            />
          </span>
        )}
      </motion.span>
    </TactileWord>
  );
}