"use client";

import { useEffect, useRef } from "react";

/**
 * Basketball enters the shared stage from the left, bounces three
 * times with believable gravity (parabola per bounce, restitution-
 * scaled heights), rotates, squashes on impact, rolls out and exits
 * right. Choreographed on a rAF clock mutating the ball's transform
 * directly - no re-renders, no animation-engine dependencies.
 */
const DUR = 1900; // total, ms
const BOUNCE_H = [46, 27, 13]; // apex per bounce, px
const BOUNCE_T = [678, 520, 361]; // ms per bounce (k * sqrt(h))
const SQUASH = 0.24; // max squash fraction at impact

function Ball({ size = 26 }: { size?: number }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} aria-hidden="true">
      <circle cx="12" cy="12" r="11" fill="#e8761d" />
      <path d="M12 1.5v21M1.5 12h21" stroke="rgba(96,40,3,0.5)" strokeWidth="1.2" />
      <path d="M4.8 4.8l14.4 14.4M19.2 4.8 4.8 19.2" stroke="rgba(96,40,3,0.28)" strokeWidth="1.2" />
    </svg>
  );
}

export default function BasketballStage({ onDone }: { onDone: () => void }) {
  const ref = useRef<HTMLDivElement>(null);
  const onDoneRef = useRef(onDone);
  useEffect(() => {
    onDoneRef.current = onDone;
  }, [onDone]);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const stage = el.parentElement;
    const travel = stage ? stage.clientWidth + 72 : 420; // enter/exit room
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
      const x = -36 + travel * ease(u);
      // vertical: parabola per bounce inside the bounce window
      let y = 0;
      let squash = 1;
      const tb = t; // bounce clock == clock (bounce phase is 82% of duration)
      const tLimit = DUR * 0.82;
      if (tb < tLimit) {
        let acc = 0;
        let b = -1;
        for (let i = 0; i < BOUNCE_T.length; i++) {
          if (tb < acc + BOUNCE_T[i]) {
            b = i;
            break;
          }
          acc += BOUNCE_T[i];
        }
        if (b < 0) b = BOUNCE_T.length - 1;
        const tStart = BOUNCE_T.slice(0, b).reduce((a, v) => a + v, 0);
        const p = Math.min(1, Math.max(0, (tb - tStart) / BOUNCE_T[b]));
        y = BOUNCE_H[b] * 4 * p * (1 - p);
      }
      squash = 1 - SQUASH * Math.exp(-y / 4);
      const rotate = (t / 1000) * 120; // smooth spin
      const opacity =
        t < 90 ? t / 90 : t > DUR - 170 ? Math.max(0, (DUR - t) / 170) : 1;
      el.style.opacity = String(opacity);
      el.style.transform =
        `translate(${x.toFixed(1)}px, ${-y.toFixed(1)}px) ` +
        `rotate(${rotate.toFixed(1)}deg) ` +
        `scaleX(${(2 - squash).toFixed(3)}) scaleY(${squash.toFixed(3)})`;
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    <div className="stage-basketball" ref={ref}>
      <Ball size={26} />
    </div>
  );
}