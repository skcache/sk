"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import TactileWord from "./TactileWord";

const SEQUENCE_MS = 820;

const INK = "#26221c";
const PAPER = "#f7f5ef";
const NAVY = "#182b49";
const GOLD = "#c9a227";

/**
 * Object: "UC San Diego" briefly becomes a die-struck name badge.
 *
 * A navy plaque slams in behind the phrase (one-frame stamp overshoot),
 * the type flips to paper, a gold rule draws along the bottom edge
 * with scaleX, a tiny geometric trident rises from the rule in three
 * quick strokes, holds like struck metal, then collapses cleanly back
 * to plain text. The plaque stays flush to the word box: it never
 * touches the period that follows the phrase.
 */
function Trident() {
  const track = {
    duration: 0.78,
    ease: "linear" as const,
    times: [0, 0.2, 0.9, 1],
  };
  return (
    <svg
      viewBox="0 0 14 14"
      className="block h-[9px] w-[9px]"
      fill="none"
      aria-hidden="true"
    >
      <motion.path
        d="M7 13.5V5.5"
        stroke={GOLD}
        strokeWidth={1.4}
        initial={{ pathLength: 0, opacity: 0 }}
        animate={{ pathLength: [0, 1, 1, 1], opacity: [0, 1, 1, 0] }}
        transition={{ ...track, delay: 0.16 }}
      />
      <motion.path
        d="M1.5 6h11"
        stroke={GOLD}
        strokeWidth={1.4}
        initial={{ pathLength: 0, opacity: 0 }}
        animate={{ pathLength: [0, 1, 1, 1], opacity: [0, 1, 1, 0] }}
        transition={{ ...track, delay: 0.23 }}
      />
      <motion.path
        d="M4 6V2M10 6V2"
        stroke={GOLD}
        strokeWidth={1.4}
        initial={{ pathLength: 0, opacity: 0 }}
        animate={{ pathLength: [0, 1, 1, 1], opacity: [0, 1, 1, 0] }}
        transition={{ ...track, delay: 0.3 }}
      />
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
    safety.current = setTimeout(() => {
      setActive(false);
      safety.current = null;
    }, SEQUENCE_MS + 250);
  }, [clearSafety]);

  useEffect(() => clearSafety, [clearSafety]);

  if (reduceMotion) {
    // Static: instant navy type with a gold rule, no assembly motion.
    return (
      <TactileWord label="UC San Diego" onActivate={activate} className="whitespace-nowrap">
        <span className="word-anchor">
          <motion.span
            key={run}
            className="badge-type"
            animate={active ? { color: NAVY } : { color: INK }}
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
      className="whitespace-nowrap"
    >
      <span className="word-anchor">
        {/* in-flow phrase; color flips to paper on the plaque */}
        <motion.span
          className="badge-type"
          animate={
            active ? { color: [INK, PAPER, PAPER, INK] } : { color: INK }
          }
          transition={
            active
              ? { times: [0, 0.06, 0.87, 1], duration: 0.78, ease: "easeOut" }
              : { duration: 0.01 }
          }
        >
          UC San Diego
        </motion.span>

        {active && (
          <>
            {/* navy plaque: die stamp with a one-frame overshoot */}
            <motion.span
              key={`plaque-${run}`}
              className="badge-plaque"
              aria-hidden="true"
              initial={{ opacity: 0, scale: 0.97 }}
              animate={{
                opacity: [0, 1, 1, 1, 1, 0],
                scale: [0.97, 1.012, 1, 1, 1, 0.988],
              }}
              transition={{
                times: [0, 0.015, 0.04, 0.87, 0.94, 1],
                duration: 0.78,
                ease: "easeOut",
              }}
              onAnimationComplete={() => setActive(false)}
            />

            {/* gold rule draws with scaleX from the left */}
            <motion.span
              key={`rule-${run}`}
              className="badge-rule"
              aria-hidden="true"
              initial={{ scaleX: 0, opacity: 0 }}
              animate={{ scaleX: [0, 1, 1, 1], opacity: [0, 1, 1, 0] }}
              transition={{
                times: [0, 0.25, 0.87, 1],
                duration: 0.78,
                delay: 0.05,
                ease: "easeOut",
              }}
            />

            {/* trident rises from the rule in three quick strokes */}
            <span className="badge-trident-wrap" aria-hidden="true">
              <Trident />
            </span>
          </>
        )}
      </span>
    </TactileWord>
  );
}