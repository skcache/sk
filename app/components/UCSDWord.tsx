"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useReducedMotion } from "motion/react";
import TactileWord from "./TactileWord";

const WIPE_DELAY = 1100; // after the page reveal settles
const FLIGHT_MS = 1400; // max throw window (physics exits earlier on small screens)

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
    <svg viewBox="0 0 24 24" width={size} height={size} fill="none" aria-hidden="true">
      {/* three spear tips (bold enough to read at small sizes) */}
      <path d="M8.7 5.9 6.6 2.6 4.7 6.2Z" fill="currentColor" stroke="none" />
      <path d="M12 1 14 4.4 10 4.4Z" fill="currentColor" stroke="none" />
      <path d="M15.3 5.9 17.4 2.6 19.3 6.2Z" fill="currentColor" stroke="none" />
      {/* prongs: the side ones curve out like a classic trident */}
      <path d="M6.6 6.2 7.6 9.6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M12 4.4v5.3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M17.4 6.2 16.4 9.6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      {/* crossbar */}
      <path d="M4.5 10h15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      {/* shaft with a slight taper + pommel */}
      <path d="M12 12v6.8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M9.8 20.4h4.4" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" />
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

  // ONE left-to-right color pass after the reveal settles: the phrase
  // paints navy/gold (UC + Diego navy, San gold), holds colored a
  // beat, then fades back to plain ink - one time, never repeats
  useEffect(() => {
    if (reduceMotion) return;
    const t = setTimeout(() => setPainted(true), WIPE_DELAY);
    return () => clearTimeout(t);
  }, [reduceMotion]);

  // remove the painted class once the full pass (reveal + hold +
  // fade-out) is over, so the phrase is back to plain ink
  useEffect(() => {
    if (!painted) return;
    const t = setTimeout(() => setPainted(false), 3050);
    return () => clearTimeout(t);
  }, [painted]);

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
        {/* official coloring during the one-time pass: UC + Diego
            navy, San gold - segments reveal left->right, hold, then
            fade back to ink. explicit {" "} gaps keep the words apart
            (JSX would otherwise eat the spaces between line-break
            spans) */}
        <span className={`ucsd-word${painted && !reduceMotion ? " ucsd-painted" : ""}`}>
          <span className="ucsd-seg ucsd-navy">UC</span>{" "}
          <span className="ucsd-seg ucsd-gold">San</span>{" "}
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
 * The throw: a REAL projectile. The trident spawns at the word, is
 * launched up-right with gravity pulling it into a natural arc, it
 * TUMBLES end-over-end like a thrown weapon, and exits the right
 * edge of the viewport. Fixed position - over the page, never the
 * stage.
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
    // ballistic launch: up-right, gravity pulls the arc down
    const vx = fast ? 2100 : 850; // px/s rightward
    const vy0 = fast ? -300 : -640; // px/s upward
    const G = fast ? 1200 : 1900; // px/s^2
    const endX = vw + 70;
    const dur = ((endX - origin.x) / vx) * 1000; // flight ms to leave the view
    const tumble = fast ? 360 : 520; // degrees of end-over-end spin
    let raf = 0;
    const t0 = performance.now();

    const tick = (now: number) => {
      const t = now - t0; // ms
      if (t >= dur) {
        onEndRef.current();
        return;
      }
      const x = origin.x + vx * (t / 1000);
      const y = origin.y + (vy0 * t) / 1000 + (0.5 * G * (t / 1000) * (t / 1000));
      const rot = (t / dur) * tumble;
      const scale = t < 70 ? 0.85 + (0.15 * t) / 70 : 1;
      const opacity =
        t < 70 ? t / 70 : t > dur - 130 ? Math.max(0, (dur - t) / 130) : 1;
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
  // ancestor, and position:fixed inside one resolves against THAT
  // ancestor (double-counted coordinates - the throw never rose on
  // screen). rendering at the body root makes the flight use true
  // viewport coordinates: spawn at the word, rise, arc, exit right.
  return createPortal(
    <div className="ucsd-trident-fly" ref={ref} aria-hidden="true" style={{ left: 0, top: 0 }}>
      <TridentMark size={26} />
    </div>,
    document.body
  );
}