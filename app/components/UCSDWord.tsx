"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { RefObject } from "react";
import { createPortal } from "react-dom";
import { useReducedMotion } from "motion/react";
import TactileWord from "./TactileWord";
import TridentMark from "./TridentMark";

/* THE ONE TIMING CONTRACT. Every number of the choreography lives
   here and nowhere else.
   - navy paint front: 0 -> navyEnd, ONE straight linear rise
   - gold paint front: goldStart -> goldEnd (linear), chasing navy
     before it finishes - zero white gap
   - goldEnd -> total: BOTH overlays fade to normal ink - no parked
     gold, no pause at full color
   - shimmerAt + shimmerDur: the trident completion bloom over the
     settled ink; cleanBeat of clean fully-formed trident; then the
     throw at total + cleanBeat. */
const UCSD_TIMING = {
  total: 860, // both overlays fully transparent - normal ink
  navyEnd: 420, // navy fully painted
  goldStart: 320, // the chase - well before navy finishes
  goldEnd: 740, // gold reaches the top
  shimmerAt: 740, // the trident completion bloom
  shimmerDur: 80, // 740 -> 820, then neutral
  cleanBeat: 60, // clean fully-formed trident over SETTLED ink
};

/* The actuation beat: TactileWord calls onActivate on pointer-up,
   the same event that starts the key's spring return. For UCSD we
   wait one tiny beat so the interaction reads PRESS -> SNAP ->
   RESPONSE instead of everything firing at once. */
const ACTUATION_MS = 50;

/* Trident + flight constants (also defined once). */
const MARK_W = 84;
const MARK_H = 26;
const FLIGHT_SPEED = 1.1; // px/ms - perceived horizontal speed
const THROW_EASE = "cubic-bezier(0.16, 0.8, 0.3, 1)"; // stored energy release
const THROW_ROTATION = 2.5; // tiny nose-down tilt (deg) on the throw
/* When the phrase sits mid-paragraph (mobile lines reach under the
   trident band), the mark must float ABOVE the preceding line's
   glyphs instead of rendering over them. On desktop the previous
   line usually ends before the phrase, so the tight 6px gap stays. */
const RAISE_CLEARANCE = 40;

const PHRASE = "UC San Diego";

type UcsdState = "idle" | "building" | "flying";

/**
 * UC San Diego - CLICK ONLY. No page-load animation: at load the
 * phrase is ordinary site ink.
 *
 * CLICK: PRESS -> SNAP (TactileWord) -> ACTUATION_MS beat -> the
 * WHOLE PHRASE sweeps NAVY bottom -> top with a restrained navy
 * glow riding the rise, then GOLD chases directly over it (before
 * navy finishes - zero white gap) with its own warm glow. The
 * lights hand off (navy glow yields as gold takes ownership), then
 * both overlays fade almost immediately after gold completes, and
 * the phrase is ordinary ink again by total.
 *
 * While the colors rise, the minimalist GOLD trident materializes
 * above the phrase as ONE unit (the whole mark reveals on the same
 * paint clock), catches one tiny warm completion bloom, holds
 * cleanly over the settled ink, then flies left -> right off the
 * viewport. Then everything returns to IDLE.
 *
 * The paint is TWO whole-phrase overlay spans: ONE clip reveal per
 * overlay (linear) + ONE glow envelope per overlay. No letters are
 * animated individually, no stagger, no masks, no crests.
 */
export default function UCSDWord() {
  const reduceMotion = useReducedMotion();
  const [state, setState] = useState<UcsdState>("idle");
  const [origin, setOrigin] = useState<{ left: number; top: number } | null>(null);
  const wordRef = useRef<HTMLSpanElement>(null);
  const navyRef = useRef<HTMLSpanElement>(null);
  const goldRef = useRef<HTMLSpanElement>(null);
  const markRef = useRef<HTMLSpanElement>(null);
  const flyRef = useRef<HTMLDivElement>(null);
  const anims = useRef<Animation[]>([]);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const pendingRef = useRef(false); // the actuation-beat window

  // clean everything -> IDLE. Cancelling the WAAPI drops the layers
  // to their CSS rest state (opacity 0) - instant and unseen.
  const reset = useCallback(() => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
    anims.current.forEach((a) => a.cancel());
    anims.current = [];
    pendingRef.current = false;
    setOrigin(null);
    setState("idle");
  }, []);

  // unmount cleanup reads the CURRENT refs - no stale array capture
  useEffect(() => {
    return () => {
      timers.current.forEach(clearTimeout);
      anims.current.forEach((a) => a.cancel());
    };
  }, []);

  const activate = useCallback(() => {
    // the reentry guard FIRST - applies to every motion preference
    if (state !== "idle") return; // ignore while building/flying
    if (pendingRef.current) return; // ignore during the actuation beat
    pendingRef.current = true;
    timers.current.push(
      setTimeout(() => {
        pendingRef.current = false;
        const rect = wordRef.current?.getBoundingClientRect();
        if (!rect) return;
        const left = rect.left + rect.width / 2 - MARK_W / 2;
        const top = rect.top - MARK_H - 6;
        // the trident must never render over the surrounding words:
        // the paragraph layout differs per viewport, so measure the
        // text BEFORE the phrase and, if it occupies the trident's
        // band, raise the mark above that text instead of the tight
        // 6px gap (desktop's previous line usually ends left of the
        // phrase and keeps the tight gap).
        let raisedTop = top;
        const anchor = wordRef.current;
        const host = anchor ? (anchor.closest("p") ?? anchor.parentElement) : null;
        const button = anchor ? anchor.parentElement : null;
        if (host && button) {
          try {
            const range = document.createRange();
            range.setStart(host, 0);
            range.setEnd(button, 0);
            const prev = range.getBoundingClientRect();
            const band = {
              left,
              right: left + MARK_W,
              top,
              bottom: top + MARK_H,
            };
            const collides =
              prev.right > band.left &&
              prev.left < band.right &&
              prev.bottom > band.top &&
              prev.top < band.bottom;
            if (collides) raisedTop = rect.top - MARK_H - RAISE_CLEARANCE;
          } catch {
            // measurement unavailable: keep the tight gap
          }
        }
        setOrigin({ left, top: raisedTop });
        setState("building");
      }, ACTUATION_MS)
    );
  }, [state]);

  // BUILDING: the paint is TWO whole-phrase overlays, each with
  // EXACTLY ONE WAAPI animation that owns ONLY clipPath + opacity.
  // The fronts move at ONE CONSTANT SPEED (whole animation linear -
  // no easing, no mid anchor, no glow keyframe: geometry is never
  // controlled by glow timing). The visible luminosity comes from a
  // constant subtle CSS text-shadow on each overlay - the glow
  // appears to travel because only the REVEALED part of the glowing
  // overlay is visible. The glow is never animated - it is a
  // constant property of the painted layer.
  useEffect(() => {
    if (state !== "building" || !origin) return;
    const T = UCSD_TIMING;
    const runs = anims.current;

    if (reduceMotion) {
      timers.current.push(setTimeout(() => setState("flying"), 40));
      return;
    }

    // NAVY - ONE animation, 0 -> 860, linear:
    //   0:                 hidden
    //   420/860:           fully painted
    //   420-740:           stays under the gold (never fades early)
    //   740/860 -> 1:      clean fade with the gold - normal ink
    {
      const el = navyRef.current;
      if (el) {
        runs.push(
          el.animate(
            [
              { offset: 0, clipPath: "inset(100% 0 0 0)", opacity: 1 },
              { offset: T.navyEnd / T.total, clipPath: "inset(0 0 0 0)", opacity: 1 },
              { offset: T.goldEnd / T.total, clipPath: "inset(0 0 0 0)", opacity: 1 },
              { offset: 1, clipPath: "inset(0 0 0 0)", opacity: 0 },
            ],
            { duration: T.total, easing: "linear", fill: "forwards" }
          )
        );
      }
    }

    // GOLD - ONE animation, 320 -> 860, linear:
    //   0:                 hidden - chases navy before it finishes
    //   420/540:           reaches the top (740 absolute)
    //   420/540 -> 1:      clean fade with the navy (740 -> 860)
    {
      const el = goldRef.current;
      if (el) {
        runs.push(
          el.animate(
            [
              { offset: 0, clipPath: "inset(100% 0 0 0)", opacity: 1 },
              {
                offset: (T.goldEnd - T.goldStart) / (T.total - T.goldStart),
                clipPath: "inset(0 0 0 0)",
                opacity: 1,
              },
              { offset: 1, clipPath: "inset(0 0 0 0)", opacity: 0 },
            ],
            {
              duration: T.total - T.goldStart,
              delay: T.goldStart,
              easing: "linear",
              fill: "forwards",
            }
          )
        );
      }
    }

    // the trident MATERIALIZES AS ONE UNIT on the paint clock: the
    // whole mark reveals bottom -> top and finishes exactly as the
    // phrase finishes painting (then the completion bloom).
    const mark = markRef.current;
    if (mark) {
      runs.push(
        mark.animate(
          [
            { clipPath: "inset(100% 0 0 0)" },
            { clipPath: "inset(0 0 0 0)" },
          ],
          { duration: T.goldEnd, delay: 0, fill: "forwards", easing: "linear" }
        )
      );
      // the completion bloom: tiny warm glint (LOCKED, not
      // POWER-UP); the filter is neutral before any flight frame
      runs.push(
        mark.animate(
          [
            { filter: "drop-shadow(0 0 0 rgba(242, 193, 78, 0)) brightness(1)" },
            {
              offset: 0.5,
              filter: "drop-shadow(0 0 6px rgba(242, 193, 78, 0.4)) brightness(1.08)",
            },
            { filter: "drop-shadow(0 0 0 rgba(242, 193, 78, 0)) brightness(1)" },
          ],
          { duration: T.shimmerDur, delay: T.shimmerAt, fill: "forwards", easing: "ease-in-out" }
        )
      );
    }

    // the throw waits for the phrase to be FULLY settled ink plus a
    // clean beat - the word is completely normal before the flight
    timers.current.push(
      setTimeout(() => setState("flying"), T.total + T.cleanBeat)
    );
  }, [state, origin, reduceMotion]);

  // FLYING: ONE deterministic WAAPI transform. The trident is
  // already positioned (left/top); only the transform animates, with
  // a tiny nose-down rotation for the stored-energy release.
  useEffect(() => {
    if (state !== "flying" || !origin) return;
    const box = flyRef.current;
    if (!box) return;
    const dx = window.innerWidth - origin.left + MARK_W + 20;
    const dur = reduceMotion
      ? 300
      : Math.min(750, Math.max(420, dx / FLIGHT_SPEED));
    const fly = box.animate(
      [
        { transform: `translate3d(0, 0, 0) rotate(0deg)` },
        { transform: `translate3d(${dx}px, 10px, 0) rotate(${THROW_ROTATION}deg)` },
      ],
      { duration: dur, easing: THROW_EASE, fill: "forwards" }
    );
    anims.current.push(fly);
    fly.onfinish = () => reset();
  }, [state, origin, reduceMotion, reset]);

  return (
    <TactileWord label="UC San Diego" onActivate={activate} className="whitespace-nowrap">
      <span className="word-anchor" ref={wordRef}>
        {/* the phrase-level stack: ONE base + TWO whole-phrase
            overlays. The base is the untouched normal ink and
            defines the dimensions. The navy overlay sweeps bottom ->
            top; the gold overlay chases directly over it. No
            per-letter spans, no stagger, no masks, no crests. */}
        <span className="ucsd-word">
          <span className="ucsd-base">{PHRASE}</span>
          <span aria-hidden="true" className="ucsd-navy" ref={navyRef}>
            {PHRASE}
          </span>
          <span aria-hidden="true" className="ucsd-gold" ref={goldRef}>
            {PHRASE}
          </span>
        </span>
        {origin && state !== "idle" && (
          <TridentBuild
            origin={origin}
            state={state}
            markRef={markRef}
            flyRef={flyRef}
          />
        )}
      </span>
    </TactileWord>
  );
}

/**
 * The trident portal: mounted at click start, locked at its spawn
 * position (the formation moves NOTHING - only the reveal clip
 * progresses). Once the phrase has fully settled and the completion
 * beat passes, the wrapper's transform is animated by the parent's
 * WAAPI flight. Rendered via portal so the coordinates are
 * viewport-true.
 */
function TridentBuild({
  origin,
  state,
  markRef,
  flyRef,
}: {
  origin: { left: number; top: number };
  state: "building" | "flying";
  markRef: RefObject<HTMLSpanElement | null>;
  flyRef: RefObject<HTMLDivElement | null>;
}) {
  return createPortal(
    <div className="ucsd-trident-wrap" aria-hidden="true">
      <div
        className="ucsd-trident-fly"
        ref={flyRef}
        style={{ left: origin.left, top: origin.top, width: MARK_W, height: MARK_H }}
        data-state={state}
      >
        <TridentMark width={MARK_W} height={MARK_H} markRef={markRef} />
      </div>
    </div>,
    document.body
  );
}