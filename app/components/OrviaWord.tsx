"use client";

import { useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import TactileWord from "./TactileWord";

/**
 * Orvia identity toggle. The word stays fully readable; the canonical
 * Orvia mark (three concentric circles, from orviaops.com's own
 * apple-touch-icon) stamps in inline after the name at ~1em. Click
 * again: the mark retreats cleanly.
 */
export default function OrviaWord() {
  const [on, setOn] = useState(false);
  const reduceMotion = useReducedMotion();
  const t = reduceMotion ? { duration: 0.01 } : { duration: 0.15, ease: "easeOut" as const };

  return (
    <TactileWord label="Orvia" onActivate={() => setOn((v) => !v)} ariaPressed={on}>
      <span className="identity-slot">
        Orvia
        {/* canonical mark: outer ring, middle ring, filled center dot;
            mounted only while active */}
        {on && (
          <motion.svg
            key="orvia-mark"
            viewBox="0 0 180 180"
            fill="none"
            className="identity-mark orvia-mark"
            aria-hidden="true"
            initial={{ opacity: 0, scale: 0.7 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={t}
          >
            <circle cx="90" cy="90" r="52" stroke="currentColor" strokeWidth="10" />
            <circle cx="90" cy="90" r="32" stroke="currentColor" strokeWidth="10" />
            <circle cx="90" cy="90" r="12" fill="currentColor" />
          </motion.svg>
        )}
      </span>
    </TactileWord>
  );
}