"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

/**
 * The basketball egg, MOTION-QUALITY PASS: deterministic, refresh-rate
 * independent, one mathematical story per motion.
 *
 * DISPENSE (word click): the ball appears below the word's center and
 * falls ~420ms (ease-in) to the divider; then THREE rebounds, each ONE
 * full parabola h = 4*H*s*(1-s) (ground -> smooth apex -> ground, no
 * stitched rise/fall easing): 24px/380ms, 12px/260ms, 5px/180ms.
 * The existing in-ball glow + squash fire at the fall landing and the
 * first two rebound landings; the third rebound settles quietly.
 * The ball then rests EXACTLY on the divider and STAYS (clickable).
 *
 * DISPATCH (ball click): the existing glow fires once as the
 * acknowledgment + a tiny 1.05/0.94 squash, and the exit begins while
 * the acknowledgment is still finishing.
 *
 * EXIT: a REALISTIC bounce chain - the number of full parabolas
 * scales with the screen real estate (2 on mobile, 4 on a laptop, up
 * to 7 on a wide desktop), each 30px apex at a constant horizontal
 * pace (360ms/arc) with a landing glow, then ONE rise-only arc
 * carries the ball off the screen mid-air at FULL scale. No
 * shrink-out, no fade, no static frame, no frozen rotation - the
 * ball simply bounces its way off. Leaves fully past the screen edge
 * and only then calls onDone.
 *
 * All squash/ack envelopes are driven by REAL elapsed time (no
 * per-frame decrements), so 60Hz and 120Hz displays look identical.
 */
const FALL_MS = 420; // the straight drop (ease-in)
const REBOUNDS = [
  { apex: 24, dur: 380 }, // rebound 1
  { apex: 12, dur: 260 }, // rebound 2
  { apex: 5, dur: 180 }, // rebound 3
] as const;
const SETTLE_MS = FALL_MS + REBOUNDS[0].dur + REBOUNDS[1].dur + REBOUNDS[2].dur; // 1240
// the flicked exit: the bounce COUNT scales with the screen real estate
// (mobile 2, laptop 4, wide desktop 6-7) - a realistic chain of full
// parabolas at a constant horizontal pace, plus one rise-only arc that
// carries the ball off the screen mid-air at FULL scale. No shrink-out.
const EXIT_ARC_MS = 360; // fixed per-arc duration (constant speed)
const EXIT_APEX = 30; // uniform bounce apex, px
const EXIT_FINAL_APEX = 55; // the last arc's rise, px (leaves mid-air)
const EXIT_PX_PER_BOUNCE = 150; // screen distance per realistic bounce
const EXIT_MIN_BOUNCES = 2;
const EXIT_MAX_BOUNCES = 7;
const SPIN_PER_ARC = 120; // degrees of rotation per arc (constant feel)
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
    // the exit run spans from the settle spot to fully past the SCREEN
    // edge; the bounce count derives from the available runway, so
    // mobile/desktop/laptop show different numbers of realistic bounces
    const exitDist = Math.max(0, dividerRight - settleX);
    const bounceCount = Math.min(
      EXIT_MAX_BOUNCES,
      Math.max(EXIT_MIN_BOUNCES, Math.round(exitDist / EXIT_PX_PER_BOUNCE))
    );
    const screenRight = Math.max(dividerRight, window.innerWidth);
    const exitTravel = screenRight + BALL / 2 - settleX;
    const nArcs = bounceCount + 1; // b landings + the final exit arc
    const arcDX = exitTravel / nArcs;

    let raf = 0;
    let started = 0; // mount time (drop timeline)
    let exitT = 0; // ball-click time (exit timeline)
    let prevArc = 0; // the exit arc index, for landing detection
    let squashStart = 0; // the timestamp the impact squash began (ms)
    let ackStart = 0; // the timestamp the acknowledgment began (ms)
    let dropImpacts = 0; // drop impacts fired (3 max: fall + 2 landings)
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

    const impact = (now: number) => {
      squashStart = now;
      sweepUp();
    };

    // THE CLICK: only meaningful once settled - acknowledge with the
    // existing glow + a tiny squash, then launch the exit immediately
    el.onclick = () => {
      if (phaseRef.current !== "settled") return;
      sweepUp();
      ackStart = performance.now();
      exitT = ackStart;
      prevArc = 0;
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
        // ---- STATE 1: the dispense - ease-in fall, then single full
        // parabolas for every rebound (one continuous curve each)
        if (t < FALL_MS) {
          const u = t / FALL_MS;
          y = dropY0 + dropDist * u * u; // ease-IN fall
        } else if (t < FALL_MS + REBOUNDS[0].dur) {
          if (dropImpacts === 0) {
            dropImpacts = 1;
            impact(now); // FIRST ground impact
          }
          const s = (t - FALL_MS) / REBOUNDS[0].dur;
          y = groundY - BALL - 4 * REBOUNDS[0].apex * s * (1 - s);
        } else if (t < FALL_MS + REBOUNDS[0].dur + REBOUNDS[1].dur) {
          if (dropImpacts === 1) {
            dropImpacts = 2;
            impact(now); // SECOND impact
          }
          const s = (t - FALL_MS - REBOUNDS[0].dur) / REBOUNDS[1].dur;
          y = groundY - BALL - 4 * REBOUNDS[1].apex * s * (1 - s);
        } else if (t < SETTLE_MS) {
          if (dropImpacts === 2) {
            dropImpacts = 3;
            impact(now); // THIRD impact
          }
          const s = (t - FALL_MS - REBOUNDS[0].dur - REBOUNDS[1].dur) / REBOUNDS[2].dur;
          y = groundY - BALL - 4 * REBOUNDS[2].apex * s * (1 - s);
        } else {
          y = groundY - BALL;
          if (phaseRef.current === "dropping") {
            // ---- STATE 2: settled - the ball rests EXACTLY on the
            // divider, perfectly still, and waits for the click
            setPhaseBoth("settled");
            el.style.pointerEvents = "auto";
            el.style.cursor = "pointer";
          }
        }
      } else if (p === "settled") {
        y = groundY - BALL; // the ball rests on the divider
      } else {
        // ---- STATE 3: the flicked exit - a REALISTIC bounce chain.
        // The number of full parabolas scales with the runway between
        // the settle spot and the screen edge (2 on mobile, 4 on a
        // laptop, up to 7 on a wide desktop), every arc at the same
        // horizontal pace with a landing impact, then ONE rise-only
        // arc carries the ball OFF the screen mid-air at FULL scale -
        // no shrinking into nothing, no fading, no static frame.
        const u = Math.min(1, (now - exitT) / (nArcs * EXIT_ARC_MS));
        x = settleX + u * exitTravel;
        const arc = Math.min(nArcs - 1, Math.floor((x - settleX) / arcDX));
        const s = (x - settleX - arc * arcDX) / arcDX;
        const h = arc < bounceCount ? 4 * EXIT_APEX * s * (1 - s) : EXIT_FINAL_APEX * (2 * s - s * s);
        y = groundY - BALL - h;
        deg = SPIN_PER_ARC * (arc + s); // continuous rotation, never frozen
        if (arc > prevArc) {
          prevArc = arc;
          impact(now); // every landing in the chain fires the glow
        }
        if (x >= screenRight + BALL / 2) {
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
      // the squash envelopes run off REAL elapsed time - identical on
      // 60Hz and 120Hz displays
      const squashElapsed = now - squashStart;
      const ackElapsed = now - ackStart;
      if (ackElapsed < SQUASH_MS) {
        const d = Math.sin(Math.PI * (1 - ackElapsed / SQUASH_MS));
        el.style.transform = `translate(${x}px, ${y}px) scale(${1 + 0.05 * d}, ${1 - 0.06 * d})`;
      } else if (squashElapsed < SQUASH_MS) {
        const d = Math.sin(Math.PI * (1 - squashElapsed / SQUASH_MS));
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