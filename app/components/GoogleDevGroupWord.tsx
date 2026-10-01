"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import TactileWord from "./TactileWord";

// Official Google core identity palette (wordmark order).
const GOOGLE = ["#4285F4", "#EA4335", "#FBBC05", "#34A853"] as const;

const FULL = "Google Dev Group";

/**
 * GDG identity interaction.
 *
 * Rest: "GDG" (short form, neutral).
 *
 * Click: fast, smooth sequence:
 *   GDG expands to "Google Dev Group" (chars resolve left to right)
 *   -> a colored pass sweeps the phrase into the official four-color
 *   Google treatment (wordmark order)
 *   -> the official GDG G stamps in beside the phrase
 *   the full state persists.
 *
 * Click again: logo retreats, colors dissolve, phrase collapses back
 * to "GDG". Reduced motion: instant swap both ways.
 */
export default function GoogleDevGroupWord() {
  const reduceMotion = useReducedMotion();
  const [on, setOn] = useState(false); // persistent full state
  const [full, setFull] = useState(false); // phrase expanded
  const [colorPass, setColorPass] = useState(false); // colored pass done
  const [mark, setMark] = useState(false); // logo mounted
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  const clear = useCallback(() => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
  }, []);

  useEffect(() => clear, [clear]);

  const activate = useCallback(() => {
    clear();
    if (!on) {
      // expand -> color pass -> logo, fast and smooth
      setFull(true);
      timers.current = [
        setTimeout(() => setColorPass(true), reduceMotion ? 0 : 300),
        setTimeout(() => setMark(true), reduceMotion ? 0 : 560),
        setTimeout(() => setOn(true), reduceMotion ? 0 : 620),
      ];
    } else {
      // reverse: logo out, colors dissolve, phrase collapses
      setMark(false);
      timers.current = [
        setTimeout(() => setColorPass(false), reduceMotion ? 0 : 140),
        setTimeout(() => setFull(false), reduceMotion ? 0 : 280),
        setTimeout(() => setOn(false), reduceMotion ? 0 : 320),
      ];
    }
  }, [on, reduceMotion, clear]);

  return (
    <TactileWord label="GDG" onActivate={activate} ariaPressed={on} className="whitespace-nowrap">
      <span className="identity-slot">
        {!full ? (
          <motion.span
            key="short"
            initial={false}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            GDG
          </motion.span>
        ) : (
          <motion.span key="full" className="gdg-full">
            {FULL.split("").map((c, i) => (
              /* outer: entry resolve; inner: colored pass sweep */
              <motion.span
                key={i}
                initial={{ opacity: 0, y: 2 }}
                animate={{ opacity: 1, y: 0 }}
                transition={
                  reduceMotion
                    ? { duration: 0.01 }
                    : { delay: 0.03 + i * 0.014, duration: 0.14, ease: "easeOut" }
                }
              >
                <motion.span
                  initial={false}
                  animate={{
                    color: colorPass ? GOOGLE[i % 4] : "inherit",
                  }}
                  transition={
                    reduceMotion
                      ? { duration: 0.01 }
                      : { delay: 0.3 + i * 0.018, duration: 0.18, ease: "easeOut" }
                  }
                >
                  {c === " " ? "\u00A0" : c}
                </motion.span>
              </motion.span>
            ))}
            {/* official GDG G fades in at the end of the sequence */}
            {mark && (
              <motion.img
                key="gdg-mark"
                src="/gdg-mark.svg"
                alt=""
                className="identity-mark"
                initial={{ opacity: 0, scale: 0.7 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={reduceMotion ? { duration: 0.01 } : { duration: 0.18, ease: "easeOut" }}
              />
            )}
          </motion.span>
        )}
      </span>
    </TactileWord>
  );
}