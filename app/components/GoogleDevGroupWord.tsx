"use client";

import { useCallback, useLayoutEffect, useRef, useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import TactileWord from "./TactileWord";

// Official Google core identity palette (wordmark order).
const GOOGLE = ["#4285F4", "#EA4335", "#FBBC05", "#34A853"] as const;

const FULL = "Google Dev Group";

/**
 * GDG identity interaction. One seamless gesture:
 *
 * Rest: "GDG" (short form, neutral).
 *
 * Click: the box glides open (single continuous width animation, so the
 * sentence's following text flows smoothly - no stepped per-char
 * reflow), the full phrase is revealed through the growing clip, a
 * single color wave blooms through it, and the official G mark pops in
 * as the glide lands. Everything overlaps on one timeline; there are no
 * staged pauses.
 *
 * Click again: the same glide in reverse.
 */
export default function GoogleDevGroupWord() {
  const reduceMotion = useReducedMotion();
  const [on, setOn] = useState(false); // expanded state (persistent)
  const [mounted, setMounted] = useState(false); // overlay mounted
  const [widths, setWidths] = useState<{ s: number; f: number } | null>(null);
  const shortRef = useRef<HTMLSpanElement>(null);
  const fullRef = useRef<HTMLSpanElement>(null);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  const measure = useCallback(() => {
    const s = shortRef.current?.getBoundingClientRect().width ?? 0;
    const f = fullRef.current?.getBoundingClientRect().width ?? s;
    setWidths({ s, f });
  }, []);

  useLayoutEffect(() => {
    measure();
  }, [measure]);

  const clear = useCallback(() => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
  }, []);

  const activate = useCallback(() => {
    clear();
    if (!widths) measure();
    if (!on) {
      // single continuous glide out; everything overlaps on one timeline
      setMounted(true);
      setOn(true);
    } else {
      // same glide in reverse; unmount the overlay after it lands
      setOn(false);
      timers.current = [setTimeout(() => setMounted(false), reduceMotion ? 0 : 480)];
    }
  }, [on, widths, reduceMotion, clear, measure]);

  const boxW = widths ? (on ? widths.f : widths.s) : undefined;

  return (
    <TactileWord label="GDG" onActivate={activate} ariaPressed={on} className="whitespace-nowrap">
      <span className="identity-slot">
        {/* the gliding box: its width is the only thing that moves, so
            surrounding text flows instead of stepping */}
        <motion.span
          className="gdg-box"
          initial={false}
          animate={{ width: boxW ?? "auto", opacity: 1 }}
          transition={
            reduceMotion
              ? { duration: 0.01 }
              : {
                  width: {
                    type: "spring",
                    stiffness: 320,
                    damping: 34,
                    mass: 0.8,
                  },
                }
          }
        >
          {/* short form stays in flow while the overlay takes over */}
          <motion.span
            ref={shortRef}
            className="gdg-short"
            animate={{ opacity: on ? 0 : 1 }}
            transition={reduceMotion ? { duration: 0.01 } : { duration: 0.18, ease: "easeOut" }}
          >
            GDG
          </motion.span>

          {/* full phrase revealed through the growing clip */}
          {mounted && (
            <motion.span
              className="gdg-overlay"
              style={{ width: widths ? widths.f : "max-content" }}
              animate={{ opacity: 1 }}
              initial={{ opacity: 0.999 }}
            >
              {FULL.split("").map((c, i) => (
                <motion.span
                  key={i}
                  initial={false}
                  animate={{ color: on ? GOOGLE[i % 4] : "inherit" }}
                  transition={
                    reduceMotion
                      ? { duration: 0.01 }
                      : { delay: 0.14 + i * 0.012, duration: 0.16, ease: "easeOut" }
                  }
                >
                  {c === " " ? "\u00A0" : c}
                </motion.span>
              ))}
              {/* official G pops in as the glide lands */}
              <motion.img
                src="/gdg-mark.svg"
                alt=""
                className="identity-mark"
                initial={{ opacity: 0, scale: 0.7 }}
                animate={{ opacity: on ? 1 : 0, scale: on ? 1 : 0.7 }}
                transition={
                  reduceMotion
                    ? { duration: 0.01 }
                    : { delay: 0.32, duration: 0.2, ease: "easeOut" }
                }
              />
            </motion.span>
          )}
        </motion.span>

        {/* hidden measuring copy: exactly the expanded phrase */}
        <span ref={fullRef} aria-hidden="true" className="gdg-measure">
          {FULL}
        </span>
      </span>
    </TactileWord>
  );
}