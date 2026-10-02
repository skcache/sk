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
 * At rest: a completely ordinary K - "Keywords Studios", no box, no
 * dead space. Active: the official Keywords mark (their own favicon
 * asset) opens the K slot fluidly - the box springs from letter width
 * to mark width while the mark fades in, and `eywords Studios`
 * glides aside. The organization text turns brand blue. Click again:
 * the space closes back to the K. Give and take.
 */
export default function KeywordsWord() {
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
    : { duration: 0.14, ease: "easeInOut" as const };
  const fadeClose = reduceMotion ? { duration: 0.01 } : { duration: 0.13, ease: "easeOut" as const };

  return (
    <TactileWord
      label="Keywords Studios"
      onActivate={() => {
        if (on) setClosing(true);
        else setOn(true);
      }}
      ariaPressed={on}
      className="identity-btn"
    >
      <span className="identity-slot">
        {on || closing ? (
          <motion.span
            key="k-box"
            className="k-markbox"
            initial={{ width: "0.6em" }}
            animate={{ width: closing ? "0.6em" : "1.2em", opacity: closing ? 0 : 1 }}
            transition={{ width: closing ? twClose : twOpen, opacity: closing ? fadeClose : t }}
            onAnimationComplete={() => {
              if (closing) {
                setClosing(false);
                setOn(false);
              }
            }}
          >
            <motion.img
              src="/kw-mark.svg"
              alt=""
              className="k-mark"
              initial={{ opacity: 0, scale: 0.85 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={t}
            />
          </motion.span>
        ) : (
          <span className="k-letter">K</span>
        )}
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