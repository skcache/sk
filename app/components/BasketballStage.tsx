"use client";

import { useEffect, useRef } from "react";

/**
 * The basketball egg, FINAL: the separator line above
 * "some things i've done" IS the court. The ball travels from the
 * line's LEFT end to its RIGHT end at constant horizontal speed along
 * one deterministic 3.5-arc sine path:
 *
 *   height = APEX * |sin(3.5 * PI * u)|      u: 0 -> 1
 *
 * which puts the impacts exactly at u = 2/7, 4/7, 6/7 and the apexes
 * at 1/7, 3/7, 5/7 - three identical bounces, then the final rising
 * half-arc ends AT the right endpoint's apex, where the ball has
 * already shrunk to nothing. No real physics, no viewport math, no
 * offscreen travel, no particles: each impact is only a brief squash
 * + one tiny soft orange glow on the divider that vanishes.
 *
 * The ball grows while rising from the left endpoint (scale 0 -> 1 by
 * the first apex) and shrinks while rising away after the last impact
 * (scale 1 -> 0 by the final apex). Rotation tracks the travel
 * continuously: ~3.5 full clockwise turns (~1260 deg) across the path,
 * never pausing at impacts.
 *
 * All coordinates come from the divider's own getBoundingClientRect()
 * converted into stage-local space, so the performance is identical on
 * any viewport.
 */
const DUR_MS = 2850; // the complete court crossing (2.7-3.0s target)
const APEX = 44; // one bounce height, px (42-48)
const FULL_TURNS = 3.5; // 1260 deg of continuous clockwise rotation
const BALL = 28; // the svg ball size, px (26-28)
const SQUASH_MS = 60; // brief contact squash window

export default function BasketballStage({ onDone }: { onDone: () => void }) {
  const ref = useRef<HTMLDivElement>(null);
  const glowRef = useRef<HTMLDivElement>(null);
  const onDoneRef = useRef(onDone);

  useEffect(() => {
    onDoneRef.current = onDone;
  }, [onDone]);

  useEffect(() => {
    const el = ref.current;
    const glowHost = glowRef.current;
    if (!el || !glowHost) return;
    const stage = el.parentElement as HTMLElement | null;
    const sr = stage?.getBoundingClientRect() ?? { left: 0, top: 0 };
    // the court: the divider's own rect, converted to stage-local
    const line = document.querySelector<HTMLElement>("#things-done");
    const lr = line?.getBoundingClientRect();
    if (!lr) return;
    const lineLeft = lr.left - sr.left;
    const lineRight = lr.right - sr.left;
    const groundY = lr.top - sr.top;

    const span = lineRight - lineLeft;
    let raf = 0;
    let prev = 0;
    let started = 0;
    let squash = 0; // contact squash countdown (ms)
    let doneSent = false;

    // one soft glow at the contact point; 90ms fade, then removed
    const glow = (x: number) => {
      const g = document.createElement("span");
      g.className = "bb-contact-glow";
      g.style.left = x - 10 + "px";
      g.style.top = groundY - 4 + "px";
      glowHost.appendChild(g);
      requestAnimationFrame(() => {
        g.style.opacity = "0";
      });
      setTimeout(() => g.remove(), 120);
    };

    const tick = (now: number) => {
      if (!started) started = now;
      const t = now - started;
      if (prev) {
        const u0 = Math.min(1, (prev - started) / DUR_MS);
        const u = Math.min(1, t / DUR_MS);
        // the three impacts: exactly at 2/7, 4/7, 6/7 (one each)
        for (const k of [2, 4, 6]) {
          if (u0 < k / 7 && u >= k / 7) {
            squash = SQUASH_MS;
            glow(lineLeft + (k / 7) * span);
          }
        }
        // stop the loop once the court is fully crossed
        if (u >= 1) {
          el.style.opacity = "0";
          if (!doneSent) {
            doneSent = true;
            setTimeout(() => onDoneRef.current(), 140);
          }
          return;
        }
        const height = APEX * Math.abs(Math.sin(3.5 * Math.PI * u));
        const x = lineLeft + u * span;
        const y = groundY - BALL - height;
        const deg = FULL_TURNS * 360 * u;
        // grow while rising from the left; shrink while rising away
        const grow = u < 1 / 7 ? u * 7 : u > 6 / 7 ? (1 - u) * 7 : 1;
        if (squash > 0) {
          squash -= 16;
          const d = Math.sin(Math.PI * (1 - Math.max(0, squash) / SQUASH_MS));
          const sx = 1 + 0.08 * d;
          const sy = 1 - 0.12 * d;
          el.style.transform = `translate(${x}px, ${y}px) rotate(${deg}deg) scale(${grow * sx}, ${grow * sy})`;
        } else {
          el.style.transform = `translate(${x}px, ${y}px) rotate(${deg}deg) scale(${grow}, ${grow})`;
        }
      }
      prev = now;
      raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    <>
      <div className="stage-basketball" ref={ref} aria-hidden="true">
        {/* a simple, recognizable 2D basketball: orange circle, dark
            stroke, rounded black seams - reads as a ball without the
            label */}
        <svg width={BALL} height={BALL} viewBox="0 0 28 28">
          <circle cx="14" cy="14" r="12.2" fill="#E2620F" stroke="#221200" strokeWidth="2" />
          <path d="M14 1.8v24.4" stroke="#221200" strokeWidth="1.4" strokeLinecap="round" fill="none" opacity="0.85" />
          <path d="M3.6 7.2c7 2.6 13.8 2.6 20.8 0" stroke="#221200" strokeWidth="1.4" strokeLinecap="round" fill="none" opacity="0.85" />
          <path d="M3.6 20.8c7-2.6 13.8-2.6 20.8 0" stroke="#221200" strokeWidth="1.4" strokeLinecap="round" fill="none" opacity="0.85" />
        </svg>
      </div>
      <div className="bb-contact-glows" ref={glowRef} aria-hidden="true" />
    </>
  );
}