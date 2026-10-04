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
 * ONE-TIME FIRST-ENCOUNTER GLINT (module scope, shared by every
 * TactileWord): a singleton IntersectionObserver watches each
 * .word-button once - but nothing may shimmer before PageReveal
 * announces `interactive-shimmer-ready` (the intro text must be sharp
 * first). Words already visible when the event fires glint then,
 * staggered ~100ms in DOM order; words below the fold glint later the
 * first time the observer sees them. The glint itself is a narrow
 * white band sweeping left->right across the OUTER button only
 * (::before overlay - child animations are never touched).
 * dataset.shimmered makes it strictly one-shot per session;
 * reduced-motion disables it entirely.
 */
let shimmerObserver: IntersectionObserver | null = null;
let shimmerReady = false;
let readyBound = false;
const pendingShimmers: HTMLElement[] = [];
const pendingSeen = new Set<HTMLElement>();

function bindReady() {
  if (readyBound) return;
  readyBound = true;
  window.addEventListener("interactive-shimmer-ready", () => {
    shimmerReady = true;
    const batch = pendingShimmers.splice(0);
    pendingSeen.clear();
    batch.forEach((el, i) => fireShimmer(el, i));
  });
}

function fireShimmer(el: HTMLElement, i: number) {
  if (el.dataset.shimmered === "1") return; // strictly one-shot
  el.dataset.shimmered = "1"; // one-time per page session
  shimmerObserver?.unobserve(el);
  el.classList.add("is-shimmering");
  el.style.animationDelay = `${i * 100}ms`; // ~90-120ms stagger
  const done = () => {
    el.classList.remove("is-shimmering");
    el.style.animationDelay = "";
  };
  el.addEventListener("animationend", done, { once: true });
  // safety net if animationend never fires (tab hidden, etc.)
  window.setTimeout(done, 1600);
}

function getShimmerObserver() {
  if (typeof IntersectionObserver === "undefined") return null;
  bindReady();
  shimmerObserver ??= new IntersectionObserver(
    (entries) => {
      entries.forEach((entry, i) => {
        if (!entry.isIntersecting) return;
        const el = entry.target as HTMLElement;
        if (!shimmerReady) {
          // the reveal is still running: hold the word (deduped - the
          // reveal's rise/blur re-fires visibility events) - it will
          // glint the moment `interactive-shimmer-ready` fires
          if (pendingSeen.has(el)) return;
          pendingSeen.add(el);
          pendingShimmers.push(el);
          return;
        }
        fireShimmer(el, i);
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