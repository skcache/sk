"use client";

import { useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import TactileWord from "./TactileWord";

/**
 * Keywords Studios toggle. The org name always stays neutral site text;
 * toggling reveals a tiny designed blue chip ("KW", brand blue #0042ff
 * from keywordsstudios.com/assets/styles.css) floating above the name.
 * Toggle again to dismiss. Persistent and explicitly reversible.
 */
export default function KeywordsWord() {
  const [on, setOn] = useState(false);
  const reduceMotion = useReducedMotion();

  return (
    <TactileWord
      label="Keywords Studios"
      onActivate={() => setOn((v) => !v)}
      ariaPressed={on}
    >
      <span className="word-anchor">
        Keywords Studios
        {on && (
          <motion.span
            aria-hidden="true"
            className="keywords-chip -top-4 right-0"
            initial={reduceMotion ? { opacity: 1 } : { opacity: 0, y: 2 }}
            animate={{ opacity: 1, y: 0 }}
            transition={
              reduceMotion ? { duration: 0.01 } : { duration: 0.18, ease: "easeOut" }
            }
          >
            KW
          </motion.span>
        )}
      </span>
    </TactileWord>
  );
}