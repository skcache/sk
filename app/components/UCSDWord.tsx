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

/* The actuation beat: TactileWord calls onActivate on pointer-up,
   the same event that starts the key's spring return. For UCSD we
   wait one tiny beat so the interaction reads PRESS -> SNAP ->
   RESPONSE instead of everything firing at once. */
const ACTUATION_MS = 50;

/* Trident + flight constants (also defined once). */
const MARK_W = 84;
const MARK_H = 26;
const FLIGHT_SPEED = 1.1; // px/ms - perceived horizontal speed
/* The rise easing restored from 1ad96e: one smooth neutral motion.
   GEOMETRY keeps this exact curve; the GLOW breathes ease-in-out
   on a SEPARATE animation - light never touches the clip. */
const EASE = "cubic-bezier(0.45, 0, 0.55, 1)";
const GLOW_EASE = "ease-in-out"; // light only
const THROW_EASE = "cubic-bezier(0.16, 0.8, 0.3, 1)"; // stored energy release
const THROW_ROTATION = 2.5; // tiny nose-down tilt (deg) on the throw
/* When the phrase sits mid-paragraph (mobile lines reach under the
   trident band), the mark must float ABOVE the preceding line's
   glyphs instead of rendering over them. On desktop the previous
   line usually ends before the phrase, so the tight 6px gap stays. */
const RAISE_CLEARANCE = 40;

const PHRASE = "UC San Diego";

/* THE THINKING-LIKE LIGHT: a SEPARATE textShadow animation per
   overlay, riding the same clock as its clip reveal. The glow goes
   0 -> soft peak (mid) -> soft settled (end); it never adds a
   clipPath keyframe and never alters sweep velocity. */
const NO_GLOW = "0 0 0 rgba(0, 0, 0, 0)";
const NAVY_GLOW_PEAK = "0 0 9px rgba(80, 125, 190, 0.35)";
const NAVY_GLOW_END = "0 0 5px rgba(80, 125, 190, 0.15)";
const GOLD_GLOW_PEAK = "0 0 9px rgba(240, 202, 103, 0.38)";
const GOLD_GLOW_END = "0 0 5px rgba(240, 202, 103, 0.16)";

type UcsdState = "idle" | "building" | "flying";

/**
 * UC San Diego - CLICK ONLY. No page-load animation: at load the
 * phrase is ordinary site ink and stays that way until the user
 * clicks it.
 *
 * CLICK: PRESS -> SNAP -> the phrase sweeps NAVY bottom -> top (its
 * light crest glowing like Thinking), GOLD immediately chases over
 * it (no white gap), then both fade to reveal the ink base. While
 * the colors rise, the minimalist GOLD trident materializes above
 * the phrase (staff with the navy timing, head with the gold
 * timing, both gold - the passes set TIMING only). After the head
 * finishes it catches one tiny warm glow pulse (no opacity change),
 * holds, and flies left -> right off the viewport once the phrase
 * is ordinary ink. Then everything returns to IDLE.
 *
 * The paint is ONE WAAPI timeline from UCSD_TIMING: every overlay
 * gets a pure clip reveal (the 1ad two-keyframe motion) PLUS a
 * separate ease-in-out light animation - geometry and light are
 * separate mechanisms. The flight is ONE deterministic WAAPI
 * transform. The overlays rest at opacity 0, so all resets are
 * instant and invisible - a reverse wipe is structurally impossible.
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
        // SPAWN: mathematically centered above the phrase using the
        // mark's actual rendered width/height - no eyeballed offsets.
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

  // BUILDING: the phrase paint + the light + the trident formation -
  // one WAAPI timeline from the ONE timing contract. The trident
  // never moves here; only its reveal progresses.
  useEffect(() => {
    if (state !== "building" || !origin) return;
    const T = UCSD_TIMING;
    const runs = anims.current;

    if (reduceMotion) {
      timers.current.push(setTimeout(() => setState("flying"), 40));
      return;
    }

    /* GEOMETRY: the exact 1ad two-keyframe reveal - inset(100%) ->
       inset(0) with the 1ad rise ease. One mechanism, no midpoint,
       no masks, no crests. Glow never appears here. */
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

    /* LIGHT: a SEPARATE ease-in-out textShadow animation on the same
       clock as its pass - 0 -> soft peak -> soft settled. Geometry
       and light are independent; the glow never alters velocity. */
    const light = (
      el: HTMLElement | null,
      dur: number,
      delay: number,
      peak: string,
      end: string
    ) => {
      if (!el) return;
      runs.push(
        el.animate(
          [
            { textShadow: NO_GLOW },
            { offset: 0.5, textShadow: peak },
            { textShadow: end },
          ],
          { duration: dur, delay, fill: "forwards", easing: GLOW_EASE }
        )
      );
    };

    // navy phrase sweep + staff reveal: the same numbers
    reveal(navyRef.current, T.navyEnd - T.navyStart, T.navyStart);
    reveal(staffRef.current, T.navyEnd - T.navyStart, T.navyStart, false);
    // gold chases + head reveal: the same numbers, the same delay
    reveal(goldRef.current, T.goldEnd - T.goldStart, T.goldStart);
    reveal(headRef.current, T.goldEnd - T.goldStart, T.goldStart, false);

    // the thinking-like light rides the same windows
    light(
      navyRef.current,
      T.navyEnd - T.navyStart,
      T.navyStart,
      NAVY_GLOW_PEAK,
      NAVY_GLOW_END
    );
    light(
      goldRef.current,
      T.goldEnd - T.goldStart,
      T.goldStart,
      GOLD_GLOW_PEAK,
      GOLD_GLOW_END
    );

    // settle: both overlays fade - the glow leaves with them,
    // revealing the untouched ink base by T.total
    for (const el of [navyRef.current, goldRef.current]) {
      if (!el) continue;
      runs.push(
        el.animate(
          [
            { opacity: "1" },
            { opacity: "0" },
          ],
          {
            duration: T.total - T.settleEnd,
            delay: T.settleEnd,
            fill: "forwards",
            easing: "ease",
          }
        )
      );
    }

    // the trident completion: after the head finishes, ONE tiny warm
    // glow pulse (LOCKED, not POWER-UP) - a restrained drop-shadow +
    // brightness, NO opacity change. Neutral well before the throw.
    const mark = markRef.current;
    if (mark) {
      runs.push(
        mark.animate(
          [
            { filter: "drop-shadow(0 0 0 rgba(242, 193, 78, 0)) brightness(1)" },
            {
              offset: 0.5,
              filter: "drop-shadow(0 0 6px rgba(242, 193, 78, 0.4)) brightness(1.06)",
            },
            { filter: "drop-shadow(0 0 0 rgba(242, 193, 78, 0)) brightness(1)" },
          ],
          {
            duration: 70,
            delay: T.goldEnd + 20,
            fill: "forwards",
            easing: "ease-in-out",
          }
        )
      );
    }

    // the throw waits until the phrase is FULLY ordinary ink
    // (T.total) plus the completion beat
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
            clip + light - no layout shift, no per-glyph work. */}
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