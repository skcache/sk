"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

/**
 * The basketball egg, INTERACTIVE: a two-motion interaction.
 *
 * STATE 1 - DISPENSE: the basketball word is clicked. The ball
 * appears directly below the word's center and drops STRAIGHT DOWN
 * onto the divider line: one ease-in fall, one medium rebound
 * (apex 22), one tiny rebound (apex 7) - the existing in-ball glow +
 * squash fire at both impacts - then it settles and STAYS.
 *
 * STATE 2 - SETTLED: the ball becomes clickable; the word ignores
 * repeat clicks while the ball exists. Clicking the ball
 * acknowledges with the existing glow + a tiny tactile squash, then
 * launches the exit.
 *
 * STATE 3 - EXIT: three flicked rightward arcs (apexes 36 / 20 / 10,
 * ground impacts with glow + squash at the first two landings), the
 * final low arc leaves past the divider's right end mid-air, then
 * onDone. Continuous clockwise rotation (~2 turns), speed increasing
 * slightly through the exit.
 *
 * No particles, no ground dots, no trails, no fade. The divider rect
 * is measured directly in viewport coordinates and the fixed overlay
 * is portaled to body (fixed positioning silently becomes relative
 * under transformed ancestors).
 */
const FALL_MS = 380; // the straight drop (ease-in)
const REBOUND_1_APEX = 22; // medium rebound
const REBOUND_2_APEX = 7; // tiny rebound
const SETTLE_MS = 1000; // fully settled on the divider by ~1s
const EXIT_MS = 1400; // the flicked exit, ~1.4s
const EXIT_APEXES = [36, 20, 10]; // strong -> medium -> low arc
const SPANS = [0.3, 0.36, 0.46]; // arc distances, growing speed
const BALL = 28; // the svg ball size, px
const SQUASH_MS = 60; // brief contact squash window

type Phase = "dropping" | "settled" | "exiting";

export default function BasketballStage({ onDone }: { onDone: () => void }) {
  const ref = useRef<HTMLDivElement>(null); // outer: translate + squash
  const rotRef = useRef<HTMLDivElement>(null); // inner: rotation
  const sweepRef = useRef<HTMLSpanElement>(null); // clipped glow band
  const onDoneRef = useRef(onDone);
  const phaseRef = useRef<Phase>("dropping");
  const [phase, setPhase] = useState<Phase>("dropping");

  useEffect(() => {
    onDoneRef.current = onDone;
  }, [onDone]);

  useEffect(() => {
    const el = ref.current;
    const rot = rotRef.current;
    const sweep = sweepRef.current;
    if (!el || !rot || !sweep) return;

    // the WORD (dispense point) + the DIVIDER (the court), both in
    // viewport coordinates - the divider's top is the exact ground
    const word =
      document.querySelector<HTMLElement>('button[aria-label="basketball"]') ||
      ([...document.querySelectorAll("button")].find((b) => (b.textContent ?? "").trim() === "basketball") ??
        null);
    const wrect = word?.getBoundingClientRect();
    if (!wrect) return;
    const lr = document.querySelector<HTMLElement>("#things-done")?.getBoundingClientRect();
    if (!lr) return;
    const groundY = lr.top;
    const dividerRight = lr.right;

    // the dispense x: directly below the word's center
    const settleX = wrect.left + wrect.width / 2 - BALL / 2;
    const dropY0 = wrect.bottom + 2; // just below the word
    const dropDist = groundY - BALL - dropY0;
    // the exit run spans from the settle spot to just past the line
    const R = dividerRight + BALL / 2 - settleX;

    let raf = 0;
    let started = 0; // mount time (drop timeline)
    let exitT = 0; // ball-click time (exit timeline)
    let prevExitU = 0;
    let squash = 0; // contact squash countdown
    let ackSquash = 0; // click-acknowledgment squash countdown
    let dropped = 0; // drop impacts fired (2 max)
    let exitImpacts = 0; // exit impacts fired (2 max)
    let doneSent = false;

    const setPhaseBoth = (p: Phase) => {
      phaseRef.current = p;
      setPhase(p);
    };

    // one fast bottom->top light sweep inside the ball, clipped to the
    // circle - the SAME glow as before, untouched
    const sweepUp = () => {
      sweep.style.transition = "none";
      sweep.style.opacity = "1";
      sweep.style.transform = "translateY(104%)";
      void sweep.offsetHeight;
      sweep.style.transition = "transform 135ms ease-out, opacity 135ms ease-out";
      sweep.style.transform = "translateY(-104%)";
      el.style.filter = "drop-shadow(0 0 3px rgba(255, 150, 70, 0.55))";
      setTimeout(() => {
        el.style.filter = "none";
      }, 60);
      setTimeout(() => {
        sweep.style.opacity = "0";
        sweep.style.transform = "translateY(104%)";
      }, 150);
    };

    // THE CLICK: only meaningful once settled - acknowledge with the
    // existing glow + a tiny squash, then launch the exit
    el.onclick = () => {
      if (phaseRef.current !== "settled") return;
      sweepUp();
      ackSquash = SQUASH_MS;
      exitT = performance.now();
      prevExitU = 0;
      exitImpacts = 0;
      setPhaseBoth("exiting");
      el.style.pointerEvents = "none";
      el.style.cursor = "default";
    };

    const tick = (now: number) => {
      if (!started) started = now;
      const t = now - started;
      const p = phaseRef.current;
      let x = settleX;
      let y = groundY - BALL;
      let deg = 0;

      if (p === "dropping") {
        // ---- STATE 1: the dispense - ease-in falls, ease-out rises
        if (t < FALL_MS) {
          const u = t / FALL_MS;
          y = dropY0 + dropDist * u * u; // ease-IN fall
        } else if (t < FALL_MS + 190) {
          if (dropped === 0) {
            dropped = 1;
            squash = SQUASH_MS;
            sweepUp(); // FIRST ground impact
          }
          const u = (t - FALL_MS) / 190;
          y = groundY - BALL - REBOUND_1_APEX * (1 - (1 - u) * (1 - u)); // ease-OUT rise
        } else if (t < FALL_MS + 380) {
          const u = (t - FALL_MS - 190) / 190;
          y = groundY - BALL - REBOUND_1_APEX * (1 - u) * (1 - u); // ease-IN fall
        } else if (t < FALL_MS + 500) {
          if (dropped === 1) {
            dropped = 2;
            squash = SQUASH_MS;
            sweepUp(); // SECOND (tiny) impact
          }
          const u = (t - FALL_MS - 380) / 120;
          y = groundY - BALL - REBOUND_2_APEX * (1 - (1 - u) * (1 - u)); // ease-OUT rise
        } else if (t < SETTLE_MS) {
          const u = (t - FALL_MS - 500) / 120;
          y = groundY - BALL - REBOUND_2_APEX * (1 - u) * (1 - u); // ease-IN fall to rest
        } else {
          y = groundY - BALL;
          if (phaseRef.current === "dropping") {
            // ---- STATE 2: settled - the ball STAYS and waits
            setPhaseBoth("settled");
            el.style.pointerEvents = "auto";
            el.style.cursor = "pointer";
          }
        }
      } else if (p === "settled") {
        y = groundY - BALL; // the ball rests on the divider
      } else {
        // ---- STATE 3: the flicked exit - three arcs, growing speed,
        // continuous clockwise rotation (~2 turns)
        const u = Math.min(1, (now - exitT) / EXIT_MS);
        if (prevExitU < 0.3 && u >= 0.3 && exitImpacts === 0) {
          exitImpacts = 1;
          squash = SQUASH_MS;
          sweepUp();
        }
        if (prevExitU < 0.66 && u >= 0.66 && exitImpacts === 1) {
          exitImpacts = 2;
          squash = SQUASH_MS;
          sweepUp();
        }
        prevExitU = u;
        const arc = u < 0.3 ? 0 : u < 0.66 ? 1 : 2;
        const arcStart = arc === 0 ? 0 : arc === 1 ? SPANS[0] : SPANS[0] + SPANS[1];
        const s = Math.max(0, Math.min(1, (u - arcStart) / SPANS[arc]));
        const height = 4 * EXIT_APEXES[arc] * s * (1 - s);
        x = settleX + u * R;
        y = groundY - BALL - height;
        deg = 720 * u; // two full forward turns across the exit
        if (x >= dividerRight + BALL / 2) {
          // the final low arc leaves mid-air, past the line's right end
          rot.style.transform = `rotate(${deg}deg)`;
          el.style.transform = `translate(${x}px, ${y}px) scale(1, 1)`;
          if (!doneSent) {
            doneSent = true;
            setTimeout(() => onDoneRef.current(), 120);
          }
          return;
        }
      }

      rot.style.transform = `rotate(${deg}deg)`;
      if (ackSquash > 0) {
        // the click acknowledgment: a tiny 1.05/0.94 squeeze
        ackSquash -= 16;
        const d = Math.sin(Math.PI * (1 - Math.max(0, ackSquash) / SQUASH_MS));
        el.style.transform = `translate(${x}px, ${y}px) scale(${1 + 0.05 * d}, ${1 - 0.06 * d})`;
      } else if (squash > 0) {
        // the ground-impact squash: 1.08 / 0.88, ~60ms
        squash -= 16;
        const d = Math.sin(Math.PI * (1 - Math.max(0, squash) / SQUASH_MS));
        el.style.transform = `translate(${x}px, ${y}px) scale(${1 + 0.08 * d}, ${1 - 0.12 * d})`;
      } else {
        el.style.transform = `translate(${x}px, ${y}px) scale(1, 1)`;
      }
      raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  const overlay = (
    <div className="bb-overlay" aria-hidden="true">
      {/* OUTER: translate + squash only */}
      <div
        className="stage-basketball"
        ref={ref}
        style={{
          pointerEvents: phase === "settled" ? "auto" : "none",
          cursor: phase === "settled" ? "pointer" : "default",
        }}
      >
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

  // the fixed overlay must live OUTSIDE any transformed ancestor, or
  // "fixed" silently becomes relative to the stage - portal to body.
  // This component only spawns client-side (the stage opens on a
  // click), so document.body is always available.
  return createPortal(overlay, document.body);
}