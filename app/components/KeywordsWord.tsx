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
 * Rest: neutral "Keywords Studios".
 * Active: the name turns the authentic brand blue and the K is visually
 * replaced by the official Keywords mark (their own favicon asset,
 * first-party from keywordsstudios.com). Click again: back to the K.
 */
export default function KeywordsWord() {
  const [on, setOn] = useState(false);
  const reduceMotion = useReducedMotion();
  const t = reduceMotion ? { duration: 0.01 } : { duration: 0.15, ease: "easeOut" as const };

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
          {on ? (
            /* official mark (white K on brand blue) in the K's slot */
            <motion.img
              key="kw-k"
              src="/kw-mark.png"
              alt=""
              className="k-mark"
              initial={{ opacity: 0, scale: 0.6 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={t}
            />
          ) : (
            <motion.span key="k" initial={false}>
              K
            </motion.span>
          )}
          eywords Studios
        </motion.span>
      </span>
    </TactileWord>
  );
}