"use client";

import { useEffect, useRef } from "react";

/**
 * Basketball enters the shared stage from the left, bounces three
 * times with believable gravity (parabola per bounce, restitution-
 * scaled heights and air times), spins, squashes on impact, then
 * rolls out with friction. A soft contact shadow follows the ball
 * and breathes with its height, grounding the whole flight.
 * Choreographed on a rAF clock mutating transforms directly - no
 * re-renders.
 */
const DUR = 2075; // total, ms
const BOUNCE_H = [54, 32, 16]; // apex per bounce, px
const BOUNCE_T = [735, 566, 400]; // ms per bounce (k * sqrt(h))
const SQUASH = 0.24; // max squash fraction at impact
const ROLL_START = DUR * 0.82; // bounces end here, roll-out begins

function Ball({ size = 26 }: { size?: number }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} aria-hidden="true">
      <defs>
        <radialGradient id="bbGrad" cx="38%" cy="30%" r="80%">
          <stop offset="0%" stopColor="#ffb059" />
          <stop offset="55%" stopColor="#e8761d" />
          <stop offset="100%" stopColor="#a54808" />
        </radialGradient>
      </defs>
      <circle cx="12" cy="12" r="11" fill="url(#bbGrad)" />
      <path d="M12 1.5v21M1.5 12h21" stroke="rgba(60,20,0,0.55)" strokeWidth="1.1" />
      <path d="M4.9 5.2l14.2 13.6M19.1 5.2 4.9 18.8" stroke="rgba(60,20,0,0.3)" strokeWidth="1.1" />
    </svg>
  );
}

export default function BasketballStage({ onDone }: { onDone: () => void }) {
  const ref = useRef<HTMLDivElement>(null);
  const shadowRef = useRef<HTMLSpanElement>(null);
  const onDoneRef = useRef(onDone);
  useEffect(() => {
    onDoneRef.current = onDone;
  }, [onDone]);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const shadow = shadowRef.current;
    const stage = el.parentElement;
    const travel = stage ? stage.clientWidth + 76 : 440; // enter/exit room
    let raf = 0;
    const t0 = performance.now();
    const ease = (x: number) => (x < 0.12 ? 0 : x > 0.88 ? 1 : (x - 0.12) / 0.76);

    const tick = (now: number) => {
      const t = now - t0;
      if (t >= DUR) {
        onDoneRef.current();
        return;
      }
      const u = t / DUR;
      // horizontal drift across the stage
      const x = -38 + travel * ease(u);
      // vertical: parabola per bounce inside the bounce window
      let y = 0;
      if (t < ROLL_START) {
        let acc = 0;
        let b = -1;
        for (let i = 0; i < BOUNCE_T.length; i++) {
          if (t < acc + BOUNCE_T[i]) {
            b = i;
            break;
          }
          acc += BOUNCE_T[i];
        }
        if (b < 0) b = BOUNCE_T.length - 1;
        const tStart = BOUNCE_T.slice(0, b).reduce((a, v) => a + v, 0);
        const p = Math.min(1, Math.max(0, (t - tStart) / BOUNCE_T[b]));
        y = BOUNCE_H[b] * 4 * p * (1 - p);
      }
      const squash = 1 - SQUASH * Math.exp(-y / 5);
      // smooth spin while flying, friction decay once it rolls out
      const rot =
        t < ROLL_START
          ? t * 0.14
          : ROLL_START * 0.14 + (t - ROLL_START) * 0.05;
      const opacity =
        t < 90 ? t / 90 : t > DUR - 170 ? Math.max(0, (DUR - t) / 170) : 1;
      el.style.opacity = String(opacity);
      el.style.transform =
        `translate(${x.toFixed(1)}px, ${(-y).toFixed(1)}px) ` +
        `rotate(${rot.toFixed(1)}deg) ` +
        `scaleX(${(2 - squash).toFixed(3)}) scaleY(${squash.toFixed(3)})`;
      // contact shadow: a SIBLING layer, grounded - it only follows
      // the ball horizontally and breathes with height, it must NOT
      // inherit the ball's rotation/bounce transform
      if (shadow) {
        const breath = y / BOUNCE_H[0];
        shadow.style.opacity = String(0.52 * (1 - breath * 0.55));
        shadow.style.transform = `translateX(${x.toFixed(1)}px) scale(${(1 - breath * 0.26).toFixed(3)})`;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    <>
      <div className="stage-basketball" ref={ref}>
        <Ball size={26} />
      </div>
      <span className="bb-shadow" ref={shadowRef} aria-hidden="true" />
    </>
  );
}