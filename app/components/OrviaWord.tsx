"use client";

import { useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import TactileWord from "./TactileWord";

/**
 * Orvia identity toggle: the O in `Orvia` is visually replaced by the
 * official Orvia ring mark (canonical public asset, straight from
 * orviaops.com). Same typographic footprint, zero layout shift.
 * Click again: logo -> O.
 */
export default function OrviaWord() {
  const [on, setOn] = useState(false);
  const reduceMotion = useReducedMotion();
  const t = reduceMotion ? { duration: 0.01 } : { duration: 0.15, ease: "easeOut" as const };

  return (
    <TactileWord label="Orvia" onActivate={() => setOn((v) => !v)} ariaPressed={on}>
      <span className="identity-slot">
        {/* O keeps its box; the mark takes its place */}
        <motion.span animate={{ opacity: on ? 0 : 1 }} transition={t}>
          O
        </motion.span>
        rvia
        {/* canonical Orvia ring mark (as shipped by orviaops.com),
            inlined so currentColor inherits from the sentence */}
        <motion.svg
          key="orvia-mark"
          viewBox="0 0 100 124"
          fill="none"
          className="identity-mark orvia-mark"
          aria-hidden="true"
          initial={{ opacity: 0, scale: 0.7 }}
          animate={on ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.7 }}
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
          />
        </motion.svg>
      </span>
    </TactileWord>
  );
}