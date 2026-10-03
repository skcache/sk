"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { RefObject } from "react";
import { createPortal } from "react-dom";
import { useReducedMotion } from "motion/react";
import TactileWord from "./TactileWord";
import TridentMark from "./TridentMark";

/* THE ONE TIMING CONTRACT. Every number of the choreography lives
   here and nowhere else:
   - the navy phrase sweep + the trident staff reveal: navyStart ->
     navyEnd
   - the gold chase + the trident head reveal: goldStart -> goldEnd
   - the settle: overlays fade to reveal the ink base by settleEnd
   - the completion beat before the throw: hold
   The component builds the WAAPI timeline from these values; CSS
   knows only the rest states. No scattered durations anywhere. */
const UCSD_TIMING = {
  total: 900,
  navyStart: 0,
  navyEnd: 300,
  goldStart: 260,
  goldEnd: 610,
  settleEnd: 780,
  hold: 90,
};

/* Trident + flight constants (also defined once). */
const MARK_W = 84;
const MARK_H = 26;
const FLIGHT_SPEED = 1.1; // px/ms - perceived horizontal speed
const EASE = "cubic-bezier(0.45, 0, 0.55, 1)";
const THROW_EASE = "cubic-bezier(0.16, 0.8, 0.3, 1)";

const PHRASE = "UC San Diego";

type UcsdState = "idle" | "building" | "flying";

/**
 * UC San Diego - CLICK ONLY. No page-load animation: at load the
 * phrase is ordinary site ink and stays that way until the user
 * clicks it.
 *
 * CLICK: the phrase sweeps NAVY bottom -> top, GOLD chases directly
 * over it (below -> top, no white gap), then both fade to reveal
 * the ink base. While the colors rise, the minimalist GOLD trident
 * materializes above the phrase (staff with the navy timing, head
 * with the gold timing, both gold - the passes set TIMING only).
 * After a short completion beat it flies left -> right and exits
 * the viewport. Then everything returns to IDLE.
 *
 * The paint + formation are ONE WAAPI timeline from UCSD_TIMING;
 * the flight is ONE deterministic WAAPI transform (distance-based
 * duration, translate3d, no per-frame physics). The overlays rest
 * at opacity 0, so all resets are instant and invisible - a reverse
 * wipe is structurally impossible.
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
  const flyRef = useRef<HTMLDivElement>(null);
  const anims = useRef<Animation[]>([]);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  // clean everything -> IDLE. Cancelling the WAAPI drops the layers
  // to their CSS rest state (opacity 0) - instant and unseen.
  const reset = useCallback(() => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
    anims.current.forEach((a) => a.cancel());
    anims.current = [];
    setOrigin(null);
    setState("idle");
  }, []);

  useEffect(() => {
    const t = timers.current;
    const a = anims.current;
    return () => {
      t.forEach(clearTimeout);
      a.forEach((x) => x.cancel());
    };
  }, []);

  const activate = useCallback(() => {
    if (reduceMotion) {
      // no paint: instant ink; the trident forms unseen and throws
      const rect = wordRef.current?.getBoundingClientRect();
      if (!rect) return;
      setOrigin({
        left: rect.left + rect.width / 2 - MARK_W / 2,
        top: rect.top - MARK_H - 6,
      });
      setState("building");
      return;
    }
    if (state !== "idle") return; // ignore while building/flying
    const rect = wordRef.current?.getBoundingClientRect();
    if (!rect) return;
    // SPAWN: mathematically centered above the phrase using the
    // mark's actual rendered width/height - no eyeballed offsets.
    setOrigin({
      left: rect.left + rect.width / 2 - MARK_W / 2,
      top: rect.top - MARK_H - 6,
    });
    setState("building");
  }, [state, reduceMotion]);

  // BUILDING: the phrase paint + the trident formation - one WAAPI
  // timeline from the ONE timing contract. The trident never moves
  // here; only its reveal progresses.
  useEffect(() => {
    if (state !== "building" || !origin) return;
    const T = UCSD_TIMING;
    const runs = anims.current;

    if (reduceMotion) {
      timers.current.push(setTimeout(() => setState("flying"), 40));
      return;
    }

    const reveal = (
      el: HTMLElement | null,
      dur: number,
      delay: number,
      withOpacity = true
    ) => {
      if (!el) return;
      const from: Record<string, string> = {
        clipPath: "inset(100% 0 0 0)",
      };
      const to: Record<string, string> = {
        clipPath: "inset(0 0 0 0)",
      };
      if (withOpacity) {
        from.opacity = "1";
        to.opacity = "1";
      }
      runs.push(
        el.animate([from, to], {
          duration: dur,
          delay,
          fill: "forwards",
          easing: EASE,
        })
      );
    };

    // navy phrase sweep + staff reveal: the same numbers
    reveal(navyRef.current, T.navyEnd - T.navyStart, T.navyStart);
    reveal(staffRef.current, T.navyEnd - T.navyStart, T.navyStart, false);
    // gold chases + head reveal: the same numbers, the same delay
    reveal(goldRef.current, T.goldEnd - T.goldStart, T.goldStart);
    reveal(headRef.current, T.goldEnd - T.goldStart, T.goldStart, false);

    // settle: both overlays fade, revealing the ink base
    for (const el of [navyRef.current, goldRef.current]) {
      if (!el) continue;
      runs.push(
        el.animate([{ opacity: "1" }, { opacity: "0" }], {
          duration: T.total - T.settleEnd,
          delay: T.settleEnd,
          fill: "forwards",
          easing: "ease",
        })
      );
    }

    // completion beat, then the throw
    timers.current.push(
      setTimeout(() => setState("flying"), T.settleEnd + T.hold)
    );
  }, [state, origin, reduceMotion]);

  // FLYING: ONE deterministic WAAPI transform. The trident is
  // already positioned (left/top); only the transform animates.
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
        { transform: "translate3d(0, 0, 0)" },
        { transform: `translate3d(${dx}px, 10px, 0)` },
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
            clip - no layout shift, no per-glyph work. */}
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
 * Once the timing contract's completion beat passes and the master
 * flips to FLYING, the wrapper's transform is animated by the
 * parent's WAAPI flight. Rendered via portal so the coordinates are
 * viewport-true.
 */
function TridentBuild({
  origin,
  state,
  staffRef,
  headRef,
  flyRef,
}: {
  origin: { left: number; top: number };
  state: "building" | "flying";
  staffRef: RefObject<HTMLSpanElement | null>;
  headRef: RefObject<HTMLSpanElement | null>;
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
        <TridentMark width={MARK_W} height={MARK_H} staffRef={staffRef} headRef={headRef} />
      </div>
    </div>,
    document.body
  );
}