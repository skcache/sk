"use client";

import { useEffect, useRef } from "react";

/**
 * Basketball enters the shared stage from the left and crosses with
 * NBA-quality ballistics: REAL time-integrated physics (gravity +
 * restitution), so every bounce apex and airtime falls out of the
 * math naturally (54 -> 32 -> 16px with r = 0.77), the spin is
 * consistent with the crossing speed, and the squash happens ONLY
 * at the impact window (a brief 90ms dip), never a permanent
 * distortion. A grounded contact shadow follows horizontally and
 * breathes with height. Choreographed on a rAF clock mutating
 * transforms directly - no re-renders.
 */
const DUR = 2050; // total, ms
const GRAVITY = 2600; // px/s^2
const RESTITUTION = 0.77; // r^2 = 0.59 -> natural apex decay 54/32/16
const APEX = 54; // first apex, px (desktop)
const IMPACT_MS = 90; // squash window at each ground contact
const SPINS = 6.5; // rotations across the whole crossing

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
    // stage height caps the apex on short viewports (72px mobile)
    const maxApex = stage && stage.clientHeight < 88 ? 40 : APEX;
    const travel = stage ? stage.clientWidth + 76 : 440; // enter/exit room
    const vy0 = Math.sqrt(2 * GRAVITY * maxApex); // px/s launch upward
    let raf = 0;
    let startT = 0;
    let prev = 0;
    let y = 0; // height above the floor
    let vy = vy0; // upward positive
    let impactLeft = 0; // squash window countdown, ms
    let impactAmp = 0;
    const ease = (x: number) => (x < 0.12 ? 0 : x > 0.88 ? 1 : (x - 0.12) / 0.76);

    const tick = (now: number) => {
      const elapsed = now - startT;
      if (elapsed >= DUR) {
        onDoneRef.current();
        return;
      }
      const dt = Math.min(32, now - prev);
      prev = now;
      // ----- vertical: true time integration -----
      vy -= (GRAVITY * dt) / 1000;
      y += (vy * dt) / 1000;
      if (y <= 0) {
        const speed = Math.abs(vy);
        y = 0;
        if (vy < 0) {
          // micro-bounce settler: when the next apex is under 3px the
          // ball rolls instead of ticking tiny bounces forever
          const nextApex = (vy * vy) / (2 * GRAVITY);
          if (nextApex < 3) {
            vy = 0;
          } else {
            vy = -vy * RESTITUTION;
            impactLeft = IMPACT_MS;
            impactAmp = Math.min(0.3, Math.max(0.16, speed / 2600));
          }
        }
      }
      // roll-out: after 82% of the crossing the ball is done bouncing
      // and rolls cleanly (no impacts, no squash - zero distortion)
      if (elapsed > DUR * 0.82) {
        y = 0;
        vy = 0;
      }
      // impact squash: a brief dip that returns - never persistent
      let scX = 1;
      let scY = 1;
      if (impactLeft > 0) {
        impactLeft -= dt;
        const k = Math.max(0, impactLeft / IMPACT_MS);
        const dip = impactAmp * Math.sin(Math.PI * (1 - k));
        scY = 1 - dip;
        scX = 1 + dip * 0.85;
      }
      // ----- horizontal + spin -----
      const u = elapsed / DUR;
      const x = -38 + travel * ease(u);
      const rot = u * 360 * SPINS;
      const opacity =
        elapsed < 90 ? elapsed / 90 : elapsed > DUR - 170 ? Math.max(0, (DUR - elapsed) / 170) : 1;
      el.style.opacity = String(opacity);
      el.style.transform =
        `translate(${x.toFixed(1)}px, ${(-y).toFixed(1)}px) ` +
        `rotate(${rot.toFixed(1)}deg) ` +
        `scaleX(${scX.toFixed(3)}) scaleY(${scY.toFixed(3)})`;
      // contact shadow: grounded sibling, follows x, breathes with height
      if (shadow) {
        const breath = Math.min(1, y / maxApex);
        shadow.style.opacity = String(0.52 * (1 - breath * 0.55));
        shadow.style.transform = `translateX(${x.toFixed(1)}px) scale(${(1 - breath * 0.26).toFixed(3)})`;
      }
      raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame((now) => {
      startT = now;
      prev = now;
      raf = requestAnimationFrame(tick);
    });
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