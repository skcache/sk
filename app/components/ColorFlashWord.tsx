"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import TactileWord from "./TactileWord";

const INK = "#26221c";
const HOLD_MS = 900;

/**
 * A quiet list-item easter egg: the text flashes through a brand palette
 * on tap/click, then settles back to ink. Used for exactly two entries
 * (Google colors on GDG, Keywords Studios brand blue). Reduced motion
 * gets a static color state instead of the travel.
 */
export default function ColorFlashWord({
  label,
  colors,
  reducedColor,
}: {
  label: string;
  colors: string[];
  reducedColor: string;
}) {
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
    }, HOLD_MS + 350);
  }, [clearSafety]);

  useEffect(() => clearSafety, [clearSafety]);

  const cycle = colors.length > 1;

  return (
    <TactileWord label={label} onActivate={activate}>
      <motion.span
        key={run}
        animate={
          !active
            ? { color: INK }
            : reduceMotion
              ? { color: reducedColor }
              : cycle
                ? { color: [...colors, INK] }
                : { color: [INK, colors[0], colors[0], INK] }
        }
        transition={
          reduceMotion
            ? { duration: 0.01 }
            : cycle
              ? {
                  times: Array.from(
                    { length: colors.length + 1 },
                    (_, i) => i / colors.length
                  ),
                  duration: HOLD_MS / 1000,
                  ease: "easeInOut",
                }
              : {
                  times: [0, 0.18, 0.72, 1],
                  duration: HOLD_MS / 1000,
                  ease: "easeInOut",
                }
        }
        onAnimationComplete={() => setActive(false)}
      >
        {label}
      </motion.span>
    </TactileWord>
  );
}