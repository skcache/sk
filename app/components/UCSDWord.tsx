"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useReducedMotion } from "motion/react";
import TactileWord from "./TactileWord";

const WIPE_DELAY = 1100; // after the page reveal settles
const FLIGHT_MS = 1150; // trident: up, then right off the viewport
const PICK_UP_MS = 170; // rises above the word before flying

/**
 * UC San Diego, the V2 way.
 *
 * FIRST LOAD: after the page reveal settles, the phrase gets ONE
 * left-to-right color pass and KEEPS its official coloring: "UC" and
 * "Diego" are UCSD navy blue, "San" is UCSD gold. The pass cascades
 * left-to-right across the three segments (clip reveal). Never
 * repeats. Reduced motion: plain ink.
 *
 * CLICK: a trident SPAWNS at the word, RISES straight up from it,
 * then flies right and OFF THE SCREEN (viewport edge) - it never
 * uses the shared stage. Extra clicks are ignored while one throw
 * is running; every completed throw can fire another.
 */
function TridentMark({ size = 26 }: { size?: number }) {
  return (
    <svg viewBox="0 0 14 14" width={size} height={size} fill="none" aria-hidden="true">
      <path d="M7 13.5V5.5" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" />
      <path d="M1.5 6h11" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" />
      <path d="M4 6V2M10 6V2" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" />
    </svg>
  );
}

export default function UCSDWord() {
  const reduceMotion = useReducedMotion();
  const [painted, setPainted] = useState(false);
  const [flying, setFlying] = useState(false);
  const [flightRun, setFlightRun] = useState(0); // fresh element per throw
  const [origin, setOrigin] = useState<{ x: number; y: number } | null>(null);
  const wordRef = useRef<HTMLSpanElement>(null);
  const doneRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ONE left-to-right color pass after the reveal settles (stays
  // painted: UC + Diego navy, San gold)
  useEffect(() => {
    if (reduceMotion) return;
    const t = setTimeout(() => setPainted(true), WIPE_DELAY);
    return () => clearTimeout(t);
  }, [reduceMotion]);

  const clearFlying = useCallback(() => {
    if (doneRef.current) {
      clearTimeout(doneRef.current);
      doneRef.current = null;
    }
    setFlying(false);
  }, []);

  const activate = useCallback(() => {
    if (flying) return; // one throw at a time
    const rect = wordRef.current?.getBoundingClientRect();
    if (!rect) return;
    setOrigin({ x: rect.left + rect.width / 2, y: rect.top - 6 });
    setFlying(true);
    setFlightRun((r) => r + 1);
    doneRef.current = setTimeout(clearFlying, FLIGHT_MS + 60);
  }, [flying, clearFlying]);

  useEffect(() => clearFlying, [clearFlying]);

  return (
    <TactileWord label="UC San Diego" onActivate={activate} className="whitespace-nowrap">
      <span className="word-anchor" ref={wordRef}>
        {/* official coloring after the one-time pass: UC + Diego navy,
            San gold - the segments clip-reveal left->right in sequence */}
        <span className={`ucsd-word${painted && !reduceMotion ? " ucsd-painted" : ""}`}>
          <span className="ucsd-seg ucsd-navy">UC</span>
          <span className="ucsd-seg ucsd-gold">San</span>
          <span className="ucsd-seg ucsd-navy">Diego</span>
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
 * The throw: spawns at the word, rises straight up (pick-up), then
 * flies right with a light arc + tilt and EXITS THE VIEWPORT. Fixed
 * position so it travels over the page, never in the stage.
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
    const dur = fast ? 420 : FLIGHT_MS;
    let raf = 0;
    const t0 = performance.now();
    const vw = window.innerWidth;
    const easeIO = (x: number) => (x < 0.5 ? 2 * x * x : 1 - Math.pow(-2 * x + 2, 2) / 2);

    const tick = (now: number) => {
      const t = now - t0;
      if (t >= dur) {
        onEndRef.current();
        return;
      }
      const u = t / dur;
      // phase 1: rise above the word; phase 2: fly right off the screen
      const rise = Math.min(1, u / (PICK_UP_MS / dur));
      const fly = Math.max(0, (u - PICK_UP_MS / dur) / (1 - PICK_UP_MS / dur));
      const x = origin.x + (vw + 60 - origin.x) * easeIO(fly);
      const y = origin.y - 26 * easeIO(rise) - 14 * Math.sin(Math.PI * fly);
      const tilt = -6 + 26 * fly; // leans forward as it flies
      const scale = 0.9 + 0.1 * easeIO(rise);
      const opacity =
        t < 70 ? t / 70 : t > dur - 100 ? Math.max(0, (dur - t) / 100) : 1;
      el.style.opacity = String(opacity);
      el.style.transform =
        `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px) ` +
        `rotate(${tilt.toFixed(1)}deg) scale(${scale.toFixed(3)})`;
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [origin, fast]);

  return <div className="ucsd-trident-fly" ref={ref} aria-hidden="true" style={{ left: 0, top: 0 }}>
    <TridentMark size={26} />
  </div>;
}