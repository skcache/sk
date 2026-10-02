"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useReducedMotion } from "motion/react";
import TactileWord from "./TactileWord";
import TridentMark from "./TridentMark";

const WIPE_DELAY = 1100; // after the page reveal settles

/**
 * UC San Diego, the V2 way - the whole choreography runs in <= 2s:
 *
 * CLICK: the DOUBLE PASS starts instantly - every letter's glyph
 * fills from its baseline upward with a full NAVY pass (0.45s),
 * then a GOLD pass immediately rises over it (0.45s), cascading
 * letter by letter left -> right on a 38ms stagger. As the navy
 * fills, the golden TRIDENT MATERIALIZES above the word (a bold,
 * sharp weapon, lying horizontal pointing right, formed with a pop
 * + halo), and the moment the gold pass completes it SHOOTS left ->
 * right and exits the right edge. Letters melt back to ink while
 * the trident flies. The whole choreography runs in <= 2s.
 * Fires on load once + replays on every click.
 * Reduced motion: instant ink, fast horizontal throw.
 */
const LETTERS = "UC San Diego".split("");

export default function UCSDWord() {
  const reduceMotion = useReducedMotion();
  const [phase, setPhase] = useState(0); // 0 idle | 1 rise | 2 fill(navy) | 3 gold-setup | 4 gold-rise | 5 melt
  const [flying, setFlying] = useState(false);
  const [flightRun, setFlightRun] = useState(0); // fresh element per throw
  const [origin, setOrigin] = useState<{ x: number; y: number } | null>(null);
  const wordRef = useRef<HTMLSpanElement>(null);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  const clearTimers = useCallback(() => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
  }, []);

  // The double pass: setup -> the navy fill target lands a frame
  // later so the CSS transition fires (each letter rises on its 34ms
  // stagger, 0.4s fill - the navy's LAST letter completes at ~756ms),
  // the gold handoff at 770ms swaps the gradient UNDER the glyphs
  // (invisible) and a frame later the gold re-rises over the finished
  // navy, then the melt washes ink back. Whole choreography <= 2s.
  const runPaint = useCallback(() => {
    if (reduceMotion) return;
    clearTimers();
    setPhase(0);
    requestAnimationFrame(() => {
      setPhase(1); // rise setup: pass parked below, transitions armed
      requestAnimationFrame(() => {
        setPhase(2); // NAVY pass: every letter fills up (full cascade)
      });
    });
    timers.current.push(
      setTimeout(() => {
        setPhase(3); // gold handoff after the navy completes
        requestAnimationFrame(() => setPhase(4)); // GOLD pass re-rises
      }, 770)
    );
    timers.current.push(setTimeout(() => setPhase(5), 1600)); // melt
    timers.current.push(setTimeout(() => setPhase(0), 2250)); // idle
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

  // The trident: MATERIALIZES as the navy pass fills (pop + halo,
  // in place - no drift), SHOOTS the moment the gold pass completes.
  const throwTrident = useCallback(() => {
    const rect = wordRef.current?.getBoundingClientRect();
    if (!rect) return;
    setOrigin({ x: rect.left + rect.width / 2, y: rect.top - 30 });
    setFlying(true);
    setFlightRun((r) => r + 1);
  }, []);

  const activate = useCallback(() => {
    runPaint(); // every click replays the double pass
    if (flying) return; // one throw at a time
    if (reduceMotion) {
      throwTrident();
    } else {
      // MATERIALIZES as the navy pass fills (in sync with the sweep)
      timers.current.push(setTimeout(throwTrident, 500));
    }
    timers.current.push(setTimeout(clearFlight, 2050));
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
            onEnd={() => setFlying(false)}
          />
        )}
      </span>
    </TactileWord>
  );
}

/**
 * The throw: the golden trident MATERIALIZES above the word (pop +
 * halo, staying in place - no drift), hovers with a tiny bob, then
 * the moment the double tide completes it SHOOTS left -> right with
 * a gentle droop and exits the right edge of the viewport. Rendered
 * via portal so the coordinates are viewport-true.
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
    const FORM_MS = fast ? 100 : 220; // materialize in place
    const HOVER_MS = fast ? 160 : 780; // bob, then shoot
    const VX = fast ? 2200 : 980; // px/s left -> right
    const G = fast ? 160 : 260; // gentle droop on the shot
    let raf = 0;
    const t0 = performance.now();

    const tick = (now: number) => {
      const t = now - t0;
      let x: number;
      let y: number;
      let scale: number;
      let opacity: number;

      if (t < FORM_MS) {
        // materialize IN PLACE: smooth pop, no drift, no bounce-back
        const u = t / FORM_MS;
        scale = 1 - 0.7 * Math.exp(-(t / 60));
        opacity = Math.min(1, u / 0.6);
        x = origin.x;
        y = origin.y;
      } else if (t < HOVER_MS) {
        opacity = 1;
        scale = 1;
        const h = t - FORM_MS;
        x = origin.x;
        y = origin.y - 3 * Math.sin(h / 120);
      } else {
        // SHOOT: straight right, slight droop, exits the right edge
        opacity = 1;
        scale = 1;
        const s = t - HOVER_MS;
        x = origin.x + (VX * s) / 1000;
        y = origin.y + (0.5 * G * (s / 1000) * (s / 1000));
        if (x > vw + 60) {
          onEndRef.current();
          return;
        }
      }
      el.style.opacity = String(opacity);
      el.style.transform =
        `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px) scale(${scale.toFixed(3)})`;
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [origin, fast]);

  // PORTAL to document.body: the tactile button is a transformed
  // ancestor - fixed positioning resolves against it, double-counting
  // coordinates. At the body root the flight uses true viewport
  // coordinates: materialize above the word, shoot right, exit right.
  return createPortal(
    <div className="ucsd-trident-wrap" aria-hidden="true">
      <span className="ucsd-trident-halo" style={{ top: origin.y, left: origin.x - 20 }} />
      <div className="ucsd-trident-fly" ref={ref} style={{ left: 0, top: 0 }}>
        <TridentMark height={26} />
      </div>
    </div>,
    document.body
  );
}