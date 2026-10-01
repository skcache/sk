"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import TactileWord from "./TactileWord";

// One controlling window; every child normalizes to this duration and
// the parent unmounts everything together at the end.
const SEQUENCE_MS = 720;
const HOLD_MS = 40;

const INK = "#f3f1ea";
const GOLD = "#c9a227";

// normalized phases inside the 720ms window
const SNAP = 0.17; // identity on: 0-122ms
const RULE = [0.17, 0.36] as const; // gold rule resolves: 122-260ms
const STROKE_START = 0.22; // trident first stroke: ~160ms
const COLLAPSE = 0.88; // holds until ~630ms, then exits

/**
 * LOCAL UCSD identity response. No plaque, no box: on release the
 * phrase itself flips to gold, a 1px gold rule draws under it, and a
 * tiny trident stamps in at the phrase's end. All marks live inside
 * the word's own box, layout untouched, then everything collapses.
 */
function Trident({ run }: { run: number }) {
  const track = {
    duration: 0.1,
    ease: "easeOut" as const,
    times: [0, 0.35, 0.85, 1],
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
    // the ONLY unmount signal; every child lives inside this window
    safety.current = setTimeout(() => {
      setActive(false);
      safety.current = null;
    }, SEQUENCE_MS + HOLD_MS);
  }, [clearSafety]);

  useEffect(() => clearSafety, [clearSafety]);

  if (reduceMotion) {
    // Static: instant gold identity (text + rule), no assembly motion.
    return (
      <TactileWord label="UC San Diego" onActivate={activate} className="whitespace-nowrap">
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
    <TactileWord label="UC San Diego" onActivate={activate} className="whitespace-nowrap">
      <span className="word-anchor">
        {/* the phrase itself becomes the identity; no box around it */}
        <motion.span
          className="badge-type"
          animate={active ? { color: [INK, GOLD, GOLD, INK] } : { color: INK }}
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
          <span key={`identity-${run}`} className="badge-identity">
            {/* gold rule resolves after the identity lands */}
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

            {/* tiny trident stamps in, finishes well inside the window */}
            <span className="badge-trident-wrap" aria-hidden="true">
              <Trident run={run} />
            </span>
          </span>
        )}
      </span>
    </TactileWord>
  );
}