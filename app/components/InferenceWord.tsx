"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import TactileWord from "./TactileWord";

const SEQUENCE_MS = 760;

// The word is carved into four register cells. The overlay renders the
// same glyphs line-for-line over the in-flow text, which is fully
// hidden while the carriage runs, so only one crisp text layer exists
// in any frame. All geometry sits inside the word's own box.
const SEGMENTS = ["inf", "er", "en", "ce"];

// Pop times track the reader beam crossing each register center.
const SEG_DELAYS = [0.07, 0.12, 0.17, 0.22];

/**
 * Object: "inference" briefly becomes a tiny computation carriage.
 *
 * Press -> the word is consumed into the machine (base text hides in
 * two frames), a hairline chassis frames the box from the inside, a
 * hard-edged reader beam sweeps left to right on a linear track, each
 * register chunk resolves to full contrast as the beam's leading edge
 * passes, a square result cell blips at the final edge, then the word
 * is released back to plain text. Zero layout shift, zero ghosting.
 */
export default function InferenceWord() {
  const reduceMotion = useReducedMotion();
  const [run, setRun] = useState(0);
  const [active, setActive] = useState(false);
  const safety = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearSafety = useCallback(() => {
    if (safety.current) {
      clearTimeout(safety.current);
      safety.current = null;
    }
  }, []);

  const activate = useCallback(() => {
    clearSafety();
    setActive(true);
    setRun((r) => r + 1);
    safety.current = setTimeout(() => {
      setActive(false);
      safety.current = null;
    }, SEQUENCE_MS + 250);
  }, [clearSafety]);

  useEffect(() => clearSafety, [clearSafety]);

  if (reduceMotion) {
    // Static state change: instant strong-blue highlight, no moving parts.
    return (
      <TactileWord label="inference" onActivate={activate}>
        <motion.span
          key={run}
          animate={active ? { color: "#00629b" } : { color: "#26221c" }}
          transition={{ duration: 0.01 }}
        >
          inference
        </motion.span>
      </TactileWord>
    );
  }

  return (
    <TactileWord label="inference" onActivate={activate}>
      <motion.span
        className="word-machine"
        animate={active ? { scaleX: 0.991 } : { scaleX: 1 }}
        transition={
          active
            ? { duration: 0.12, ease: "easeOut" }
            : { duration: 0.18, delay: 0.5, ease: "easeOut" }
        }
      >
        {/* in-flow base text: fully hidden while the carriage runs */}
        <motion.span
          className="word-text"
          animate={active ? { opacity: 0 } : { opacity: 1 }}
          transition={
            active
              ? { duration: 0.03, ease: "easeOut" }
              : { duration: 0.15, ease: "easeOut" }
          }
        >
          inference
        </motion.span>

        {active && (
          <>
            {/* hairline chassis frames the machine from inside the box */}
            <motion.span
              key={`chassis-${run}`}
              className="word-chassis"
              aria-hidden="true"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.05 }}
            />

            {/* clipped stage: beam below, registers above */}
            <motion.span
              key={`stage-${run}`}
              className="word-stage"
              aria-hidden="true"
            >
              {/* hard-edged reader beam: flat cell, crisp leading edge */}
              <motion.span
                className="word-beam"
                initial={{ x: "-115%" }}
                animate={{ x: "315%" }}
                transition={{ duration: 0.3, delay: 0.035, ease: "linear" }}
              />

              {/* register cells resolving left to right */}
              <motion.span className="word-segs">
                {SEGMENTS.map((seg, i) => (
                  <motion.span
                    key={`${seg}-${i}`}
                    className="word-seg"
                    initial={{ opacity: 0, scale: 0.97 }}
                    animate={{ opacity: 1, scale: [0.97, 1.02, 1] }}
                    transition={{
                      duration: 0.1,
                      delay: SEG_DELAYS[i],
                      times: [0, 0.55, 1],
                      ease: "easeOut",
                    }}
                  >
                    {seg}
                  </motion.span>
                ))}
              </motion.span>

              {/* square result cell blips at the final edge */}
              <motion.span
                key={`result-${run}`}
                className="word-result"
                initial={{ opacity: 0, scale: 0.4 }}
                animate={{ opacity: [0, 1, 1, 0], scale: [0.4, 1.2, 1, 0.3] }}
                transition={{
                  times: [0, 0.15, 0.7, 1],
                  duration: 0.22,
                  delay: 0.4,
                  ease: "easeOut",
                }}
                onAnimationComplete={() => setActive(false)}
              />
            </motion.span>
          </>
        )}
      </motion.span>
    </TactileWord>
  );
}