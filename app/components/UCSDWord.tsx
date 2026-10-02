"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useReducedMotion } from "motion/react";
import TactileWord from "./TactileWord";
import TridentMark from "./TridentMark";

const WIPE_DELAY = 1100; // after the page reveal settles

/**
 * UC San Diego, the V2 way.
 *
 * CLICK: the phrase runs a DOUBLE TIDE, DOWN -> UP: every letter's
 * glyph fills from its baseline upward - a NAVY band rises first,
 * then a GOLD band chases right behind it in the same single rise -
 * and the rises cascade one letter at a time left -> right (the same
 * living-wave stagger as the thinking light). Then the letters melt
 * back to ink. While the tide runs, the golden TRIDENT forms above
 * the word (laying horizontal, pointing right) and once the double
 * tide completes it SHOOTS left -> right across the page and exits
 * the right edge with a gentle droop. The tide is the trident's
 * wake. Fires on load once + replays on every click.
 * Reduced motion: instant ink, fast horizontal throw.
 */
const LETTERS = "UC San Diego".split("");
const NAVY_END = 2150; // melt begins after the last letter's navy+gold rise
const IDLE_AT = 2850;

export default function UCSDWord() {
  const reduceMotion = useReducedMotion();
  const [phase, setPhase] = useState(0); // 0 idle | 1 rise | 2 fill | 3 melt
  const [flying, setFlying] = useState(false);
  const [flightRun, setFlightRun] = useState(0); // fresh element per throw
  const [origin, setOrigin] = useState<{ x: number; y: number } | null>(null);
  const wordRef = useRef<HTMLSpanElement>(null);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  const clearTimers = useCallback(() => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
  }, []);

  // The double tide: setup (tide hidden below every glyph) -> the
  // fill target lands a frame later so the CSS transition fires
  // (each letter rises navy-then-gold on its 60ms stagger), then the
  // melt washes ink back, staggered the same way.
  const runPaint = useCallback(() => {
    if (reduceMotion) return;
    clearTimers();
    setPhase(0);
    requestAnimationFrame(() => {
      setPhase(1); // rise setup: tide parked below, transitions armed
      requestAnimationFrame(() => {
        setPhase(2); // fill target: every letter rises
      });
    });
    timers.current.push(setTimeout(() => setPhase(3), NAVY_END)); // melt
    timers.current.push(setTimeout(() => setPhase(0), IDLE_AT));
  }, [reduceMotion, clearTimers]);

  // mount trigger: guaranteed to run once (timer + cleanup guard)
  useEffect(() => {
    const t = setTimeout(runPaint, WIPE_DELAY);
    return () => clearTimeout(t);
  }, [runPaint]);

  const clearFlight = useCallback(() => {
    clearTimers();
    setFlying(false);
  }, [clearTimers]);

  // The trident: FORMS above the word while the gold tide runs, and
  // once the double tide completes it SHOOTS left -> right.
  const throwTrident = useCallback(() => {
    const rect = wordRef.current?.getBoundingClientRect();
    if (!rect) return;
    setOrigin({ x: rect.left + rect.width / 2, y: rect.top - 22 });
    setFlying(true);
    setFlightRun((r) => r + 1);
  }, []);

  const activate = useCallback(() => {
    runPaint(); // every click replays the double tide
    if (flying) return; // one throw at a time
    if (reduceMotion) {
      throwTrident();
    } else {
      // forms during the tide, above the word
      timers.current.push(setTimeout(throwTrident, 1150));
    }
    timers.current.push(setTimeout(clearFlight, 3100));
  }, [runPaint, flying, throwTrident, clearFlight, reduceMotion]);

  useEffect(() => clearFlight, [clearFlight]);

  return (
    <TactileWord label="UC San Diego" onActivate={activate} className="whitespace-nowrap">
      <span className="word-anchor" ref={wordRef}>
        {/* the double tide lives in every glyph: each letter fills
            bottom -> up through navy, then gold, cascading left ->
            right on its own stagger. explicit \u00A0 keeps the word
            gaps (JSX would eat real spaces) */}
        <span
          className={`ucsd-word${phase >= 1 ? " ucsd-rise" : ""}${phase >= 2 ? " ucsd-fill" : ""}${phase >= 3 ? " ucsd-melt" : ""}`}
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
            onEnd={() => setFlying(false)}
          />
        )}
      </span>
    </TactileWord>
  );
}

/**
 * The throw: the golden trident FORMS above the word LAYING
 * HORIZONTAL (pointing right), levitates with a tiny bob, then once
 * the double sweep completes it SHOOTS left -> right across the
 * page, a gentle gravity droop on the way, and exits the right edge
 * of the viewport. Rendered via portal so the coordinates are
 * viewport-true.
 */
function TridentFlight({
  origin,
  fast,
  onEnd,
}: {
  origin: { x: number; y: number };
  fast: boolean;
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
    const FORM_MS = fast ? 120 : 280; // springy scale-pop, horizontal
    const HOVER_MS = fast ? 200 : 830; // bob above the word, then shoot
    const VX = fast ? 2200 : 980; // px/s left -> right
    const G = fast ? 200 : 380; // gentle droop on the shot
    let raf = 0;
    const t0 = performance.now();

    const tick = (now: number) => {
      const t = now - t0;
      let x: number;
      let y: number;
      let rot: number;
      let scale: number;
      let opacity: number;

      if (t < FORM_MS) {
        const u = t / FORM_MS;
        scale = 1 - 0.75 * Math.exp(-(t / 65)) * Math.cos(t / 52);
        opacity = Math.min(1, u / 0.7);
        x = origin.x - 22 * (1 - u); // arrives centered above the word
        y = origin.y - 8 * u; // settles into its hover height
        rot = -12 * (1 - u); // settles horizontal
      } else if (t < HOVER_MS) {
        opacity = 1;
        scale = 1;
        const h = t - FORM_MS;
        x = origin.x;
        y = origin.y - 4 * Math.sin(h / 130);
        rot = 0;
      } else {
        // SHOOT: straight right, slight droop, exits the right edge
        opacity = 1;
        scale = 1;
        const s = t - HOVER_MS;
        x = origin.x + (VX * s) / 1000;
        y = origin.y + (0.5 * G * (s / 1000) * (s / 1000));
        rot = Math.min(6, (s / 1000) * 14); // nose dips a touch
        if (x > vw + 60) {
          onEndRef.current();
          return;
        }
      }
      el.style.opacity = String(opacity);
      el.style.transform =
        `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px) ` +
        `rotate(${rot.toFixed(1)}deg) scale(${scale.toFixed(3)})`;
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [origin, fast]);

  // PORTAL to document.body: the tactile button is a transformed
  // ancestor - fixed positioning resolves against it, double-counting
  // coordinates. At the body root the flight uses true viewport
  // coordinates: form above the word, shoot right, exit right.
  return createPortal(
    <div className="ucsd-trident-fly" ref={ref} aria-hidden="true" style={{ left: 0, top: 0 }}>
      <TridentMark height={19} />
    </div>,
    document.body
  );
}