"use client";

import { motion, useReducedMotion } from "motion/react";

/**
 * Shared physical base for every interactive word.
 *
 * Owns: semantic button behavior, instant press compression, spring
 * return, keyboard activation, focus, tap-highlight removal, and
 * reduced-motion handling for the PRESS itself (no movement when
 * reduced). Interaction choreography lives in the caller, which also
 * owns its run/retrigger state.
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
      whileTap={reduceMotion ? undefined : { scale: 0.978, y: 1 }}
      transition={{ type: "spring", stiffness: 800, damping: 42, mass: 0.45 }}
      className={`word-button ${className}`}
    >
      {children}
    </motion.button>
  );
}