"use client";

import { useEffect, useRef } from "react";

/**
 * The trident projectile: after the word-side pop, a larger trident
 * travels left -> right across the shared stage with a light bob and
 * tilt, then exits. rAF choreography on a ref transform - no
 * re-renders, no animation-engine dependencies.
 */
const ENTER_DELAY = 260; // let the word pop register first
const TRAVEL_MS = 900;

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

    const tick = (now: number) => {
      const t = now - t0;
      if (t >= total) {
        onDoneRef.current();
        return;
      }
      const u = Math.min(1, Math.max(0, (t - ENTER_DELAY) / TRAVEL_MS));
      const x = -30 + travel * u;
      const bob = 5 * Math.sin(u * Math.PI * 3);
      const tilt = -10 + 20 * u; // leans forward as it flies
      const opacity =
        t < ENTER_DELAY + 60
          ? t < ENTER_DELAY
            ? 0
            : (t - ENTER_DELAY) / 60
          : t > total - 120
            ? Math.max(0, (total - t) / 120)
            : 1;
      el.style.opacity = String(opacity);
      el.style.transform =
        `translate(${x.toFixed(1)}px, ${(-4 + bob).toFixed(1)}px) ` +
        `rotate(${tilt.toFixed(1)}deg)`;
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