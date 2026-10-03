"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { RefObject } from "react";
import { createPortal } from "react-dom";
import { useReducedMotion } from "motion/react";
import TactileWord from "./TactileWord";
import TridentMark from "./TridentMark";

/* THE ONE TIMING CONTRACT. Every number of the choreography lives
   here and nowhere else.
   - The PAINT FRONTS (navy phrase + trident staff, gold phrase +
     trident head) travel LINEARLY: navy 0 -> navyEnd as gold chases
     goldStart -> goldEnd. Position moves at one constant velocity.
   - The LIGHT crests ride the same fronts and EASE (intensity
     breathes ease-in-out, like the thinking wave): the navy light
     decays by navyCrestFade as the gold crest takes ownership; the
     gold bloom exhales into the ink by goldCrestFade.
   - settleStart -> total: the color overlays fade, revealing the
     ink base (gold fades slightly before navy so the navy color
     stays beneath - zero white gap).
   - shimmerAt + shimmerDur: one tiny warm bloom on the completed
     trident; cleanBeat of solid, fully-formed trident; then throw. */
const UCSD_TIMING = {
  total: 830, // the phrase is fully ordinary ink again
  navyEnd: 360, // navy paint + staff front (linear)
  goldStart: 230, // gold chases - clearly before navy finishes
  goldEnd: 640, // gold paint + head front (linear)
  navyCrestFade: 540, // navy light hands off to gold
  navyPaintFade: 560, // the navy wash yields as the gold covers
  goldCrestFade: 790, // gold bloom exhales into the ink
  settleStart: 670, // paint colors begin fading (gold first)
  shimmerAt: 645, // trident completion bloom (head done at 640)
  shimmerDur: 65,
  cleanBeat: 60, // solid, fully-formed trident before the throw
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

/* PREMIUM LIGHT MODEL (the thinking principle):
   - DIM: like the thinking letters (rgba(243,241,234,.5)), the
     whole phrase goes QUIET during the run - the base ink breathes
     down to DIM and back, so the light reads against darkness.
   - WASH: the paints are luminous washes, not solid fills - the
     letters keep their luminance under the brand color.
   - CREST: the bright tinted light rides the moving front with a
     thinking-scale glow (tight 7px + faint 14px halo). */
const DIM = 0.5; // the quiet baseline - exactly the thinking letters' dim
const WASH = 0.8; // the paints are luminous light washes, never dark fills

/* BAND: the light-crest strip - 16% of the phrase box, centered on
   the moving paint front (about 24% of the glyph height - soft
   illumination, not a razor line). The strip slides bottom -> top
   LINEARLY with the front. */
const BAND = "84% 0 0 0";

/* The crest light colors: brighter than the branded paint fills -
   PAINT stays branded, LIGHT makes it luminous. */
const NAVY_CREST_GLOW = `0 0 7px rgba(80, 125, 190, 0.6), 0 0 14px rgba(80, 125, 190, 0.28)`;
const GOLD_CREST_GLOW = `0 0 7px rgba(240, 202, 103, 0.6), 0 0 14px rgba(240, 202, 103, 0.28)`;
const NO_GLOW = "0 0 0 rgba(0, 0, 0, 0)";

type UcsdState = "idle" | "building" | "flying";

/**
 * UC San Diego - CLICK ONLY. No page-load animation: at load the
 * phrase is ordinary site ink.
 *
 * CLICK: PRESS -> SNAP (TactileWord) -> ACTUATION_MS beat -> the
 * phrase sweeps NAVY bottom -> top, GOLD chases directly over it
 * (no white gap), then the colors fade to the ink base. The paint
 * fronts travel at CONSTANT speed (linear clip); the LIGHT is a
 * separate crest per pass - a narrow band with a soft glow riding
 * the same front, its intensity breathing ease-in-out like the
 * thinking wave. The navy light hands off to the gold light before
 * the gold front reaches the top, so the effect never stacks two
 * halos. By total the phrase is ordinary ink again.
 *
 * While the colors rise, the minimalist GOLD trident materializes
 * above the phrase (staff with the navy front, head with the gold
 * front). When the head finishes it catches ONE tiny warm bloom
 * (LOCKED, not POWER-UP - the filter is neutral again before the
 * first flight frame), holds solid ~60ms, then flies left -> right
 * off the viewport. Then everything returns to IDLE.
 *
 * All geometry: ONE WAAPI timeline from UCSD_TIMING (linear fronts,
 * eased light). The flight is ONE deterministic WAAPI transform.
 * The overlays rest at opacity 0, so every reset is instant and
 * invisible - a reverse wipe is structurally impossible.
 */
export default function UCSDWord() {
  const reduceMotion = useReducedMotion();
  const [state, setState] = useState<UcsdState>("idle");
  const [origin, setOrigin] = useState<{ left: number; top: number } | null>(null);
  const wordRef = useRef<HTMLSpanElement>(null);
  const baseRef = useRef<HTMLSpanElement>(null);
  const navyRef = useRef<HTMLSpanElement>(null);
  const navyCrestRef = useRef<HTMLSpanElement>(null);
  const goldRef = useRef<HTMLSpanElement>(null);
  const goldCrestRef = useRef<HTMLSpanElement>(null);
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

  // BUILDING: the phrase paint + the light crests + the formation -
  // ONE WAAPI timeline from the ONE timing contract.
  useEffect(() => {
    if (state !== "building" || !origin) return;
    const T = UCSD_TIMING;
    const runs = anims.current;

    if (reduceMotion) {
      timers.current.push(setTimeout(() => setState("flying"), 40));
      return;
    }

    /* ---- THE DIM: like the thinking letters, the whole phrase
       goes quiet while the energy runs - the base ink breathes down
       and back, so the light crest reads against darkness. */
    const base = baseRef.current;
    if (base) {
      runs.push(
        base.animate(
          [
            { opacity: 1 },
            { offset: 0.1, opacity: DIM },
            { offset: 0.72, opacity: DIM },
            { opacity: 1 },
          ],
          {
            duration: T.total,
            fill: "forwards",
            easing: "ease-in-out",
          }
        )
      );
    }

    /* ---- PAINT FRONTS: position only, LINEAR, one velocity.
       clip-path is the ONLY geometry mechanism (no mask system).
       The paints are luminous WASHES (WASH opacity - the letters
       keep their luminance under the brand color). */
    const paint = (
      el: HTMLElement | null,
      dur: number,
      delay: number,
      settleStart: number,
      settleEnd: number
    ) => {
      if (!el) return;
      runs.push(
        el.animate(
          [
            { clipPath: "inset(100% 0 0 0)", opacity: WASH },
            { clipPath: "inset(0 0 0 0)", opacity: WASH },
          ],
          { duration: dur, delay, fill: "forwards", easing: "linear" }
        )
      );
      // the settle: the colors fade into the ink base (gold first)
      if (settleEnd > settleStart) {
        runs.push(
          el.animate([{ opacity: WASH }, { opacity: 0 }], {
            duration: settleEnd - settleStart,
            delay: settleStart,
            fill: "forwards",
            easing: "ease",
          })
        );
      }
    };
    // the navy's exit is its yield-below (it must not also run a
    // later settle anim that could re-open it)
    paint(navyRef.current, T.navyEnd, 0, 0, 0);
    paint(goldRef.current, T.goldEnd - T.goldStart, T.goldStart, T.settleStart, T.total - 20);

    // the navy WASH yields as the gold covers it (no muddy stack):
    // the navy paint fades out right after its front completes
    const navy = navyRef.current;
    if (navy) {
      runs.push(
        navy.animate([{ opacity: WASH }, { opacity: 0 }], {
          duration: T.navyPaintFade - T.navyEnd,
          delay: T.navyEnd,
          fill: "forwards",
          easing: "ease-out",
        })
      );
    }

    /* ---- LIGHT CRESTS: the glow belongs to a narrow band riding
       the moving front. The strip position is LINEAR with the paint
       clock; the intensity (opacity + text-shadow) breathes
       ease-in-out - the thinking principle translated vertically.
       The navy light decays as the gold crest takes ownership, so
       two halos never stack at full strength. */
    const crest = (
      el: HTMLElement | null,
      posDur: number,
      posDelay: number,
      envDelay: number,
      envDur: number,
      env: ({ offset?: number; opacity: number; textShadow: string })[]
    ) => {
      if (!el) return;
      runs.push(
        el.animate(
          [
            { clipPath: `inset(${BAND})` },
            { clipPath: "inset(0 0 86% 0)" },
          ],
          { duration: posDur, delay: posDelay, fill: "forwards", easing: "linear" }
        )
      );
      runs.push(
        el.animate(env as Keyframe[], {
          duration: envDur,
          delay: envDelay,
          fill: "forwards",
          easing: "ease-in-out",
        })
      );
    };
    crest(
      navyCrestRef.current,
      T.navyEnd,
      0,
      0,
      T.navyCrestFade,
      [
        { opacity: 0, textShadow: NO_GLOW },
        { offset: 0.12, opacity: 1, textShadow: NAVY_CREST_GLOW },
        { offset: 0.667, opacity: 1, textShadow: NAVY_CREST_GLOW },
        { opacity: 0, textShadow: NO_GLOW },
      ]
    );
    crest(
      goldCrestRef.current,
      T.goldEnd - T.goldStart,
      T.goldStart,
      T.goldStart,
      T.goldCrestFade - T.goldStart,
      [
        { opacity: 0, textShadow: NO_GLOW },
        { offset: 0.09, opacity: 1, textShadow: GOLD_CREST_GLOW },
        { offset: 0.77, opacity: 1, textShadow: GOLD_CREST_GLOW },
        { opacity: 0, textShadow: NO_GLOW },
      ]
    );

    // the trident formation rides the SAME fronts (linear, same
    // durations/delays): staff with navy, head with gold
    const fade = (el: HTMLElement | null, dur: number, delay: number) => {
      if (!el) return;
      runs.push(
        el.animate(
          [
            { clipPath: "inset(100% 0 0 0)" },
            { clipPath: "inset(0 0 0 0)" },
          ],
          { duration: dur, delay, fill: "forwards", easing: "linear" }
        )
      );
    };
    fade(staffRef.current, T.navyEnd, 0);
    fade(headRef.current, T.goldEnd - T.goldStart, T.goldStart);

    // the trident completion: ONE tiny warm bloom (LOCKED, not
    // POWER-UP) - restrained drop-shadow + brightness, opacity stays
    // 1 (the object just finished assembling; it is MORE solid, not
    // translucent). The filter is already neutral by the throw.
    const mark = markRef.current;
    if (mark) {
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

    // the completion beat, then the throw
    timers.current.push(
      setTimeout(
        () => setState("flying"),
        T.shimmerAt + T.shimmerDur + T.cleanBeat
      )
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
        {/* the phrase-level stack: base + navy paint + navy light
            crest + gold paint + gold light crest. The base defines
            the dimensions; every other layer is an absolute
            aria-hidden duplicate. The paints own COLOR (branded
            fills); the crests own LIGHT (a narrow glowing band
            riding the moving front). No layout shift. */}
        <span className="ucsd-word">
          <span className="ucsd-base" ref={baseRef}>{PHRASE}</span>
          <span aria-hidden="true" className="ucsd-navy" ref={navyRef}>
            {PHRASE}
          </span>
          <span aria-hidden="true" className="ucsd-navy-crest" ref={navyCrestRef}>
            {PHRASE}
          </span>
          <span aria-hidden="true" className="ucsd-gold" ref={goldRef}>
            {PHRASE}
          </span>
          <span aria-hidden="true" className="ucsd-gold-crest" ref={goldCrestRef}>
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
 * Once the completion beat passes, the wrapper's transform is
 * animated by the parent's WAAPI flight. Rendered via portal so the
 * coordinates are viewport-true.
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