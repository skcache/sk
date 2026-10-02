"use client";

import { useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import TactileWord from "./TactileWord";

// Official Google wordmark colors (exact brand order for "Google").
const WORDMARK = [
  "#4285F4",
  "#EA4335",
  "#FBBC05",
  "#34A853",
  "#4285F4",
  "#EA4335",
] as const;

/**
 * Google Dev Group identity toggle.
 *
 * At rest: one stable, completely ordinary line - "President at
 * Google Dev Group, UC San Diego", no reserved gap before the phrase.
 * Active: the official GDG mark (the four-color G from Google's own
 * GDG brand asset on gdg.community.dev, stored at public/gdg-mark.svg)
 * opens its slot fluidly before the phrase - the space springs open
 * from zero as the mark fades in, and "Google" glides aside. The word
 * "Google" then takes its exact official wordmark colors. "Dev Group"
 * and "UC San Diego" stay neutral. Click again: the space closes
 * smoothly and everything returns. Give and take.
 */
export default function GoogleDevGroupWord() {
  const [on, setOn] = useState(false);
  const [closing, setClosing] = useState(false);
  const reduceMotion = useReducedMotion();
  const t = reduceMotion
    ? { duration: 0.01 }
    : { type: "spring" as const, stiffness: 850, damping: 30, mass: 0.4 };
  const twOpen = reduceMotion
    ? { duration: 0.01 }
    : { type: "spring" as const, stiffness: 320, damping: 32, mass: 0.9 };
  const twClose = reduceMotion
    ? { duration: 0.01 }
    : { duration: 0.26, ease: "easeInOut" as const };
  const fadeClose = reduceMotion ? { duration: 0.01 } : { duration: 0.22, ease: "easeOut" as const };

  const colorFor = (i: number) => {
    if (!on) return undefined;
    // "Google" takes the exact official wordmark colors; "Dev Group"
    // joins in the official GDG blue so the whole phrase reads as ONE
    // complete brand treatment (no half-applied look)
    if (i < 6) return WORDMARK[i];
    return "#4285F4";
  };

  return (
    <TactileWord
      label="Google Dev Group"
      onActivate={() => {
        if (on) setClosing(true);
        else setOn(true);
      }}
      ariaPressed={on}
      className="identity-btn whitespace-nowrap"
    >
      <span className="identity-slot">
        {(on || closing) && (
          <motion.span
            key="gdg-box"
            className="gdg-markbox"
            initial={{ width: 0 }}
            animate={{ width: closing ? 0 : "1.76em", opacity: closing ? 0 : 1 }}
            transition={{ width: closing ? twClose : twOpen, opacity: closing ? fadeClose : t }}
            onAnimationComplete={() => {
              if (closing) {
                setClosing(false);
                setOn(false);
              }
            }}
          >
            <motion.img
              src="/gdg-mark.svg"
              alt=""
              className="gdg-mark"
              initial={{ opacity: 0, scale: 0.85 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={t}
            />
          </motion.span>
        )}
        {"Google Dev Group".split("").map((c, i) => (
          <motion.span
            key={i}
            className="gdg-char"
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