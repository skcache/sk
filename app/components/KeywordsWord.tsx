"use client";

import { useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import TactileWord from "./TactileWord";

const INK = "#f3f1ea";
// Keywords Studios authentic brand blue (their own stylesheet).
const KW_BLUE = "#0042ff";

/**
 * Keywords Studios identity toggle.
 *
 * The K-slot is permanently reserved (fixed width), so nothing shifts.
 * Inactive: the letter K sits in the slot. Active: the official
 * Keywords mark (their own favicon asset, keyed from keywordsstudios.com)
 * fills the same slot at logo scale, and the organization text turns
 * the authentic brand blue. Click again: back to K.
 */
export default function KeywordsWord() {
  const [on, setOn] = useState(false);
  const reduceMotion = useReducedMotion();
  const t = reduceMotion
    ? { duration: 0.01 }
    : { type: "spring" as const, stiffness: 850, damping: 30, mass: 0.4 };

  return (
    <TactileWord
      label="Keywords Studios"
      onActivate={() => setOn((v) => !v)}
      ariaPressed={on}
    >
      <span className="identity-slot">
        <span className="k-slot" aria-hidden="true">
          {on ? (
            <motion.img
              key="kw-mark"
              src="/kw-mark.png"
              alt=""
              className="k-mark"
              initial={{ opacity: 0, scale: 0.85 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={t}
            />
          ) : (
            <span className="k-glyph">K</span>
          )}
        </span>
        <motion.span
          animate={{ color: on ? KW_BLUE : INK }}
          transition={reduceMotion ? { duration: 0.01 } : { duration: 0.22, ease: "easeOut" }}
        >
          eywords Studios
        </motion.span>
      </span>
    </TactileWord>
  );
}