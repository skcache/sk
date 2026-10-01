"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import TactileWord from "./TactileWord";

const SEQUENCE_MS = 1350;

// Gravity: accelerating fall. Rebound: fast rise, soft landing.
const FALL: [number, number, number, number] = [0.5, 0, 1, 0.7];
const RISE: [number, number, number, number] = [0.22, 1, 0.22, 1];

/**
 * Object: a tiny basketball with mass.
 *
 * On release the ball appears just above the baseline at the word's
 * end, drops under gravity, squashes on impact at the line, rebounds
 * once with a decelerating spin, settles, HOLDS at rest for ~600ms,
 * then fades. The whole drop stays inside the word's own line box: it
 * never dips below the baseline, so no neighboring text is ever
 * touched. The word's own press is the shared mechanical click; the
 * squash lives only on the ball.
 */
function Ball() {
  return (
    <svg viewBox="0 0 24 24" className="block h-full w-full" aria-hidden="true">
      <circle cx="12" cy="12" r="11" fill="#e8761d" />
      {/* great-circle seams */}
      <path
        d="M12 1.5v21M1.5 12h21"
        stroke="rgba(96, 40, 3, 0.5)"
        strokeWidth="1.2"
      />
      <path
        d="M4.8 4.8l14.4 14.4M19.2 4.8 4.8 19.2"
        stroke="rgba(96, 40, 3, 0.28)"
        strokeWidth="1.2"
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
    // Static: the ball simply appears at rest beside the word, then leaves.
    return (
      <TactileWord label="basketball" onActivate={activate} signature>
        <span className="word-anchor">
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
    <TactileWord label="basketball" onActivate={activate} signature>
      <span className="word-anchor">
        basketball
        {active && (
          <motion.span
            key={`ball-${run}`}
            aria-hidden="true"
            className="word-ball"
            initial={{ y: -5, opacity: 0, scaleY: 1, scaleX: 1, rotate: 0 }}
            animate={{
              // launch, impact, ONE rebound, settle by ~0.42, hold,
              // fade in the last 0.13
              y: [-5, -5, 0, -8, 0, -1, -1, -1],
              scaleY: [1, 1, 0.61, 1, 0.85, 1, 1, 1],
              scaleX: [1, 1, 1.22, 1, 1.1, 1, 1, 1],
              rotate: [-40, -40, -180, -208, -216, -218, -218, -218],
              opacity: [0, 1, 1, 1, 1, 1, 1, 0],
            }}
            transition={{
              times: [0, 0.03, 0.16, 0.25, 0.33, 0.42, 0.87, 1],
              duration: 1.3,
              ease: [
                "linear",
                FALL,
                RISE,
                FALL,
                [0.3, 0, 0.2, 1],
                "easeInOut",
                "easeInOut",
                "easeInOut",
              ],
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