"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { RefObject } from "react";
import { createPortal } from "react-dom";
import { useReducedMotion } from "motion/react";
import TactileWord from "./TactileWord";
import TridentMark from "./TridentMark";

/* THE ONE TIMING CONTRACT. Every number of the choreography lives
   here and nowhere else:
   - navy phrase sweep + trident staff reveal: navyStart -> navyEnd
   - gold chase + trident head reveal: goldStart -> goldEnd
   - settle: the overlays fade to reveal the ink base by settleEnd
   - hold: the completion beat - the shimmer window and the gap
     before the throw
   - total: the phrase is fully ordinary ink by total
   The component builds the whole WAAPI timeline from these values;
   CSS knows only the rest states. No scattered durations anywhere. */
const UCSD_TIMING = {
  total: 900,
  navyStart: 0,
  navyEnd: 340,
  goldStart: 250,
  goldEnd: 640,
  settleEnd: 800,
  hold: 90,
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
const RISE_EASE = "cubic-bezier(0.22, 1, 0.36, 1)"; // quick, graceful settle
const THROW_EASE = "cubic-bezier(0.16, 0.8, 0.3, 1)"; // stored energy release
const THROW_ROTATION = 2.5; // tiny nose-down tilt (deg) on the throw
/* When the phrase sits mid-paragraph (mobile lines reach under the
   trident band), the mark must float ABOVE the preceding line's
   glyphs instead of rendering over them. On desktop the previous
   line usually ends before the phrase, so the tight 6px gap stays. */
const RAISE_CLEARANCE = 40;

const PHRASE = "UC San Diego";

/* The sweep glow: the bloom rides the reveal - hidden, then rising
   with the color front, then softening as the layer fully lands.
   NAVY and GOLD hand off; at settle the glow leaves with the fade. */
const GLOW_NAVY = [
  "0 1px 0 rgba(24, 43, 73, 0)",
  "0 1px 14px rgba(24, 43, 73, 0.52)",
  "0 1px 10px rgba(24, 43, 73, 0.22)",
];
const GLOW_GOLD = [
  "0 1px 0 rgba(198, 146, 20, 0)",
  "0 1px 14px rgba(198, 146, 20, 0.46)",
  "0 1px 10px rgba(198, 146, 20, 0.18)",
];
const NO_GLOW = "0 1px 0 rgba(0, 0, 0, 0)";

type UcsdState = "idle" | "building" | "flying";

/**
 * UC San Diego - CLICK ONLY. No page-load animation: at load the
 * phrase is ordinary site ink and stays that way until the user
 * clicks it.
 *
 * CLICK: PRESS -> SNAP (the TactileWord key) -> ACTUATION_MS beat ->
 * the phrase sweeps NAVY bottom -> top with a soft navy bloom riding
 * the reveal, GOLD chases directly over it (no white gap) with its
 * own warm bloom handing off from the navy, then both fade to reveal
 * the ink base. While the colors rise, the minimalist GOLD trident
 * materializes above the phrase (staff with the navy timing, head
 * with the gold timing - the passes set TIMING only). Once the
 * phrase is fully back to ink the trident catches a tiny golden
 * shimmer (construction complete), settles, and flies left -> right
 * off the viewport. Then everything returns to IDLE.
 *
 * The paint + formation + glow + shimmer are ONE WAAPI timeline from
 * UCSD_TIMING; the flight is ONE deterministic WAAPI transform
 * (distance-based duration, translate3d, no per-frame physics). The
 * overlays rest at opacity 0, so all resets are instant and
 * invisible - a reverse wipe is structurally impossible.
 */
export default function UCSDWord() {
  const reduceMotion = useReducedMotion();
  const [state, setState] = useState<UcsdState>("idle");
  const [origin, setOrigin] = useState<{ left: number; top: number } | null>(null);
  const wordRef = useRef<HTMLSpanElement>(null);
  const navyRef = useRef<HTMLSpanElement>(null);
  const goldRef = useRef<HTMLSpanElement>(null);
  const staffRef = useRef<HTMLSpanElement>(null);
  const headRef = useRef<HTMLSpanElement>(null);
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

  // BUILDING: the phrase paint + glow + the trident formation - one
  // WAAPI timeline from the ONE timing contract. The trident never
  // moves here; only its reveal progresses.
  useEffect(() => {
    if (state !== "building" || !origin) return;
    const T = UCSD_TIMING;
    const runs = anims.current;

    if (reduceMotion) {
      timers.current.push(setTimeout(() => setState("flying"), 40));
      return;
    }

    const clip = (el: HTMLElement | null, dur: number, delay: number) => {
      if (!el) return;
      runs.push(
        el.animate(
          [
            {
              clipPath: "inset(100% 0 0 0)",
              maskSize: "100% 0%",
              WebkitMaskSize: "100% 0%",
            },
            {
              clipPath: "inset(0 0 0 0)",
              maskSize: "100% 100%",
              WebkitMaskSize: "100% 100%",
            },
          ],
          { duration: dur, delay, fill: "forwards", easing: RISE_EASE }
        )
      );
    };

    // phrase overlays: reveal + the glow riding the SAME clock
    const paint = (
      el: HTMLElement | null,
      dur: number,
      delay: number,
      glow: string[]
    ) => {
      if (!el) return;
      // the clip + the soft mask feather: one clean two-keyframe rise
      runs.push(
        el.animate(
          [
            {
              clipPath: "inset(100% 0 0 0)",
              maskSize: "100% 0%",
              WebkitMaskSize: "100% 0%",
              opacity: 1,
            },
            {
              clipPath: "inset(0 0 0 0)",
              maskSize: "100% 100%",
              WebkitMaskSize: "100% 100%",
              opacity: 1,
            },
          ],
          { duration: dur, delay, fill: "forwards", easing: RISE_EASE }
        )
      );
      // the glow: hidden -> bloom peaks near the moving front ->
      // softens as the layer lands (parallel, same clock)
      runs.push(
        el.animate(
          [
            { textShadow: glow[0] },
            { offset: 0.55, textShadow: glow[1] },
            { textShadow: glow[2] },
          ],
          { duration: dur, delay, fill: "forwards", easing: RISE_EASE }
        )
      );
    };

    // navy phrase sweep + staff reveal: the same numbers
    paint(navyRef.current, T.navyEnd - T.navyStart, T.navyStart, GLOW_NAVY);
    clip(staffRef.current, T.navyEnd - T.navyStart, T.navyStart);
    // gold chases + head reveal: the same numbers, the same delay
    paint(goldRef.current, T.goldEnd - T.goldStart, T.goldStart, GLOW_GOLD);
    clip(headRef.current, T.goldEnd - T.goldStart, T.goldStart);

    // settle: both overlays fade - the glow leaves with them
    const settle = (el: HTMLElement | null, shadow: string) => {
      if (!el) return;
      runs.push(
        el.animate(
          [
            { opacity: 1, textShadow: shadow },
            { opacity: 0, textShadow: NO_GLOW },
          ],
          {
            duration: T.total - T.settleEnd,
            delay: T.settleEnd,
            fill: "forwards",
            easing: "ease",
          }
        )
      );
    };
    settle(navyRef.current, GLOW_NAVY[2]);
    settle(goldRef.current, GLOW_GOLD[2]);

    // phrases are fully ordinary ink by T.total. The trident then
    // catches a clear golden shimmer (construction complete), the
    // glow settles, and the throw starts right after the completion
    // beat - never while the text is still fading.
    const mark = markRef.current;
    if (mark) {
      runs.push(
        mark.animate(
          [
            { filter: "drop-shadow(0 0 0 rgba(198, 146, 20, 0)) brightness(1)", opacity: 1 },
            {
              offset: 0.45,
              filter: "drop-shadow(0 0 12px rgba(198, 146, 20, 0.7)) brightness(1.25)",
              opacity: 0.92,
            },
            {
              offset: 0.82,
              filter: "drop-shadow(0 0 4px rgba(198, 146, 20, 0.28)) brightness(1.04)",
              opacity: 0.98,
            },
            { filter: "drop-shadow(0 0 0 rgba(198, 146, 20, 0)) brightness(1)", opacity: 1 },
          ],
          {
            duration: T.hold,
            delay: T.total,
            fill: "forwards",
            easing: "ease-in-out",
          }
        )
      );
    }

    // completion beat, then the throw
    timers.current.push(
      setTimeout(() => setState("flying"), T.total + T.hold)
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
        {/* the phrase-level paint stack: ONE base + TWO overlays.
            The base defines the dimensions; the overlays are
            absolute duplicates (aria-hidden) that animate their own
            clip + glow - no layout shift, no per-glyph work. */}
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
            staffRef={staffRef}
            headRef={headRef}
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
 * position (the formation moves NOTHING - only the reveal clips).
 * Once the phrase has fully settled and the completion beat passes,
 * the wrapper's transform is animated by the parent's WAAPI flight.
 * Rendered via portal so the coordinates are viewport-true.
 */
function TridentBuild({
  origin,
  state,
  staffRef,
  headRef,
  markRef,
  flyRef,
}: {
  origin: { left: number; top: number };
  state: "building" | "flying";
  staffRef: RefObject<HTMLSpanElement | null>;
  headRef: RefObject<HTMLSpanElement | null>;
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
        <TridentMark
          width={MARK_W}
          height={MARK_H}
          staffRef={staffRef}
          headRef={headRef}
          markRef={markRef}
        />
      </div>
    </div>,
    document.body
  );
}