"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import TactileWord from "./TactileWord";
import { useStage } from "./StageProvider";

const WIPE_DELAY = 1100; // after the page reveal settles
const POP_MS = 620; // word-side pop window

/**
 * UC San Diego, the V2 way.
 *
 * FIRST LOAD: once, after the page reveal settles, the phrase gets one
 * left-to-right color pass - UCSD navy -> gold painted across the text
 * (clip-path reveal via .ucsd-paint), then returns to plain ink. No
 * trident autoplay, never repeats. Reduced motion: no pass.
 *
 * CLICK: a small trident pops above the word (rise + tilt, ~0.5s),
 * then the stage runs a larger trident projectile left->right. Extra
 * clicks are ignored while one throw is running.
 */
function TridentMark({ size = 16 }: { size?: number }) {
  return (
    <svg viewBox="0 0 14 14" width={size} height={size} fill="none" aria-hidden="true">
      <path d="M7 13.5V5.5" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" />
      <path d="M1.5 6h11" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" />
      <path d="M4 6V2M10 6V2" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" />
    </svg>
  );
}

export default function UCSDWord() {
  const reduceMotion = useReducedMotion();
  const { open, active } = useStage();
  const [wipe, setWipe] = useState(false);
  const [pop, setPop] = useState(0);
  const wipeRef = useRef<HTMLSpanElement>(null);
  const popTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ONE left-to-right color pass after the reveal settles
  useEffect(() => {
    if (reduceMotion) return;
    const t = setTimeout(() => setWipe(true), WIPE_DELAY);
    return () => clearTimeout(t);
  }, [reduceMotion]);

  // after the pass completes, return the phrase to plain ink
  useEffect(() => {
    if (!wipe || !wipeRef.current) return;
    const el = wipeRef.current;
    const done = () => setWipe(false);
    el.addEventListener("animationend", done, { once: true });
    return () => el.removeEventListener("animationend", done);
  }, [wipe]);

  const clearPop = useCallback(() => {
    if (popTimer.current) {
      clearTimeout(popTimer.current);
      popTimer.current = null;
    }
  }, []);

  const activate = useCallback(() => {
    if (active === "ucsd") return; // one throw at a time
    clearPop();
    setPop((p) => p + 1);
    popTimer.current = setTimeout(() => {
      setPop(0);
      popTimer.current = null;
    }, POP_MS);
    open("ucsd");
  }, [active, open, clearPop]);

  useEffect(() => clearPop, [clearPop]);

  return (
    <TactileWord label="UC San Diego" onActivate={activate} className="whitespace-nowrap">
      <span className="word-anchor">
        <span
          ref={wipeRef}
          className={`ucsd-word${wipe && !reduceMotion ? " ucsd-paint run" : ""}`}
        >
          UC San Diego
        </span>
        {pop > 0 && (
          <motion.span
            key={`pop-${pop}`}
            className="ucsd-pop"
            aria-hidden="true"
            initial={{ opacity: 0, y: 10, rotate: -8, scale: 0.9 }}
            animate={{
              opacity: [0, 1, 1, 0],
              y: [10, -4, -8, -16],
              rotate: [-8, 5, -2, 10],
              scale: [0.9, 1, 1.03, 1],
            }}
            transition={{ duration: 0.5, times: [0, 0.18, 0.72, 1], ease: "easeOut" }}
          >
            <TridentMark size={18} />
          </motion.span>
        )}
      </span>
    </TactileWord>
  );
}