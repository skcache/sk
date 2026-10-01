"use client";

import { useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import TactileWord from "./TactileWord";

// Official Google core identity palette (wordmark order).
const GOOGLE = ["#4285F4", "#EA4335", "#FBBC05", "#34A853"] as const;

/**
 * Google Dev Group identity toggle.
 *
 * Inactive: normal neutral text.
 * Active: the phrase resolves into the official four-color Google
 * treatment (letters colored in wordmark order, so no layout change)
 * and the official GDG mark (four-color G, extracted from Google's own
 * GDG brand asset on gdg.community.dev) stamps into a small fixed slot
 * at the phrase's end. Click again: everything reverses cleanly.
 */
export default function GoogleDevGroupWord() {
  const [on, setOn] = useState(false);
  const reduceMotion = useReducedMotion();
  const t = reduceMotion ? { duration: 0.01 } : { duration: 0.2, ease: "easeOut" as const };

  return (
    <TactileWord
      label="Google Dev Group"
      onActivate={() => setOn((v) => !v)}
      ariaPressed={on}
    >
      <span className="identity-slot">
        {"Google Dev Group".split("").map((c, i) => (
          <motion.span
            key={i}
            animate={on ? { color: GOOGLE[i % 4] } : { color: undefined }}
            transition={
              on
                ? reduceMotion
                  ? { duration: 0.01 }
                  : { duration: 0.2, ease: "easeOut", delay: i * 0.012 }
                : { duration: 0.2, ease: "easeOut" }
            }
          >
            {c === " " ? "\u00A0" : c}
          </motion.span>
        ))}
        {/* permanently reserved inline slot: the official G stamps
            inside it, so the sentence never shifts on toggle */}
        <span className="gdg-reserve" aria-hidden="true">
          <motion.img
            key="gdg-mark"
            src="/gdg-mark.svg"
            alt=""
            className="gdg-mark-inline"
            initial={{ opacity: 0, scale: 0.6 }}
            animate={on ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.6 }}
            transition={t}
          />
        </span>
      </span>
    </TactileWord>
  );
}