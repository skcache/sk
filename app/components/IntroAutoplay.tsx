"use client";

import { useEffect } from "react";
import { useReducedMotion } from "motion/react";

/**
 * One-shot signature tour. After the page entrance fully resolves, plays
 * ONLY `inference` (the signature interaction) once. UCSD and
 * basketball stay discoverable through their physical inline plates and
 * manual interaction. Never loops, never autoplays under reduced motion,
 * never touches GDG / Keywords.
 *
 * It drives the real press path (pointerdown/pointerup), so the
 * autoplay exercises the exact same actuation as a real tap.
 */
export default function IntroAutoplay() {
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    if (reduceMotion) return;

    const press = (label: string) => {
      const el = document.querySelector<HTMLElement>(`button[aria-label="${label}"]`);
      if (!el) return;
      el.dispatchEvent(
        new PointerEvent("pointerdown", { bubbles: true, button: 0, pointerType: "touch" })
      );
      el.dispatchEvent(
        new PointerEvent("pointerup", { bubbles: true, button: 0, pointerType: "touch" })
      );
    };

    // entrance: footer slot = 4 x 100ms stagger + 0.8s reveal, done by
    // ~1.35s post-hydration; give it a short stillness, then inference.
    const t = window.setTimeout(() => press("inference"), 1700);

    return () => clearTimeout(t);
  }, [reduceMotion]);

  return null;
}