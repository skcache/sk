"use client";

import { useEffect, useRef, useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import TactileWord from "./TactileWord";

// Official Google four-color palette, continuous brand order.
// One uniform sweep across the WHOLE phrase so no segment reads
// differently ("Google" B/R/Y/G then "Dev Group" continues the same
// sequence instead of falling flat to a single blue).
const PALETTE = ["#4285F4", "#EA4335", "#FBBC05", "#34A853"] as const;

/**
 * Google Dev Group identity toggle.
 *
 * At rest: one stable, completely ordinary line - "President at
 * Google Dev Group, UC San Diego", no reserved gap before the phrase.
 * active: the official GDG mark (the four-color G from Google's own
 * GDG brand asset on gdg.community.dev, stored at public/gdg-mark.svg)
 * opens its slot fluidly before the phrase - the space springs open
 * from zero as the mark fades in, and "Google" glides aside. The whole
 * "Google Dev Group" phrase then takes ONE uniform treatment: the
 * official four-color palette sweeping continuously across every
 * character (no segment left plain). "UC San Diego" stays neutral.
 * Click again: the space closes smoothly and everything returns.
 */
export default function GoogleDevGroupWord() {
  const [on, setOn] = useState(false);
  const [closing, setClosing] = useState(false);
  const reduceMotion = useReducedMotion();
  const markRef = useRef<HTMLImageElement>(null);

  // the close fade, WAAPI-driven: the mark collapses with the box
  // (same 0.26s easeInOut) - declarative target-changes snap in this
  // motion version, which left the clipped mark riding against the
  // text mid-shrink
  useEffect(() => {
    if (markRef.current) markRef.current.getAnimations().forEach((a) => a.cancel());
    if (!closing || !markRef.current) return;
    const el = markRef.current;
    const anim = el.animate(
      [
        { opacity: 1, transform: "scale(1)" },
        { opacity: 0, transform: "scale(0.8)" },
      ],
      { duration: 260, easing: "ease-in-out", fill: "forwards" },
    );
    return () => anim.cancel();
  }, [closing]);

  const t = reduceMotion
    ? { duration: 0.01 }
    : { type: "spring" as const, stiffness: 850, damping: 30, mass: 0.4 };
  const twOpen = reduceMotion
    ? { duration: 0.01 }
    : { type: "spring" as const, stiffness: 320, damping: 32, mass: 0.9 };
  const twClose = reduceMotion
    ? { duration: 0.01 }
    : { duration: 0.26, ease: "easeInOut" as const };

  const colorFor = (i: number) => {
    if (!on) return undefined;
    // ONE uniform treatment for the entire phrase: every character
    // takes the next official color in the continuous sequence
    // (B, R, Y, G, B, R, ...) - nothing left solid blue.
    return PALETTE[i % PALETTE.length];
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
            animate={{ width: closing ? 0 : "1.76em" }}
            transition={{ width: closing ? twClose : twOpen }}
            onAnimationComplete={() => {
              if (closing) {
                setClosing(false);
                setOn(false);
              }
            }}
          >
            <motion.img
              ref={markRef}
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