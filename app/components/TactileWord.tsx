"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { motion, useMotionValue, useReducedMotion, useSpring, useTransform } from "motion/react";

/**
 * PROXIMITY MAGNETISM (TactileWord, desktop fine pointers only):
 * a tiny magnetic pull + a hair of brightening that ramps with the
 * pointer distance BEFORE hover. The word's wrapper (motion.span
 * .word-proximity) carries a springed x/y translate toward the cursor
 * (max ~2px) and a brightness up to ~1.07 - quadratic distance ramp,
 * zero beyond PROX_RADIUS. It never competes with the press: the
 * button's own tactile transform lives INSIDE the wrapper, so the two
 * compose. Touch/coarse pointers and prefers-reduced-motion disable
 * it entirely.
 */
const PROX_RADIUS = 120; // px - effect starts inside this ring
const PROX_PULL_MAX = 2; // px - the strongest magnetic offset
const PROX_GLOW_MAX = 0.07; // brightness(1.07) at closest approach
const PROX_SPRING = { stiffness: 320, damping: 30, mass: 0.6 } as const;

/**
 * Shared physical base for every interactive word.
 *
 * NO BOX. At rest the word is normal inline typography with only a faint
 * dotted underline as an affordance. The press is a mechanism:
 *
 * - pointer/key down  -> immediate 1px travel + uniform 0.987 scale.
 *   Rigid object, no per-axis glyph squash, no rubbery deformation.
 * - release           -> the key snaps back on a heavily damped spring
 *   (stiffness 1150 / damping 68 / mass 0.25), THEN the caller's
 *   bespoke identity response begins. The click itself is the feedback.
 * - keyboard Enter/Space actuate the same travel visibly.
 */
export default function TactileWord({
  label,
  onActivate,
  className = "",
  ariaPressed,
  children,
}: {
  label: string;
  onActivate: () => void;
  className?: string;
  ariaPressed?: boolean;
  children?: React.ReactNode;
}) {
  const reduceMotion = useReducedMotion();
  const [down, setDown] = useState(false);
  const downRef = useRef(false);
  const rootRef = useRef<HTMLButtonElement>(null);

  // ---- proximity magnetism: springed motion values, updated straight
  // from pointermove (no re-renders), reset to zero outside the ring
  const finePointer = useRef(false);
  useEffect(() => {
    const mq = window.matchMedia("(pointer: fine)");
    finePointer.current = mq.matches;
    const onChange = (e: MediaQueryListEvent) => (finePointer.current = e.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  const proxX = useMotionValue(0);
  const proxY = useMotionValue(0);
  const proxGlow = useMotionValue(0);
  const springX = useSpring(proxX, PROX_SPRING);
  const springY = useSpring(proxY, PROX_SPRING);
  const springGlow = useSpring(proxGlow, PROX_SPRING);
  const proxFilter = useTransform(springGlow, (g) => `brightness(${1 + g})`);

  useEffect(() => {
    if (reduceMotion) return; // disabled entirely under reduced motion
    const handleMove = (e: PointerEvent) => {
      if (e.pointerType !== "mouse" || !finePointer.current) return;
      const el = rootRef.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      const cx = r.left + r.width / 2;
      const cy = r.top + r.height / 2;
      const dx = e.clientX - cx;
      const dy = e.clientY - cy;
      const d = Math.hypot(dx, dy);
      if (d > PROX_RADIUS) {
        proxX.set(0);
        proxY.set(0);
        proxGlow.set(0);
        return;
      }
      const ramp = (1 - d / PROX_RADIUS) ** 2; // smooth quadratic fade
      const pull = PROX_PULL_MAX * ramp;
      const s = pull / Math.max(d, 8); // toward the cursor; floored dead-center
      proxX.set(dx * s);
      proxY.set(dy * s);
      proxGlow.set(PROX_GLOW_MAX * ramp);
    };
    window.addEventListener("pointermove", handleMove, { passive: true });
    return () => window.removeEventListener("pointermove", handleMove);
  }, [reduceMotion]);

  const press = useCallback(() => {
    downRef.current = true;
    setDown(true);
  }, []);

  const release = useCallback(() => {
    if (!downRef.current) return;
    downRef.current = false;
    setDown(false);
    onActivate(); // bespoke animation starts AFTER the key returns
  }, [onActivate]);

  const cancel = useCallback(() => {
    downRef.current = false;
    setDown(false);
  }, []);

  return (
    <motion.span
      className="word-proximity"
      style={{ x: springX, y: springY, filter: proxFilter }}
    >
      <motion.button
        ref={rootRef}
        type="button"
        aria-label={label}
        aria-pressed={ariaPressed}
        className={`word-button ${down ? "is-pressed" : ""} ${className}`}
        onPointerDown={(e) => {
          if (e.button === 0) press();
        }}
        onPointerUp={release}
        onPointerCancel={cancel}
        onPointerLeave={(e) => {
          // dragging off the key cancels the press (mouse only; touch
          // resolves through pointerup/pointercancel instead)
          if (e.pointerType === "mouse" && downRef.current) cancel();
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            if (!e.repeat) press();
          }
        }}
        onKeyUp={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            release();
          }
        }}
        onBlur={cancel}
        animate={down && !reduceMotion ? { y: 1, scale: 0.987 } : { y: 0, scale: 1 }}
        transition={
          down
            ? { duration: 0.035, ease: "easeOut" } // immediate actuation
            : {
                // hard snap back: critically overdamped, no visible bounce
                type: "spring",
                stiffness: 1150,
                damping: 68,
                mass: 0.25,
              }
        }
        style={{ WebkitTapHighlightColor: "transparent" }}
      >
        {children}
      </motion.button>
    </motion.span>
  );
}