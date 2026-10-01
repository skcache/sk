"use client";

import { useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import TactileWord from "./TactileWord";

/**
 * Orvia identity toggle. The O is visually replaced by the canonical
 * Orvia mark (thick outer ring, thinner middle ring, solid center dot:
 * the aperture mark from orviaops.com's own apple-touch-icon and brand
 * lockup). Click again: logo back to O.
 */
export default function OrviaWord() {
  const [on, setOn] = useState(false);
  const reduceMotion = useReducedMotion();
  const t = reduceMotion ? { duration: 0.01 } : { duration: 0.15, ease: "easeOut" as const };

  return (
    <TactileWord label="Orvia" onActivate={() => setOn((v) => !v)} ariaPressed={on}>
      <span className="identity-slot">
        {on ? (
          /* canonical aperture mark in the O's slot: chunky outer
             torus, hairline middle ring, small solid dot */
          <motion.svg
            key="orvia-mark"
            viewBox="0 0 180 180"
            fill="none"
            className="orvia-mark-o"
            aria-hidden="true"
            initial={{ opacity: 0, scale: 0.6 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={t}
          >
            <circle cx="90" cy="90" r="56" stroke="currentColor" strokeWidth="24" />
            <circle cx="90" cy="90" r="26" stroke="currentColor" strokeWidth="6" />
            <circle cx="90" cy="90" r="7" fill="currentColor" />
          </motion.svg>
        ) : (
          <motion.span key="o" initial={false} animate={{ opacity: 1 }}>
            O
          </motion.span>
        )}
        rvia
      </span>
    </TactileWord>
  );
}