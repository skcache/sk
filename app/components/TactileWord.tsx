"use client";

import { useCallback, useRef, useState } from "react";
import { motion, useReducedMotion } from "motion/react";

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
    <motion.button
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
  );
}