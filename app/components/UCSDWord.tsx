"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import TactileWord from "./TactileWord";

// One controlling window. ALL children normalize their keyframes to this
// duration; the parent unmounts everything together at the end, so no
// child can ever outlive the active state.
const SEQUENCE_MS = 760;
const HOLD_MS = 40;

const INK = "#f3f1ea"; // rest text, light on dark
const PAPER = "#f3f1ea"; // badge type on the navy plaque: stays light
const GOLD = "#c9a227";

// normalized phases inside the 760ms window
const SNAP = 0.16; // plaque snaps in: 0-122ms
const RULE = [0.16, 0.34] as const; // gold rule resolves: 122-258ms
const STROKE_START = 0.21; // trident first stroke: 160ms
const COLLAPSE = 0.86; // everything still until 654ms, then exits

/**
 * Object: "UC San Diego" briefly becomes a struck name badge.
 *
 * One parent window owns the whole sequence. The navy plaque is stamped
 * into place (hard 0.985 -> 1, no spring overshoot), type flips to
 * paper, the gold rule resolves, the trident's three strokes complete
 * well inside the window, everything holds, then the assembly collapses
 * and unmounts as one unit.
 */
function Trident({ run }: { run: number }) {
  const track = {
    duration: 0.12,
    ease: "easeOut" as const,
    times: [0, 0.3, 0.8, 1],
  };
  const strokes = [
    { d: "M7 13.5V5.5", delay: STROKE_START },
    { d: "M1.5 6h11", delay: STROKE_START + 0.06 },
    { d: "M4 6V2M10 6V2", delay: STROKE_START + 0.12 },
  ];
  return (
    <svg
      viewBox="0 0 14 14"
      className="block h-[9px] w-[9px]"
      fill="none"
      aria-hidden="true"
    >
      {strokes.map((s, i) => (
        <motion.path
          key={`${run}-${i}`}
          d={s.d}
          stroke={GOLD}
          strokeWidth={1.4}
          initial={{ pathLength: 0, opacity: 0 }}
          animate={{ pathLength: [0, 1, 1, 1], opacity: [0, 1, 1, 0] }}
          transition={{ ...track, delay: s.delay }}
        />
      ))}
    </svg>
  );
}

export default function UCSDWord() {
  const reduceMotion = useReducedMotion();
  const [run, setRun] = useState(0);
  const [active, setActive] = useState(false);
  const safety = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearSafety = useCallback(() => {
    if (safety.current) {
      clearTimeout(safety.current);
      safety.current = null;
    }
  }, []);

  const activate = useCallback(() => {
    clearSafety();
    setActive(true);
    setRun((r) => r + 1);
    // the ONLY unmount signal: every child lives inside this window
    safety.current = setTimeout(() => {
      setActive(false);
      safety.current = null;
    }, SEQUENCE_MS + HOLD_MS);
  }, [clearSafety]);

  useEffect(() => clearSafety, [clearSafety]);

  if (reduceMotion) {
    // Static: instant gold treatment with the rule, no assembly motion.
    return (
      <TactileWord
        label="UC San Diego"
        onActivate={activate}
        signature
        className="whitespace-nowrap"
      >
        <span className="word-anchor">
          <motion.span
            key={run}
            className="badge-type"
            animate={active ? { color: GOLD } : { color: INK }}
            transition={{ duration: 0.01 }}
          >
            UC San Diego
          </motion.span>
          {active && (
            <motion.span
              key={`rule-${run}`}
              aria-hidden="true"
              className="badge-rule"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.01 }}
            />
          )}
        </span>
      </TactileWord>
    );
  }

  return (
    <TactileWord
      label="UC San Diego"
      onActivate={activate}
      signature
      className="whitespace-nowrap"
    >
      <span className="word-anchor">
        {/* in-flow phrase; color flips to paper while the assembly lives */}
        <motion.span
          className="badge-type"
          animate={
            active ? { color: [INK, PAPER, PAPER, INK] } : { color: INK }
          }
          transition={
            active
              ? {
                  times: [0, SNAP, COLLAPSE, 1],
                  duration: SEQUENCE_MS / 1000,
                  ease: "easeOut",
                }
              : { duration: 0.01 }
          }
        >
          UC San Diego
        </motion.span>

        {active && (
          <span key={`assembly-${run}`} className="badge-assembly">
            {/* navy plaque: stamped in, held, collapsed: hard, no bounce */}
            <motion.span
              className="badge-plaque"
              aria-hidden="true"
              initial={{ opacity: 0, scale: 0.985 }}
              animate={{ opacity: [0, 1, 1, 0], scale: [0.985, 1, 1, 0.985] }}
              transition={{
                times: [0, SNAP, COLLAPSE, 1],
                duration: SEQUENCE_MS / 1000,
                ease: "easeOut",
              }}
            />

            {/* gold rule resolves after the stamp, exits with the parent */}
            <motion.span
              className="badge-rule"
              aria-hidden="true"
              initial={{ scaleX: 0, opacity: 0 }}
              animate={{ scaleX: [0, 0, 1, 1, 0], opacity: [0, 0, 1, 1, 0] }}
              transition={{
                times: [0, RULE[0], RULE[1], COLLAPSE, 1],
                duration: SEQUENCE_MS / 1000,
                ease: "easeOut",
              }}
            />

            {/* trident strokes finish by ~340ms, hold, collapse with parent */}
            <span className="badge-trident-wrap" aria-hidden="true">
              <Trident run={run} />
            </span>
          </span>
        )}
      </span>
    </TactileWord>
  );
}