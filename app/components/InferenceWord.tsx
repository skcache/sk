"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import TactileWord from "./TactileWord";

const SEQUENCE_MS = 850;

/**
 * Signature object: "inference" briefly becomes a tiny inference machine.
 *
 * press -> word compresses (TactileWord). On release the word dims and
 * tightens, a narrow high-energy scan crosses left to right, the
 * characters resolve back to sharp full-contrast text behind the scan,
 * a tiny result pulse appears at the final edge, everything snaps back.
 * All of it is bounded to the word's own box: zero layout shift.
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
    // Static state change: instant highlight, no moving geometry.
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
        className="word-box"
        animate={active ? { scaleX: 0.985 } : { scaleX: 1 }}
        transition={
          active
            ? { duration: 0.15, ease: "easeOut" }
            : { duration: 0.2, delay: 0.55, ease: "easeOut" }
        }
      >
        {/* base layer: dims while processing */}
        <motion.span
          className="word-text"
          animate={
            active ? { color: "rgba(38, 34, 28, 0.45)" } : { color: "#26221c" }
          }
          transition={
            active ? { duration: 0.12, ease: "easeOut" } : { duration: 0.3 }
          }
        >
          inference
        </motion.span>

        {active && (
          <>
            {/* resolve layer: characters return to sharp, left to right */}
            <motion.span
              key={`resolve-${run}`}
              className="word-resolve"
              aria-hidden="true"
              initial={{ width: "0%" }}
              animate={{ width: "100%" }}
              transition={{ duration: 0.34, delay: 0.16, ease: [0.45, 0, 0.25, 1] }}
            >
              inference
            </motion.span>

            {/* scan bar: high-energy pass, clipped to the word box */}
            <motion.span
              key={`scan-${run}`}
              className="word-scan"
              aria-hidden="true"
              initial={{ x: "-140%" }}
              animate={{ x: "260%" }}
              transition={{ duration: 0.42, delay: 0.1, ease: [0.45, 0, 0.25, 1] }}
            />

            {/* result pulse at the final edge */}
            <motion.span
              key={`dot-${run}`}
              className="word-result-dot"
              aria-hidden="true"
              initial={{ opacity: 0, scale: 0.4 }}
              animate={{ opacity: [0, 1, 1, 0], scale: [0.4, 1, 1, 0.6] }}
              transition={{
                times: [0, 0.12, 0.8, 1],
                duration: 0.3,
                delay: 0.52,
                ease: "easeOut",
              }}
              onAnimationComplete={() => setActive(false)}
            />
          </>
        )}
      </motion.span>
    </TactileWord>
  );
}