"use client";

import { useEffect } from "react";
import { useReducedMotion } from "motion/react";

/**
 * One-shot intro tour. After the entrance settles, plays UC San Diego ->
 * inference -> basketball ~250ms apart. Never loops, never autoplays under
 * reduced motion, and never touches GDG / Keywords.
 *
 * It drives the same tactile buttons the user would press, so manual
 * replay afterwards works exactly as before.
 */
export default function IntroAutoplay() {
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    if (reduceMotion) return;

    const press = (label: string) => {
      const el = document.querySelector<HTMLElement>(`button[aria-label="${label}"]`);
      el?.click();
    };

    // entrance settles at ~1.4s (intro slot: 100ms delay + 1.1s)
    const t1 = window.setTimeout(() => press("UC San Diego"), 1500);
    const t2 = window.setTimeout(() => press("inference"), 1750);
    const t3 = window.setTimeout(() => press("basketball"), 2000);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
    };
  }, [reduceMotion]);

  return null;
}