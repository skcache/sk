"use client";

import { useLayoutEffect } from "react";
import gsap from "gsap";

/**
 * Page-load reveal, GSAP timeline (per the animation audit: hand-rolled
 * CSS with fixed 100ms offsets was imperceptible). Every [data-reveal]
 * slot now enters in a REAL stagger (~300ms between slots, intro the
 * final anchor), a soft blur->sharp resolve with 18px rise, 0.9-1.0s
 * per slot, power3.out. The stagger is what reads; no JS = page is
 * plainly visible (progressive enhancement: the .js-hidden state only
 * exists while 'js' is on the root).
 */
export default function PageReveal() {
  useLayoutEffect(() => {
    const root = document.documentElement;
    root.classList.add("js");

    const slots = Array.from(document.querySelectorAll<HTMLElement>("[data-reveal]"));
    if (!slots.length) return;

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const failsafe = window.setTimeout(() => {
      gsap.set(slots, { opacity: 1, y: 0, filter: "blur(0px)", clearProps: "all" });
    }, 6000);

    if (reduce) {
      gsap.set(slots, { opacity: 1, clearProps: "all" });
      return () => {
        clearTimeout(failsafe);
        root.classList.remove("js");
      };
    }

    const tl = gsap.timeline();
    slots.forEach((slot, i) => {
      const dramatic = slot.id === "intro";
      tl.fromTo(
        slot,
        { opacity: 0, y: 20, filter: "blur(14px)" },
        {
          opacity: 1,
          y: 0,
          filter: "blur(0px)",
          duration: dramatic ? 0.575 : 0.9,
          ease: "power3.out",
        },
        i * 0.3, // ~300ms offset between slots: a human-perceivable cascade
      );
    });

    return () => {
      clearTimeout(failsafe);
      tl.kill();
      root.classList.remove("js");
    };
  }, []);

  return null;
}
