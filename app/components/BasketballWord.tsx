"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import TactileWord from "./TactileWord";

const SEQUENCE_MS = 800;

const FALL: [number, number, number, number] = [0.45, 0, 1, 1]; // gravity
const RISE: [number, number, number, number] = [0.16, 1, 0.3, 1]; // rebound

/**
 * Object: a tiny basketball with mass. On release it drops from just
 * above the baseline at the end of the word, hits an invisible floor,
 * squashes, rebounds once, and cleanly disappears. Local to the word:
 * no travel through the paragraph.
 */
function Ball() {
  return (
    <svg viewBox="0 0 24 24" className="h-full w-full" aria-hidden="true">
      <circle cx="12" cy="12" r="11" fill="#e8761d" />
      <path
        d="M12 1v22M1 12h22M4.2 4.2l15.6 15.6M19.8 4.2 4.2 19.8"
        stroke="rgba(120, 46, 4, 0.55)"
        strokeWidth="1.4"
        strokeLinecap="round"
      />
    </svg>
  );
}

export default function BasketballWord() {
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
    // Static: the ball simply appears at rest, then leaves.
    return (
      <TactileWord label="basketball" onActivate={activate}>
        <span className="relative inline-block">
          basketball
          {active && (
            <motion.span
              key={run}
              aria-hidden="true"
              className="word-ball"
              initial={{ opacity: 0 }}
              animate={{ opacity: [0, 1, 1, 0] }}
              transition={{
                times: [0, 0.15, 0.75, 1],
                duration: 0.6,
              }}
            >
              <Ball />
            </motion.span>
          )}
        </span>
      </TactileWord>
    );
  }

  return (
    <TactileWord label="basketball" onActivate={activate}>
      <span className="relative inline-block">
        basketball
        {active && (
          <motion.span
            key={run}
            aria-hidden="true"
            className="word-ball"
            initial={{ y: -15, opacity: 0, scaleY: 1, scaleX: 1, rotate: 0 }}
            animate={{
              y: [-15, 0, -8, -2, 0],
              scaleY: [1, 0.6, 1, 0.84, 1],
              scaleX: [1, 1.26, 1, 1.08, 1],
              rotate: [0, -42, -14, -6, 0],
              opacity: [0, 1, 1, 1, 0],
            }}
            transition={{
              times: [0, 0.34, 0.54, 0.72, 1],
              duration: 0.78,
              ease: [FALL, RISE, FALL, RISE],
            }}
            onAnimationComplete={() => setActive(false)}
          >
            <Ball />
          </motion.span>
        )}
      </span>
    </TactileWord>
  );
}