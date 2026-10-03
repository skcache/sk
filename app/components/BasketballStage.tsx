"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

/**
 * The basketball egg, POLISHED: the divider line above
 * "some things i've done" IS the court, used EXACTLY - the divider's
 * own getBoundingClientRect() drives a viewport-FIXED overlay, so the
 * ball bounces on that exact line at every viewport (no stage-local
 * conversion, no monitor/laptop difference).
 *
 * Motion is four deterministic PARABOLAS (no sine, no physics):
 * the first three arcs are full, equal bounces (apex 46, ground at
 * both ends); the fourth is the final HALF-RISE that ends exactly at
 * the right endpoint's apex, where the ball has already shrunk to
 * nothing. Impacts at 25% / 50% / 75% of the line.
 *
 * The ball grows 0->1 while rising into the first arc and shrinks
 * 1->0 while rising away on the final half-arc. Rotation is ~4.75
 * full clockwise turns across the whole animation (never pausing at
 * impacts). Each impact is ONLY a brief squash + a fast bottom->top
 * light sweep INSIDE the ball (clipped to the circle, NOT rotated
 * with the seams, peaking with a subtle warm drop-shadow). There are
 * no particles, no ground dots, nothing remains after contact.
 */
const DUR_MS = 3200; // the complete court crossing (3.1-3.3s target)
const APEX = 46; // equal apex for every full bounce arc (px)
const FULL_TURNS = 4.75; // ~1710 deg of continuous clockwise rotation
const BALL = 28; // the svg ball size, px
const SQUASH_MS = 60; // brief contact squash window

export default function BasketballStage({ onDone }: { onDone: () => void }) {
  const ref = useRef<HTMLDivElement>(null); // outer: translate + squash
  const rotRef = useRef<HTMLDivElement>(null); // inner: rotation
  const sweepRef = useRef<HTMLSpanElement>(null); // clipped glow band
  const onDoneRef = useRef(onDone);
  // the fixed overlay must live OUTSIDE any transformed ancestor, or
  // "fixed" silently becomes relative to the stage - portal to body
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    onDoneRef.current = onDone;
  }, [onDone]);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    const el = ref.current;
    const rot = rotRef.current;
    const sweep = sweepRef.current;
    if (!el || !rot || !sweep) return;

    // the court, in VIEWPORT coordinates, straight from the divider
    const line = document.querySelector<HTMLElement>("#things-done");
    const lr = line?.getBoundingClientRect();
    if (!lr) return;
    const lineLeft = lr.left;
    const lineRight = lr.right;
    const groundY = lr.top;

    const span = lineRight - lineLeft;
    let raf = 0;
    let prev = 0;
    let started = 0;
    let squash = 0; // contact squash countdown (ms)
    let doneSent = false;

    // one fast bottom->top light sweep inside the ball, clipped to the
    // circle - peaks with a subtle warm glow, fades completely
    const sweepUp = () => {
      sweep.style.transition = "none";
      sweep.style.opacity = "1";
      sweep.style.transform = "translateY(104%)";
      // force a reflow so the transition below animates from here
      void sweep.offsetHeight;
      sweep.style.transition = "transform 135ms ease-out, opacity 135ms ease-out";
      sweep.style.transform = "translateY(-104%)";
      // subtle brightness peak mid-sweep, then nothing remains
      el.style.filter = "drop-shadow(0 0 3px rgba(255, 150, 70, 0.55))";
      setTimeout(() => {
        el.style.filter = "none";
      }, 60);
      setTimeout(() => {
        sweep.style.opacity = "0";
        sweep.style.transform = "translateY(104%)";
      }, 150);
    };

    const tick = (now: number) => {
      if (!started) started = now;
      const t = now - started;
      if (prev) {
        const u0 = Math.min(1, (prev - started) / DUR_MS);
        const u = Math.min(1, t / DUR_MS);
        // the four segments end at 1/4, 1/2, 3/4, 1 -> the three
        // impacts happen EXACTLY at the inside boundaries
        for (const k of [1, 2, 3]) {
          if (u0 < k / 4 && u >= k / 4) {
            squash = SQUASH_MS;
            sweepUp();
          }
        }
        if (u >= 1) {
          // the ball is already invisible (shrink completed at the
          // final apex); stop the loop and unmount shortly after
          if (!doneSent) {
            doneSent = true;
            setTimeout(() => onDoneRef.current(), 120);
          }
          return;
        }
        // segment-local progress for the deterministic parabolas
        const seg = Math.min(3, Math.floor(u * 4));
        const s = u * 4 - seg;
        const x = lineLeft + u * span;
        const height =
          seg < 3 ? 4 * APEX * s * (1 - s) : APEX * (2 * s - s * s); // final HALF-RISE
        const y = groundY - BALL - height;
        const deg = FULL_TURNS * 360 * u;
        // grow while rising into the first arc; shrink through the
        // final rise (gone exactly at the right endpoint's apex)
        const grow = seg === 0 ? Math.min(1, s * 1.5) : seg === 3 ? 1 - s : 1;
        rot.style.transform = `rotate(${deg}deg)`;
        if (squash > 0) {
          squash -= 16;
          const d = Math.sin(Math.PI * (1 - Math.max(0, squash) / SQUASH_MS));
          const sx = 1 + 0.08 * d;
          const sy = 1 - 0.12 * d;
          el.style.transform = `translate(${x}px, ${y}px) scale(${grow * sx}, ${grow * sy})`;
        } else {
          el.style.transform = `translate(${x}px, ${y}px) scale(${grow}, ${grow})`;
        }
      }
      prev = now;
      raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [mounted]);

  const overlay = (
    <div className="bb-overlay" aria-hidden="true">
      {/* OUTER: translate + squash only */}
      <div className="stage-basketball" ref={ref}>
        {/* the clipping circle: keeps the sweep inside the ball and
            independent from the seam rotation */}
        <div className="bb-clip">
          {/* INNER: seams rotate; the glow overlay does not */}
          <div className="bb-rotate" ref={rotRef}>
            <svg width={BALL} height={BALL} viewBox="0 0 28 28">
              <circle cx="14" cy="14" r="13" fill="#E2620F" stroke="#221200" strokeWidth="1.6" />
              <path
                d="M2.8 10 Q14 -3 25.2 10"
                stroke="#221200"
                strokeWidth="1.4"
                strokeLinecap="round"
                fill="none"
                opacity="0.85"
              />
              <path d="M2 14h24" stroke="#221200" strokeWidth="1.4" strokeLinecap="round" fill="none" opacity="0.85" />
              <path
                d="M2.8 18 Q14 31 25.2 18"
                stroke="#221200"
                strokeWidth="1.4"
                strokeLinecap="round"
                fill="none"
                opacity="0.85"
              />
            </svg>
          </div>
          {/* the fast bottom->top light sweep, clipped, not rotated */}
          <span className="bb-sweep" ref={sweepRef} />
        </div>
      </div>
    </div>
  );

  return mounted ? createPortal(overlay, document.body) : null;
}