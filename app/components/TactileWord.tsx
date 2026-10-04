"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { motion, useReducedMotion } from "motion/react";

/**
 * ONE-TIME FIRST-ENCOUNTER SHIMMER (module scope, shared by every
 * TactileWord): a singleton IntersectionObserver watches each
 * .word-button once. The first time a word becomes visibly present in
 * the viewport it gets a single ~540ms glisten (brightness + soft
 * white text-shadow on the OUTER button only - child animations are
 * never touched). Words visible together stagger ~80ms apart; a word
 * that scrolls in later starts immediately. dataset.shimmered makes
 * it strictly one-shot per session; reduced-motion disables it.
 */
let shimmerObserver: IntersectionObserver | null = null;

function getShimmerObserver() {
  if (typeof IntersectionObserver === "undefined") return null;
  shimmerObserver ??= new IntersectionObserver(
    (entries) => {
      entries.forEach((entry, i) => {
        if (!entry.isIntersecting) return;
        const el = entry.target as HTMLElement;
        el.dataset.shimmered = "1"; // one-time per page session
        shimmerObserver?.unobserve(el);
        el.classList.add("is-shimmering");
        el.style.animationDelay = `${i * 80}ms`; // ~80ms stagger
        const done = () => {
          el.classList.remove("is-shimmering");
          el.style.animationDelay = "";
        };
        el.addEventListener("animationend", done, { once: true });
        // safety net if animationend never fires (tab hidden, etc.)
        window.setTimeout(done, 1600);
      });
    },
    { threshold: 0.2 }
  );
  return shimmerObserver;
}

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

  // ONE-TIME DISCOVERY SHIMMER: register this word with the shared
  // observer (no replay on scroll, no restart on clicks; disabled
  // under prefers-reduced-motion). StrictMode-safe: observing the
  // same element twice is idempotent and dataset.shimmered guards
  // the fire.
  useEffect(() => {
    const el = rootRef.current;
    if (!el || reduceMotion) return;
    if (el.dataset.shimmered === "1") return;
    const observer = getShimmerObserver();
    if (!observer) return;
    observer.observe(el);
    return () => observer.unobserve(el);
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
  );
}