"use client";

import { useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import TactileWord from "./TactileWord";

/**
 * One-shot easter egg for list items. Clicking/tapping activates the
 * state once and it STAYS (persistent until reload):
 *
 * - perLetterColors: each letter is painted with the palette, cycling
 *   per letter index (Google-logo style: "Google Developer Groups" ->
 *   blue/red/yellow/green per letter).
 * - solidColor: the whole label is painted one color (Keywords
 *   Studios -> their brand blue #0042FF).
 *
 * Second clicks are inert; after activation the control becomes a plain
 * span (no longer interactive). Reduced motion: colors apply instantly
 * without the stagger.
 */
export default function ColorFlashWord({
  label,
  perLetterColors,
  solidColor,
}: {
  label: string;
  perLetterColors?: string[];
  solidColor?: string;
}) {
  const reduceMotion = useReducedMotion();
  const [on, setOn] = useState(false);

  if (!on) {
    return (
      <TactileWord label={label} onActivate={() => setOn(true)}>
        {label}
      </TactileWord>
    );
  }

  // Active: paint and stay.
  if (perLetterColors && perLetterColors.length > 0) {
    return (
      <span aria-label={label}>
        {[...label].map((ch, i) => (
          <motion.span
            key={i}
            aria-hidden={ch === " "}
            style={{ color: perLetterColors[i % perLetterColors.length] }}
            initial={reduceMotion ? { opacity: 1 } : { opacity: 0.35 }}
            animate={{ opacity: 1 }}
            transition={
              reduceMotion
                ? { duration: 0.01 }
                : { duration: 0.18, delay: i * 0.012, ease: "easeOut" }
            }
          >
            {ch}
          </motion.span>
        ))}
      </span>
    );
  }

  return (
    <motion.span
      aria-label={label}
      animate={{ color: solidColor ?? "#26221c" }}
      transition={reduceMotion ? { duration: 0.01 } : { duration: 0.2, ease: "easeOut" }}
    >
      {label}
    </motion.span>
  );
}