"use client";

import { useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import TactileWord from "./TactileWord";

// Official Google wordmark colors (exact brand order for "Google").
const GOOGLE = ["#4285F4", "#EA4335", "#FBBC05", "#34A853"] as const;
const WORDMARK = [
  "#4285F4",
  "#EA4335",
  "#FBBC05",
  "#34A853",
  "#4285F4",
  "#EA4335",
] as const;

/**
 * Google Dev Group identity toggle. One stable line at all times:
 *
 *   President at [logo slot] Google Dev Group, UC San Diego
 *
 * The logo slot is permanently reserved, so nothing ever moves. Active:
 * the official GDG mark (four-color G, from Google's own GDG brand
 * asset on gdg.community.dev) stamps into the slot, and the word
 * "Google" takes its exact official wordmark colors (the actual brand
 * treatment for that word). "Dev Group" and "UC San Diego" stay
 * neutral. Click again: everything returns.
 */
export default function GoogleDevGroupWord() {
  const [on, setOn] = useState(false);
  const reduceMotion = useReducedMotion();
  const t = reduceMotion
    ? { duration: 0.01 }
    : { type: "spring" as const, stiffness: 850, damping: 30, mass: 0.4 };

  const colorFor = (i: number) => {
    if (!on) return undefined;
    // official wordmark sequence applies to "Google" (chars 0-5) only
    if (i < 6) return WORDMARK[i];
    return undefined;
  };

  return (
    <TactileWord
      label="Google Dev Group"
      onActivate={() => setOn((v) => !v)}
      ariaPressed={on}
      className="whitespace-nowrap"
    >
      <span className="identity-slot">
        {/* permanently reserved logo slot: empty at rest, stamped active */}
        <span className="gdg-slot" aria-hidden="true">
          {on && (
            <motion.img
              key="gdg-mark"
              src="/gdg-mark.svg"
              alt=""
              className="gdg-mark-slot"
              initial={{ opacity: 0, scale: 0.85 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={t}
            />
          )}
        </span>
        {"Google Dev Group".split("").map((c, i) => (
          <motion.span
            key={i}
            animate={{ color: colorFor(i) }}
            transition={reduceMotion ? { duration: 0.01 } : { duration: 0.22, ease: "easeOut" }}
          >
            {c === " " ? "\u00A0" : c}
          </motion.span>
        ))}
      </span>
    </TactileWord>
  );
}