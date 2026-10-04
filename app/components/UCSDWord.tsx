"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { RefObject } from "react";
import { createPortal } from "react-dom";
import { useReducedMotion } from "motion/react";
import TactileWord from "./TactileWord";
import TridentMark from "./TridentMark";

/* THE ONE TIMING CONTRACT. Every number of the choreography lives
   here and nowhere else:
   - the navy phrase paint + the trident staff reveal: navyStart ->
     navyEnd (a deliberate, readable pass - 420ms, not a snap)
   - the gold chase + the trident head reveal: goldStart -> goldEnd
     (overlaps navy by ~130ms so gold is already moving as navy tops)
   - the settle: paints resolve back to the ink base by settleEnd ->
     total
   - the completion beat before the throw: hold
   The component builds the WAAPI timeline from these values; CSS
   knows only the rest states. No scattered durations anywhere. */
const UCSD_TIMING = {
  total: 900,
  navyStart: 0,
  navyEnd: 420,
  goldStart: 290,
  goldEnd: 750,
  settleEnd: 750,
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
const FLIGHT_SPEED = 0.85; // px/ms - perceived horizontal speed (a leisurely throw, not a fling)
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
 * phrase is ordinary site ink and stays that way until the user
 * clicks it.
 *
 * CLICK: PRESS -> SNAP -> a NAVY tide rises bottom -> top as ONE
 * smooth phrase-wide pass (constant velocity), with a SOFT BRIGHT
 * light front riding its top edge. Before navy finishes, GOLD starts
 * rising the same way, its own light front riding the gold edge; gold
 * overtakes navy, then both resolves cleanly back to the ink base.
 * Meanwhile the minimalist GOLD trident materializes above (staff
 * with the navy window, head with the gold window - the passes set
 * TIMING only), catches one tiny warm pulse after the head finishes,
 * holds, and flies right once the phrase is ordinary ink. Then
 * everything returns to IDLE.
 *
 * Paint owns COLOR: each overlay is ONE linear clip reveal (a
 * constant-velocity front - Thinking's smoothness comes from light,
 * not from the wave slowing down).
 *
 * LIGHT owns LUMINOSITY: each paint pass has a phrase-level light
 * front - a whole-phrase duplicate revealed through a STATIC narrow
 * feathered band (a mask on the wrapper) that scans bottom -> top by
 * translating the wrapper while an inversely-translated copy holds
 * the glyphs still. Position is linear (same duration/delay as its
 * paint - the band can never separate from the color front);
 * amplitude breathes ease-in-out (0 -> full -> full -> 0). Geometry
 * and light are separate mechanisms, as in Thinking.
 */
export default function UCSDWord() {
  const reduceMotion = useReducedMotion();
  const [state, setState] = useState<UcsdState>("idle");
  const [origin, setOrigin] = useState<{ left: number; top: number } | null>(null);
  const wordRef = useRef<HTMLSpanElement>(null);
  const navyRef = useRef<HTMLSpanElement>(null);
  const goldRef = useRef<HTMLSpanElement>(null);
  const navyGlowRef = useRef<HTMLSpanElement>(null);
  const goldGlowRef = useRef<HTMLSpanElement>(null);
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

  // BUILDING: the paint + the light + the trident formation - one
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

    /* GEOMETRY: the paint fronts. ONE linear two-keyframe reveal -
       inset(100%) -> inset(0). LINEAR: the moving front has constant
       velocity. No midpoint, no masks on the paint, no crests, no
       per-letter work. The light lives in its own layers below. */
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
          easing: "linear",
        })
      );
    };

    /* LIGHT FRONTS: the phrase-level luminous tides. The wrapper
       carries a STATIC feathered mask: TRANSPARENT above the front,
       a bright ramp at the front (the light front itself), then a
       sustained FULL band below it - so the light FILLS the revealed
       region like a tide, brightest at its top edge, instead of
       showing a thin slice that cuts through letterforms. The
       wrapper translates; the copy translates INVERSELY, so the
       glyphs never move - only the light sweeps. Position: linear,
       same duration and delay as its paint pass - the front tracks
       the color boundary continuously. Amplitude (the ease-in-out
       envelopes below): Thinking's softness lives HERE, not in the
       wave. */
    const bandScan = (
      front: HTMLElement | null,
      dur: number,
      delay: number,
      boxH: number
    ) => {
      if (!front) return;
      const copy = front.firstElementChild as HTMLElement | null;
      // the ramp sits at ~34% of the box; for it to ride the paint
      // boundary the wrapper travels from +0.66*boxH (front just
      // below the baseline) to -0.34*boxH (front just above the
      // caps) - linear, so the light and the color share velocity.
      const DS = 0.66 * boxH + 4;
      const DE = -0.34 * boxH - 4;
      runs.push(
        front.animate(
          [
            { transform: `translateY(${DS}px)` },
            { transform: `translateY(${DE}px)` },
          ],
          { duration: dur, delay, fill: "forwards", easing: "linear" }
        )
      );
      if (copy) {
        runs.push(
          copy.animate(
            [
              { transform: `translateY(${-DS}px)` },
              { transform: `translateY(${-DE}px)` },
            ],
            { duration: dur, delay, fill: "forwards", easing: "linear" }
          )
        );
      }
    };

    /* LIGHT AMPLITUDE: the tides breathe ease-in-out. Navy enters
       bright, holds ~40% while gold is dominant (the handoff - one
       light, not two stacked halos), then fades WITH the settle.
       Gold enters bright and resolves with the settle. This is where
       Thinking's softness lives. */
    const breathe = (
      front: HTMLElement | null,
      duration: number,
      delay: number,
      keyframes: ({ offset?: number; opacity: string })[]
    ) => {
      if (!front) return;
      runs.push(
        front.animate(keyframes, {
          duration,
          delay,
          fill: "forwards",
          easing: "ease-in-out",
        })
      );
    };

    // the phrase paints: navy 0->420, gold 290->750 (the overlap is
    // the choreography: gold starts while navy is still moving)
    reveal(navyRef.current, T.navyEnd - T.navyStart, T.navyStart);
    reveal(goldRef.current, T.goldEnd - T.goldStart, T.goldStart);
    // the trident formation stays synced to the SAME windows
    reveal(staffRef.current, T.navyEnd - T.navyStart, T.navyStart, false);
    reveal(headRef.current, T.goldEnd - T.goldStart, T.goldStart, false);

    // the light fronts ride the same linear windows; the ramp must
    // track the paint boundary: the wrapper travels +0.66h -> -0.34h
    // (the mask ramp sits at ~34% of the box)
    const boxH = navyRef.current?.offsetHeight ?? 44;
    bandScan(navyGlowRef.current, T.navyEnd - T.navyStart, T.navyStart, boxH);
    bandScan(goldGlowRef.current, T.goldEnd - T.goldStart, T.goldStart, boxH);

    // the light amplitudes: navy enters bright, holds ~80% while gold
    // is dominant (the handoff - one light, not two stacked halos),
    // then fades WITH the settle; gold fades with it too. Position is
    // linear; this ease-in-out breathing is Thinking's softness.
    breathe(navyGlowRef.current, T.total, T.navyStart, [
      { opacity: "0" },
      { offset: 0.25, opacity: "1" },
      { offset: 0.5, opacity: "0.8" },
      { offset: 0.75, opacity: "0.7" },
      { opacity: "0" },
    ]);
    breathe(goldGlowRef.current, T.total - T.goldStart, T.goldStart, [
      { opacity: "0" },
      { offset: 0.3, opacity: "1" },
      { offset: 0.7, opacity: "0.8" },
      { opacity: "0" },
    ]);

    // settle: the paint overlaps both fade to reveal the untouched
    // ink base by T.total - no gold pause, no reverse, no third pass
    for (const el of [navyRef.current, goldRef.current]) {
      if (!el) continue;
      runs.push(
        el.animate(
          [{ opacity: "1" }, { opacity: "0" }],
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
      : Math.min(980, Math.max(540, dx / FLIGHT_SPEED));
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
        {/* the phrase-level paint stack: ONE base + two paints + two
            light fronts. The base defines the dimensions; everything
            else is an absolute duplicate (aria-hidden). Paint owns
            color (clip reveals); the glow-fronts own luminosity
            (feathered band scans) - no layout shift, no per-glyph
            work. */}
        <span className="ucsd-word">
          <span className="ucsd-base">{PHRASE}</span>
          <span aria-hidden="true" className="ucsd-navy" ref={navyRef}>
            {PHRASE}
          </span>
          <span aria-hidden="true" className="ucsd-navy-glow" ref={navyGlowRef}>
            <span className="ucsd-glow-copy">{PHRASE}</span>
          </span>
          <span aria-hidden="true" className="ucsd-gold" ref={goldRef}>
            {PHRASE}
          </span>
          <span aria-hidden="true" className="ucsd-gold-glow" ref={goldGlowRef}>
            <span className="ucsd-glow-copy">{PHRASE}</span>
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