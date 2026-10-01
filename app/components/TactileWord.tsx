"use client";

import { motion, useReducedMotion } from "motion/react";

/**
 * Shared physical base for every interactive word.
 *
 * Owns: semantic button behavior, instant press compression, spring
 * return, keyboard activation, focus, tap-highlight removal, and
 * reduced-motion handling for the PRESS itself (no movement when
 * reduced). The press is a pure vertical squash anchored to the
 * baseline (transform-origin: left bottom, set in CSS): the word
 * compresses downward like a key press and never floats or shrinks
 * horizontally. Interaction choreography lives in the caller.
 */
export default function TactileWord({
  label,
  onActivate,
  className = "",
  children,
}: {
  label: string;
  onActivate: () => void;
  className?: string;
  children?: React.ReactNode;
}) {
  const reduceMotion = useReducedMotion();

  return (
    <motion.button
      type="button"
      aria-label={label}
      onClick={onActivate}
      whileTap={reduceMotion ? undefined : { scaleY: 0.96 }}
      transition={{ type: "spring", stiffness: 900, damping: 46, mass: 0.4 }}
      className={`word-button ${className}`}
    >
      {children}
    </motion.button>
  );
}