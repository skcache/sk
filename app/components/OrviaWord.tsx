"use client";

import { useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import TactileWord from "./TactileWord";

/**
 * Orvia identity toggle.
 *
 * The O-slot is permanently reserved (fixed width), so `rvia` never
 * shifts. Inactive: the O glyph sits in the slot. Active: the exact
 * canonical Orvia logo (three concentric vertical rounded O-rings,
 * copied byte-for-byte from skcache/orvia/public/logo.svg, also stored
 * at public/orvia-logo.svg) occupies the same slot. Click again: O.
 */
export default function OrviaWord() {
  const [on, setOn] = useState(false);
  const reduceMotion = useReducedMotion();
  const t = reduceMotion
    ? { duration: 0.01 }
    : { type: "spring" as const, stiffness: 850, damping: 30, mass: 0.4 };

  return (
    <TactileWord label="Orvia" onActivate={() => setOn((v) => !v)} ariaPressed={on}>
      <span className="identity-slot">
        <span className="o-slot" aria-hidden="true">
          {on ? (
            /* exact canonical asset, inlined so currentColor inherits */
            <motion.svg
              key="orvia-logo"
              viewBox="0 0 100 124"
              fill="none"
              className="o-logo"
              initial={{ opacity: 0, scale: 0.85 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={t}
            >
              <rect
                x="14"
                y="18"
                width="72"
                height="88"
                rx="36"
                stroke="currentColor"
                strokeWidth="7"
                strokeLinejoin="round"
                fill="none"
              />
              <rect
                x="26"
                y="32"
                width="48"
                height="60"
                rx="24"
                stroke="currentColor"
                strokeWidth="7"
                strokeLinejoin="round"
                fill="none"
              />
              <rect
                x="38"
                y="46"
                width="24"
                height="32"
                rx="12"
                stroke="currentColor"
                strokeWidth="7"
                strokeLinejoin="round"
                fill="none"
              />
            </motion.svg>
          ) : (
            <span className="o-glyph">O</span>
          )}
        </span>
        rvia
      </span>
    </TactileWord>
  );
}