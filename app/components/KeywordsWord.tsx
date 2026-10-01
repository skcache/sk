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
 * Inactive: neutral text. Active: the name turns the authentic brand
 * blue and the official Keywords mark (their own favicon, first-party
 * asset from keywordsstudios.com) stamps into the small slot at the
 * phrase's end. Click again: clean reverse. No invented chip.
 */
export default function KeywordsWord() {
  const [on, setOn] = useState(false);
  const reduceMotion = useReducedMotion();
  const t = reduceMotion ? { duration: 0.01 } : { duration: 0.2, ease: "easeOut" as const };

  return (
    <TactileWord
      label="Keywords Studios"
      onActivate={() => setOn((v) => !v)}
      ariaPressed={on}
    >
      <span className="identity-slot">
        <motion.span
          animate={{ color: on ? KW_BLUE : INK }}
          transition={reduceMotion ? { duration: 0.01 } : { duration: 0.2, ease: "easeOut" }}
        >
          Keywords Studios
        </motion.span>
        {/* official Keywords mark, inline at ~1em: visible and aligned */}
        <motion.img
          key="kw-mark"
          src="/kw-mark.png"
          alt=""
          className="identity-mark"
          initial={{ opacity: 0, scale: 0.7 }}
          animate={on ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.7 }}
          transition={t}
        />
      </span>
    </TactileWord>
  );
}