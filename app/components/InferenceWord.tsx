"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import { ThinkingOrb, type OrbState } from "thinking-orbs";
import TactileWord from "./TactileWord";

const THINK_MS = 2500; // the word visibly thinks, then returns

// randomized reasoning states: a fresh orb picks one per activation
const INFER_ORB_STATES: OrbState[] = ["solving", "working", "searching", "weaving", "composing", "breathing"];
const pickOrbState = (): OrbState => INFER_ORB_STATES[Math.floor(Math.random() * INFER_ORB_STATES.length)];

/**
 * Signature interaction: "inference" becomes a tiny thinking process.
 *
 * hard press -> the word becomes ONE inline status unit: a single
 * lowercase `thinking` word with a soft light glow sweeping left ->
 * right across the letters, plus a crisp 24px reasoning orb with a
 * 3px gap beside it. The text crossfades in place - a symmetric
 * 0.18s base-out + 0.18s unit-in crossing so there is no empty
 * window during the open - while the cell springs open, CLIPPING
 * the orb so it is revealed smoothly from behind the word's edge;
 * the orb works for ~2.5s, then the unit retracts (orb clipped
 * away) over 0.2s easeIn and the word returns.
 *
 * The glow is a fixed CSS sweep and the orb picks a randomized
 * reasoning state per accepted activation, so every run replays the
 * same choreography with a fresh orb; activation is IGNORED while
 * already thinking (no timeout reset, no partial restart). The next
 * click after idle runs the identical sequence.
 *
 * Layout: no permanent reservation. Two invisible probes measure the
 * real widths of "inference" and "Thinking + orb"; a Motion spring
 * animates the live cell between those widths only while active, so
 * at rest the button is exactly word-sized (no dead gap, no oversized
 * focus ring) and the surrounding prose shifts smoothly by only a few
 * pixels during the deliberate interaction. The cell clips its
 * content, so the orb can structurally never overlap "systems".
 *
 * Reduced motion: instant static swap "inference"/"Thinking" + a
 * frozen orb for the hold, no morph travel.
 */
export default function InferenceWord() {
  const reduceMotion = useReducedMotion();
  const [phase, setPhase] = useState<"idle" | "thinking">("idle");
  const [orbState, setOrbState] = useState<OrbState>("solving");
  const safety = useRef<ReturnType<typeof setTimeout>[]>([]);

  const [widths, setWidths] = useState<{ idle: number; active: number } | null>(null);
  const idleProbe = useRef<HTMLSpanElement>(null);
  const activeProbe = useRef<HTMLSpanElement>(null);

  // measure before first paint so there is never a max-content flash
  useLayoutEffect(() => {
    let mounted = true;
    const measure = () => {
      if (mounted && idleProbe.current && activeProbe.current) {
        setWidths({
          idle: idleProbe.current.offsetWidth,
          active: activeProbe.current.offsetWidth,
        });
      }
    };
    measure();
    document.fonts.ready.then(measure).catch(() => {});
    const ro = new ResizeObserver(measure);
    if (idleProbe.current) ro.observe(idleProbe.current);
    if (activeProbe.current) ro.observe(activeProbe.current);
    return () => {
      mounted = false;
      ro.disconnect();
    };
  }, []);

  const clearSafety = useCallback(() => {
    safety.current.forEach(clearTimeout);
    safety.current = [];
  }, []);

  const activate = useCallback(() => {
    // ignore activations while already thinking - no timeout reset,
    // no partial restart; the next click replays the full run
    if (phase === "thinking") return;
    clearSafety();
    setOrbState(pickOrbState()); // randomized reasoning state per run
    setPhase("thinking");
    safety.current = [
      setTimeout(() => {
        setPhase("idle");
        safety.current = [];
      }, THINK_MS),
    ];
  }, [phase, clearSafety]);

  useEffect(() => clearSafety, [clearSafety]);

  // WAAPI crossfade (frame-accurate swap for base/active). The
  // declarative opacity transitions snap in this motion version
  // (initial={false} drops plain-value transitions - verified
  // frame-by-frame: zero intermediate opacities).
  const cellRef = useRef<HTMLSpanElement>(null);
  // the crossfade animations WE own - cancel only these on phase
  // change. NEVER call getAnimations(cancel) over the subtree: it
  // would kill the letters' traveling wave (the .tw CSS animations)
  // and the orb - freezing the glow mid-dim forever.
  const fadeAnims = useRef<Animation[]>([]);
  useEffect(() => {
    const cell = cellRef.current;
    if (!cell) return;
    // READ current states BEFORE cancelling: the previous phase's
    // fill:forwards animations are still holding (base 0 / active 1
    // during thinking). cancel() drops the fill, so reading after
    // would snap back to the CSS baseline (base 1 / active 0) and
    // the retract would render as an instant cut.
    const baseEl = cell.querySelector<HTMLElement>(".word-morph-base");
    const activeEl = cell.querySelector<HTMLElement>(".word-morph-active");
    const baseFrom = baseEl ? parseFloat(getComputedStyle(baseEl).opacity) : 1;
    const actFrom = activeEl ? parseFloat(getComputedStyle(activeEl).opacity) : 0;
    fadeAnims.current.forEach((a) => a.cancel());
    fadeAnims.current = [];
    const thinking = phase === "thinking";
    if (reduceMotion) {
      if (baseEl) baseEl.style.opacity = thinking ? "0" : "1";
      if (activeEl) activeEl.style.opacity = thinking ? "1" : "0";
      return;
    }
    // symmetric crossfade: both words present mid-swap (no empty
    // window). fill: BOTH so the from-state holds during the delay -
    // with forwards, the phase flip would flash the CSS baseline
    // (base visibly pops full -> then re-fades = the retract jitter)
    if (baseEl) {
      fadeAnims.current.push(
        baseEl.animate([{ opacity: baseFrom }, { opacity: thinking ? 0 : 1 }], {
          duration: thinking ? 180 : 240,
          delay: thinking ? 0 : 40,
          easing: "ease-out",
          fill: "both",
        }),
      );
    }
    if (activeEl) {
      fadeAnims.current.push(
        activeEl.animate([{ opacity: actFrom }, { opacity: thinking ? 1 : 0 }], {
          duration: thinking ? 180 : 200,
          easing: thinking ? "ease-out" : "ease-in",
          fill: "both",
        }),
      );
    }
    // NOTE: the wave is NOT touched - the letters carry their own
    // staggered traveling-light animation (native, per-glyph)
  }, [phase, reduceMotion]);

  // width spring: deliberate, near-critical, no bounce. On the
  // RETRACT the spring waits for the crossfade to finish (mirror of
  // the open) - shrinking while the unit is fully visible would cut
  // the orb mid-fade and read as jitter
  const widthT = reduceMotion
    ? { duration: 0.01 }
    : phase === "thinking"
      ? { type: "spring" as const, stiffness: 480, damping: 40, mass: 0.85 }
      : {
          type: "spring" as const,
          stiffness: 480,
          damping: 40,
          mass: 0.85,
          delay: 0.16,
        };

  return (
    <TactileWord label="inference" onActivate={activate} className="word-morph-btn">
      <span className="word-morph">
        {/* measurement probes: absolute, invisible, zero layout weight.
            the flex probe mirrors the live unit incl. the 3px gap */}
        <span ref={idleProbe} className="word-morph-probe" aria-hidden="true">
          inference
        </span>
        <span
          ref={activeProbe}
          className="word-morph-probe word-morph-probe-flex"
          aria-hidden="true"
        >
          <span>thinking</span>
          <span className="orb-24" aria-hidden="true">
            <ThinkingOrb
              state="solving"
              size={32}
              theme="dark"
              paused={!!reduceMotion}
            />
          </span>
        </span>

        {/* the live cell: width springs between the two measured widths,
            clipped so the orb is revealed/retracted by the growing box.
            pre-measure it renders as a plain word-sized cell (no flash) */}
        {widths ? (
          <motion.span
            ref={cellRef}
            className="word-morph-cell"
            initial={false}
            animate={{
              width: phase === "thinking" ? widths.active : widths.idle,
            }}
            transition={widthT}
          >
            {/* idle word: opacity driven by the WAAPI crossfade (see
                the phase effect above - declarative transitions snap
                in this motion version) */}
            <span className="word-morph-base">inference</span>

            {/* thinking unit: crossfades in as the cell opens; the orb
                is progressively revealed by the clip until the unit
                fits. randomized reasoning orb per run */}
            <span
              className="word-morph-active"
              aria-hidden={phase === "thinking" ? undefined : true}
            >
              <span className="thinking-word" aria-hidden="true">
                {"thinking".split("").map((c, i) => (
                  <span
                    key={i}
                    className="tw"
                    style={
                      // coherent LTR wave: SAME cycle length for every
                      // letter, pure ascending stagger (i * 70ms). Any
                      // per-letter duration variance breaks phase
                      // coherence - the crest starts jumping around
                      // the word instead of sweeping left to right.
                      { animationDelay: `${i * 70}ms` }
                    }
                  >
                    {c}
                  </span>
                ))}
              </span>
              <span className="orb-24">
                <ThinkingOrb
                  state={orbState}
                  size={32}
                  theme="dark"
                  paused={!!reduceMotion}
                />
              </span>
            </span>
          </motion.span>
        ) : (
          <span className="word-morph-cell">
            <span className="word-morph-base">inference</span>
          </span>
        )}
        <span className="sr-only">{phase === "thinking" ? "thinking" : "inference"}</span>
      </span>
    </TactileWord>
  );
}