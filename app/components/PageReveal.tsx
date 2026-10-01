"use client";

import { useEffect } from "react";

/**
 * Staggered blur-resolve entrance. Progressive enhancement: the hidden
 * first frame (blur 20px, opacity 0, scale 1.02) only exists while the
 * `.js` class is present, so the page is fully readable without JS.
 *
 * Each slot's reveal class is removed after its animation ends, so no
 * persistent blur filter is left compositing over the page.
 */
export default function PageReveal() {
  useEffect(() => {
    const root = document.documentElement;
    root.classList.add("js");

    const slots = Array.from(document.querySelectorAll<HTMLElement>("[data-reveal]"));
    const timers: number[] = [];
    const cleanups: Array<() => void> = [];

    slots.forEach((slot, i) => {
      // slightly slower drama for the intro sentence, 100ms between slots
      const dur = slot.dataset.revealDur ?? (slot.id === "intro" ? "1.1s" : "0.8s");
      slot.style.setProperty("--reveal-dur", dur);
      slot.style.setProperty("--reveal-delay", `${i * 100}ms`);
      slot.classList.add("reveal");

      const done = () => slot.classList.remove("reveal");
      slot.addEventListener("animationend", done, { once: true });
      cleanups.push(() => slot.removeEventListener("animationend", done));
    });

    // safety: never leave a slot blurred/hidden if an event is missed
    const failsafe = window.setTimeout(() => {
      slots.forEach((slot) => slot.classList.remove("reveal"));
    }, 5000);

    return () => {
      timers.forEach(clearTimeout);
      cleanups.forEach((fn) => fn());
      clearTimeout(failsafe);
      root.classList.remove("js");
    };
  }, []);

  return null;
}