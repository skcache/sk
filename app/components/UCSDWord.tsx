"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useReducedMotion } from "motion/react";
import TactileWord from "./TactileWord";
import TridentMark from "./TridentMark";

const WIPE_DELAY = 1100; // after the page reveal settles

/**
 * UC San Diego - the all-in-one double pass.
 *
 * LOAD: one beat after the reveal settles, the phrase runs the TWO
 * QUICK UPWARD PASSES - navy bottom -> top, then IMMEDIATELY gold
 * bottom -> top (no gap - the gold climbs over the navy), each
 * letter on its own 34ms stagger, like the thinking light. Then it
 * settles back to ink. That is the whole load experience.
 *
 * CLICK: the same double pass, and THIS time the trident is created
 * in sync - the NAVY pass builds the STAFF (revealed bottom -> up),
 * the GOLD pass builds the HEAD (revealed bottom -> up), so the
 * trident materializes from nothing exactly as the colors climb.
 * The moment the double pass completes, the trident is THROWN left
 * -> right and exits the right edge with a gentle droop, while the
 * letters melt back to ink.
 * Reduced motion: instant ink, fast horizontal throw.
 */
const LETTERS = "UC San Diego".split("");

export default function UCSDWord() {
  const reduceMotion = useReducedMotion();
  const [phase, setPhase] = useState(0); // 0 idle | 1 rise | 2 fill(navy) | 3 gold-handoff | 4 gold-rise | 5 melt
  const [flying, setFlying] = useState(false);
  const [flightRun, setFlightRun] = useState(0); // fresh element per throw
  const [origin, setOrigin] = useState<{ x: number; y: number } | null>(null);
  const wordRef = useRef<HTMLSpanElement>(null);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  const clearTimers = useCallback(() => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
  }, []);

  // The double pass, NO dead time (the thinking animation's lesson):
  // setup -> the navy fill target lands a frame later, each letter's
  // glyph rises 0.4s and COMPLETES at ~432ms; the gold handoff fires
  // at 460ms the instant the tide is navy - the rewind is invisible
  // (its parked edge is navy-colored) and the GOLD pass climbs
  // immediately; the melt starts at 900ms right as the gold's tide
  // completes. One continuous motion: navy up, gold up, wash to ink.
  // Every rAF handoff gets a 64ms setTimeout twin: a backgrounded
  // tab can never stall the phrase half-painted.
  const runPaint = useCallback(() => {
    if (reduceMotion) return;
    clearTimers();
    setPhase(0);
    const next = (fn: () => void) => {
      let done = false;
      const run = () => {
        if (done) return;
        done = true;
        fn();
      };
      requestAnimationFrame(run);
      timers.current.push(setTimeout(run, 64)); // rAF stall fallback
    };
    next(() => {
      setPhase(1); // rise setup: pass parked below, transitions armed
      next(() => {
        setPhase(2); // NAVY pass: the whole phrase rises together
      });
    });
    timers.current.push(
      setTimeout(() => {
        setPhase(3); // gold handoff: invisible rewind, navy above
        next(() => setPhase(4)); // GOLD pass climbs right behind
      }, 460)
    );
    timers.current.push(setTimeout(() => setPhase(5), 900)); // melt
    timers.current.push(setTimeout(() => setPhase(0), 1600)); // idle
  }, [reduceMotion, clearTimers]);

  // LOAD: the double pass runs once after the reveal settles -
  // clean, quick, and done. No trident on load: the trident is the
  // click's reward.
  useEffect(() => {
    const t = setTimeout(runPaint, WIPE_DELAY);
    return () => clearTimeout(t);
  }, [runPaint]);

  const clearFlight = useCallback(() => {
    clearTimers();
    setFlying(false);
  }, [clearTimers]);

  // The trident: mounts as the navy pass begins; the STAFF builds
  // during the navy, the HEAD during the gold (both bottom -> up via
  // CSS clips on the flight wrapper), then the moment the double pass
  // completes it SHOOTS left -> right.
  const throwTrident = useCallback(() => {
    const rect = wordRef.current?.getBoundingClientRect();
    if (!rect) return;
    setOrigin({ x: rect.left + rect.width / 2, y: rect.top - 32 });
    setFlying(true);
    setFlightRun((r) => r + 1);
  }, []);

  const activate = useCallback(() => {
    runPaint(); // every click replays the double pass
    if (flying) return; // one throw at a time
    if (reduceMotion) {
      throwTrident();
    } else {
      // mounts as the navy starts; the clips build it in sync
      timers.current.push(setTimeout(throwTrident, 500));
    }
    timers.current.push(setTimeout(clearFlight, 1800));
  }, [runPaint, flying, throwTrident, clearFlight, reduceMotion]);

  useEffect(() => clearFlight, [clearFlight]);

  return (
    <TactileWord label="UC San Diego" onActivate={activate} className="whitespace-nowrap">
      <span className="word-anchor" ref={wordRef}>
        {/* the DOUBLE PASS lives in every glyph: each letter fills
            bottom -> up with navy, then the gold climbs right over
            it - no white gap - cascading left -> right on its own
            stagger. explicit \u00A0 keeps the word gaps (JSX would
            eat real spaces) */}
        <span
          className={`ucsd-word${phase >= 1 ? " ucsd-rise" : ""}${phase >= 2 ? " ucsd-fill" : ""}${phase >= 3 ? " ucsd-gold" : ""}${phase >= 4 ? " ucsd-gold-rise" : ""}${phase >= 5 ? " ucsd-melt" : ""}`}
        >
          {LETTERS.map((c, i) => (
            <span
              key={i}
              className="ucsd-letter"
              style={{ "--i": i } as React.CSSProperties}
            >
              {c === " " ? "\u00A0" : c}
            </span>
          ))}
        </span>
        {flying && origin && (
          <TridentFlight
            key={`fly-${flightRun}`}
            origin={origin}
            fast={!!reduceMotion}
            buildStaff={phase >= 2}
            buildHead={phase >= 4}
            onEnd={() => setFlying(false)}
          />
        )}
      </span>
    </TactileWord>
  );
}

/**
 * The throw: the golden trident is BUILT above the word while the
 * double pass runs (the wrapper's build-staff/build-head classes
 * reveal the staff during the navy and the head during the gold,
 * bottom -> up, synced with the letters), and the moment the double
 * pass completes it SHOOTS left -> right with a gentle droop and
 * exits the right edge of the viewport. Rendered via portal so the
 * coordinates are viewport-true.
 */
function TridentFlight({
  origin,
  fast,
  buildStaff,
  buildHead,
  onEnd,
}: {
  origin: { x: number; y: number };
  fast: boolean;
  buildStaff: boolean;
  buildHead: boolean;
  onEnd: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const onEndRef = useRef(onEnd);
  useEffect(() => {
    onEndRef.current = onEnd;
  }, [onEnd]);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const vw = window.innerWidth;
    const FORM_MS = fast ? 100 : 420; // hold while the staff+head build
    const HOVER_MS = FORM_MS; // no bob - straight into the throw
    const VX = fast ? 2200 : 980; // px/s left -> right
    const G = fast ? 160 : 260; // gentle droop on the shot
    let raf = 0;
    const t0 = performance.now();

    const tick = (now: number) => {
      const t = now - t0;
      let x: number;
      let y: number;

      if (t < FORM_MS) {
        // the build runs via the CSS clips - hold in place above the
        // word, fully opaque, no drift, no bounce
        x = origin.x;
        y = origin.y;
      } else {
        // SHOOT: straight right, slight droop, exits the right edge
        const s = t - HOVER_MS;
        x = origin.x + (VX * s) / 1000;
        y = origin.y + (0.5 * G * (s / 1000) * (s / 1000));
        if (x > vw + 60) {
          onEndRef.current();
          return;
        }
      }
      el.style.opacity = "1";
      el.style.transform = `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px)`;
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [origin, fast]);

  // PORTAL to document.body: the tactile button is a transformed
  // ancestor - fixed positioning resolves against it, double-counting
  // coordinates. At the body root the flight uses true viewport
  // coordinates: build above the word, shoot right, exit right.
  return createPortal(
    <div className="ucsd-trident-wrap" aria-hidden="true">
      <div
        className={`ucsd-trident-fly${buildStaff ? " build-staff" : ""}${buildHead ? " build-head" : ""}`}
        ref={ref}
        style={{ left: 0, top: 0 }}
      >
        <TridentMark height={28} />
      </div>
    </div>,
    document.body
  );
}