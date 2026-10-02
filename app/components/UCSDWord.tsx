"use client";

import { useCallback, useEffect, useRef, useState, type AnimationEvent } from "react";
import { createPortal } from "react-dom";
import { useReducedMotion } from "motion/react";
import TactileWord from "./TactileWord";

const WIPE_DELAY = 1100; // after the page reveal settles

/**
 * UC San Diego, the V2 way.
 *
 * CLICK: the two-pass fill runs NATIVE inside the letters (a NAVY
 * tide rises baseline -> top, then a GOLD tide, both down->up). At
 * the same time the gold pass starts, a real TRIDENT forms above the
 * word (scale-pop), LEVITATES a moment, and once the double pass is
 * done it SHOOTS straight up, then arcs down off the right of the
 * screen - the fill is the trident's wake. After the gold pass the
 * letters melt back to plain ink. Fires on load once + replays on
 * every click. Reduced motion: no fill, instant throw.
 */
function TridentMark({ size = 24 }: { size?: number }) {
  return (
    <svg viewBox="0 0 36 100" width={size} height={size * 2.78} fill="currentColor" aria-hidden="true">
      {/* center tine: spear tip + tall blade */}
      <path d="M18 1.5 21.2 7.4 14.8 7.4Z" />
      <path d="M16.2 7.4h3.6v22h-3.6z" />
      {/* side tines: curved blades tapering to points */}
      <path d="M18 29c-6.6 8-10 15.6-10.4 23L4.6 57l5.4-3.2 1.2-5.6c.4-5.6 2.6-10.6 6.6-15.2z" />
      <path d="M18 29c6.6 8 10 15.6 10.4 23l3 5-5.4-3.2-1.2-5.6c-.4-5.6-2.6-10.6-6.6-15.2z" />
      {/* crossbar */}
      <rect x="2" y="56" width="32" height="6" rx="3" />
      {/* shaft with a taper */}
      <path d="M16.9 62h2.2v30h-2.2z" />
      <path d="M17.2 92h1.6v6h-1.6z" />
      {/* pommel */}
      <circle cx="18" cy="99" r="3.4" />
    </svg>
  );
}

export default function UCSDWord() {
  const reduceMotion = useReducedMotion();
  const [rise, setRise] = useState(false);
  const [melt, setMelt] = useState(false);
  const [flying, setFlying] = useState(false);
  const [flightRun, setFlightRun] = useState(0); // fresh element per throw
  const [origin, setOrigin] = useState<{ x: number; y: number } | null>(null);
  const wordRef = useRef<HTMLSpanElement>(null);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  // The two-pass down->up fill (navy then gold, native in the
  // letters); fires reliably on load after the reveal settles, and
  // EVERY click REPLAYS it. The gold pass's end triggers the letter
  // melt back to plain ink.
  const runPaint = useCallback(() => {
    if (reduceMotion) return;
    setMelt(false);
    setRise(false); // reset first so the chain restarts even mid-pass
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        setRise(true);
      });
    });
  }, [reduceMotion]);

  // mount trigger: guaranteed to run once (timer + cleanup guard)
  useEffect(() => {
    const t = setTimeout(runPaint, WIPE_DELAY);
    return () => clearTimeout(t);
  }, [runPaint]);

  const sweepEnd = useCallback((e: AnimationEvent<HTMLSpanElement>) => {
    // only the GOLD pass's own end melts the letters (the navy pass
    // ends earlier; ancestor animations bubble animationend too)
    if (e.animationName === "ucsd-fill-gold") setMelt(true);
  }, []);

  const clearFlight = useCallback(() => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
    setFlying(false);
  }, []);

  // The full choreography: click -> fill starts; ~1.15s in (gold
  // pass) the trident FORMS above the word; once the double pass is
  // done (~1.8s) it SHOOTS straight up then arcs down off the right.
  const throwTrident = useCallback(() => {
    const rect = wordRef.current?.getBoundingClientRect();
    if (!rect) return;
    setOrigin({ x: rect.left + rect.width / 2, y: rect.top - 8 });
    setFlying(true);
    setFlightRun((r) => r + 1);
  }, []);

  const activate = useCallback(() => {
    runPaint(); // every click replays the two-pass fill
    if (flying) return; // one throw at a time
    const rect = wordRef.current?.getBoundingClientRect();
    if (!rect) return;
    if (reduceMotion) {
      throwTrident();
    } else {
      // form above the word while the gold pass runs; the flight's
      // shoot phase begins after the double pass completes
      timers.current.push(setTimeout(throwTrident, 1150));
    }
    timers.current.push(setTimeout(clearFlight, 2800));
  }, [runPaint, flying, throwTrident, clearFlight, reduceMotion]);

  useEffect(() => clearFlight, [clearFlight]);

  return (
    <TactileWord label="UC San Diego" onActivate={activate} className="whitespace-nowrap">
      <span className="word-anchor" ref={wordRef}>
        {/* two-pass down->up sweep: navy band rises, then gold band
            rises, then the phrase returns to plain ink. explicit {" "}
            gaps keep the words apart (JSX would otherwise eat the
            spaces between line-break spans) */}
        <span
          className={`ucsd-word${rise && !reduceMotion ? " ucsd-rise" : ""}${melt ? " ucsd-melt" : ""}`}
          onAnimationEnd={rise ? sweepEnd : undefined}
        >
          <span className="ucsd-seg">UC</span>{" "}
          <span className="ucsd-seg">San</span>{" "}
          <span className="ucsd-seg">Diego</span>
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
 * The throw, the user's vision: the trident FORMS above the word
 * (a springy scale-pop + fade), LEVITATES with a subtle bob, then,
 * once the double pass is done, SHOOTS straight up (no horizontal
 * drift), and after a moment arcs down off the right edge of the
 * screen - nose pitching down like a thrown weapon. Fixed position
 * over the page, rendered via portal so the coordinates are
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
    const vh = window.innerHeight;
    // the choreography timeline (ms from mount)
    const FORM_MS = 280; // scale-pop into existence above the word
    const HOVER_MS = fast ? 0 : 620; // levitate above the word
    const SHOOT_MS = fast ? 340 : 650; // straight up, then the arc
    const G = fast ? 1500 : 1750; // px/s^2 gravity on the arc
    const vyShot = fast ? -700 : -620; // straight-up launch speed
    const vxTop = fast ? 1500 : 620; // horizontal speed at arc speed
    const ramp = fast ? 120 : 220; // ms to reach the horizontal speed
    let raf = 0;
    const t0 = performance.now();

    const tick = (now: number) => {
      const t = now - t0; // ms since mount
      let x: number;
      let y: number;
      let rot: number;
      let scale: number;
      let opacity: number;

      // ---- FORM: springy scale-pop, fading in, rising a touch ----
      if (t < FORM_MS) {
        const u = t / FORM_MS;
        scale = 1 - 0.72 * Math.exp(-(t / 70)) * Math.cos(t / 55);
        opacity = Math.min(1, u / 0.75);
        x = origin.x;
        y = origin.y - 34 * u;
        rot = -16;
      } else {
        opacity = 1;
        scale = 1;
        // ---- HOVER: levitate above the word with a tiny bob ----
        if (t < HOVER_MS) {
          const h = t - FORM_MS;
          x = origin.x;
          y = origin.y - 34 - 4 * Math.sin(h / 130);
          rot = -16 + (h / 220) * 4; // settle from -16 to -12
        } else {
          // ---- SHOOT: straight up first, then the downward arc
          // to the right edge, nose pitching down as it falls ----
          const s = t - HOVER_MS;
          const vx =
            s < ramp ? (s / ramp) * vxTop : vxTop;
          const dy = vyShot * (s / 1000) + 0.5 * G * (s / 1000) * (s / 1000);
          x = origin.x + (vx * s) / 1000;
          y = origin.y - 34 + dy;
          rot = -12 + 64 * Math.min(1, s / 1400); // nose-down pitch
          if (x > vw + 46 || y > vh + 90) {
            onEndRef.current();
            return;
          }
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
  // ancestor, and position:fixed inside one resolves against THAT
  // ancestor (double-counted coordinates - the throw never rose on
  // screen). rendering at the body root makes the flight use true
  // viewport coordinates: form at the word, shoot, arc, exit right.
  return createPortal(
    <div className="ucsd-trident-fly" ref={ref} aria-hidden="true" style={{ left: 0, top: 0 }}>
      <TridentMark size={24} />
    </div>,
    document.body
  );
}