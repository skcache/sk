"use client";

import { useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import TactileWord from "./TactileWord";

/**
 * Orvia identity toggle.
 *
 * At rest: a completely ordinary O - the word reads "Building Orvia",
 * no box, no dead space. Active: the exact canonical Orvia logo
 * (three concentric vertical rounded O-rings, copied byte-for-byte
 * from skcache/orvia/public/logo.svg, also stored at
 * public/orvia-logo.svg) opens the O slot fluidly - the box springs
 * from letter width to logo width while the logo fades in, so `rvia`
 * glides aside instead of jumping. Click again: the space closes
 * back to the letter. Give and take.
 */
export default function OrviaWord() {
  const [on, setOn] = useState(false);
  const [closing, setClosing] = useState(false);
  const reduceMotion = useReducedMotion();
  const t = reduceMotion
    ? { duration: 0.01 }
    : { type: "spring" as const, stiffness: 850, damping: 30, mass: 0.4 };
  const tw = reduceMotion
    ? { duration: 0.01 }
    : { type: "spring" as const, stiffness: 320, damping: 32, mass: 0.9 };

  return (
    <TactileWord
      label="Orvia"
      onActivate={() => {
        if (on) setClosing(true);
        else setOn(true);
      }}
      ariaPressed={on}
    >
      <span className="identity-slot">
        {on || closing ? (
          <motion.span
            key="o-box"
            className="o-markbox"
            initial={{ width: "0.74em" }}
            animate={{ width: closing ? "0.74em" : "0.97em", opacity: closing ? 0 : 1 }}
            transition={tw}
            onAnimationComplete={() => {
              if (closing) {
                setClosing(false);
                setOn(false);
              }
            }}
          >
            {/* exact canonical asset, inlined so currentColor inherits */}
            <motion.svg
              viewBox="0 0 100 124"
              fill="none"
              className="o-mark"
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
          </motion.span>
        ) : (
          <span className="o-letter">O</span>
        )}
        rvia
      </span>
    </TactileWord>
  );
}