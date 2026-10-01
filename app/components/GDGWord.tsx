"use client";

import { useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import TactileWord from "./TactileWord";

// Official Google identity colors (Google brand palette).
const GOOGLE_COLORS = ["#4285F4", "#EA4335", "#FBBC05", "#34A853"];

/**
 * GDG toggle. Idle: neutral site text. Toggled on: the three letters
 * resolve into a deliberate Google-colored treatment (G blue, D red,
 * G yellow - three distinct official colors, no cycling, no rainbow,
 * nothing else on the line changes). Toggled again: back to neutral.
 * Persistent and explicitly reversible; instant under reduced motion.
 */
export default function GDGWord() {
  const [on, setOn] = useState(false);
  const reduceMotion = useReducedMotion();

  return (
    <TactileWord label="GDG" onActivate={() => setOn((v) => !v)} ariaPressed={on}>
      <span className="word-anchor">
        {"GDG".split("").map((ch, i) => (
          <motion.span
            key={i}
            animate={on ? { color: GOOGLE_COLORS[i % 3] } : { color: "#f3f1ea" }}
            transition={
              reduceMotion ? { duration: 0.01 } : { duration: 0.25, ease: "easeOut" }
            }
          >
            {ch}
          </motion.span>
        ))}
      </span>
    </TactileWord>
  );
}