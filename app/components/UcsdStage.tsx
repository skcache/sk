"use client";

import { useEffect, useRef } from "react";

/**
 * The trident projectile: after the word-side pop, a larger trident
 * travels left -> right across the shared stage on a gentle arc (it
 * rises mid-flight, leans forward, scales in/out), then exits. rAF
 * choreography on a ref transform - no re-renders.
 */
const ENTER_DELAY = 240; // let the word pop register first
const TRAVEL_MS = 950;

function TridentMark({ size = 24 }: { size?: number }) {
  return (
    <svg viewBox="0 0 14 14" width={size} height={size} fill="none" aria-hidden="true">
      <path d="M7 13.5V5.5" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" />
      <path d="M1.5 6h11" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" />
      <path d="M4 6V2M10 6V2" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" />
    </svg>
  );
}

export default function UcsdStage({ onDone }: { onDone: () => void }) {
  const ref = useRef<HTMLDivElement>(null);
  const onDoneRef = useRef(onDone);
  useEffect(() => {
    onDoneRef.current = onDone;
  }, [onDone]);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const stage = el.parentElement;
    const travel = stage ? stage.clientWidth + 60 : 400;
    let raf = 0;
    const t0 = performance.now();
    const total = ENTER_DELAY + TRAVEL_MS;
    const easeIO = (x: number) =>
      x < 0.5 ? 2 * x * x : 1 - Math.pow(-2 * x + 2, 2) / 2;

    const tick = (now: number) => {
      const t = now - t0;
      if (t >= total) {
        onDoneRef.current();
        return;
      }
      const u = Math.min(1, Math.max(0, (t - ENTER_DELAY) / TRAVEL_MS));
      const e = easeIO(u);
      const x = -30 + travel * e;
      // gentle arc: rises mid-flight, returns at the end
      const arc = -24 * Math.sin(Math.PI * u);
      const bob = 3.5 * Math.sin(u * Math.PI * 4);
      const tilt = -12 + 24 * u; // leans forward as it flies
      const scale = 0.82 + 0.18 * e + (u > 0.88 ? (1 - u) * 0.7 : 0);
      const opacity =
        t < ENTER_DELAY + 60
          ? t < ENTER_DELAY
            ? 0
            : (t - ENTER_DELAY) / 60
          : t > total - 130
            ? Math.max(0, (total - t) / 130)
            : 1;
      el.style.opacity = String(opacity);
      el.style.transform =
        `translate(${x.toFixed(1)}px, ${(arc + bob).toFixed(1)}px) ` +
        `rotate(${tilt.toFixed(1)}deg) scale(${scale.toFixed(3)})`;
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    <div className="stage-ucsd" ref={ref} aria-hidden="true">
      <TridentMark size={24} />
    </div>
  );
}