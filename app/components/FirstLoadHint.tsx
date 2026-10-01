"use client";

import { useEffect } from "react";
import { useReducedMotion } from "motion/react";

/**
 * One-time discoverability cue. On first page load only, the interactive
 * words' faint dotted underline briefly draws in (~700ms, once, never
 * loops), then the page returns to still. Skipped entirely for
 * reduced-motion users. Rendering nothing: pure side effect.
 */
export default function FirstLoadHint() {
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    if (reduceMotion === true) return;
    const buttons = document.querySelectorAll<HTMLElement>(".word-button");
    const start = setTimeout(() => {
      buttons.forEach((b) => b.classList.add("first-hint"));
    }, 350);
    const end = setTimeout(() => {
      buttons.forEach((b) => b.classList.remove("first-hint"));
    }, 1700);
    return () => {
      clearTimeout(start);
      clearTimeout(end);
    };
  }, [reduceMotion]);

  return null;
}