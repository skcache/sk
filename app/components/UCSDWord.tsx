"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import TactileWord from "./TactileWord";

const SEQUENCE_MS = 680;

/**
 * Object: "UC San Diego" briefly becomes a miniature, deliberately
 * composed identity treatment - a navy plaque assembles behind the
 * phrase, the type flips to paper, a gold rule enters from the left, a
 * tiny geometric trident pops at the end, then everything collapses
 * exactly back into ordinary text. No rainbow cycling, no logo misuse.
 */
function Trident() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-3 w-3"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M12 21V12M5.5 12h13M7.5 12V6.5M12 12V4.5M16.5 12V6.5"
        stroke="#ffcd00"
        strokeWidth="1.9"
        strokeLinecap="round"
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
    // Static: instant navy type + gold rule, no assembly motion.
    return (
      <TactileWord label="UC San Diego" onActivate={activate} className="whitespace-nowrap">
        <span className="relative inline-block">
          <motion.span
            key={run}
            className="relative z-10"
            animate={active ? { color: "#182b49" } : { color: "#26221c" }}
            transition={{ duration: 0.01 }}
          >
            UC San Diego
          </motion.span>
          {active && (
            <motion.span
              key={`rule-${run}`}
              aria-hidden="true"
              className="absolute -bottom-0.5 left-0 h-[2px] w-full bg-[#c69214]"
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
      <span className="relative inline-block whitespace-nowrap">
        {/* ordinary text on top of the plaque layer */}
        <motion.span
          className="relative z-10"
          animate={
            active
              ? { color: ["#26221c", "#f7f5ef", "#f7f5ef", "#26221c"] }
              : { color: "#26221c" }
          }
          transition={
            active
              ? {
                  times: [0, 0.18, 0.72, 1],
                  duration: 0.62,
                  ease: "easeOut",
                }
              : { duration: 0.01 }
          }
        >
          UC San Diego
        </motion.span>

        {active && (
          <>
            {/* navy plaque assembles behind the phrase */}
            <motion.span
              key={`plaque-${run}`}
              aria-hidden="true"
              className="absolute -inset-[3px] z-0 rounded-[3px] bg-[#182b49]"
              initial={{ scale: 0.94, opacity: 0 }}
              animate={{
                scale: [0.94, 1, 1, 0.96],
                opacity: [0, 1, 1, 0],
              }}
              transition={{
                times: [0, 0.18, 0.72, 1],
                duration: 0.62,
                ease: "easeOut",
              }}
            />
            {/* gold rule enters from the left */}
            <motion.span
              key={`rule-${run}`}
              aria-hidden="true"
              className="absolute bottom-[1px] left-[3px] z-10 h-[2px] w-[72%] rounded-full bg-[#c69214]"
              initial={{ x: -14, opacity: 0 }}
              animate={{ x: 0, opacity: [0, 1, 1, 0] }}
              transition={{
                times: [0, 0.2, 0.72, 1],
                duration: 0.56,
                delay: 0.08,
                ease: "easeOut",
              }}
            />
            {/* tiny trident pops at the right end */}
            <motion.span
              key={`tri-${run}`}
              aria-hidden="true"
              className="absolute right-[3px] top-1/2 z-10 -translate-y-1/2"
              initial={{ scale: 0.4, opacity: 0 }}
              animate={{ scale: [0.4, 1, 1, 0.8], opacity: [0, 1, 1, 0] }}
              transition={{
                times: [0, 0.22, 0.72, 1],
                duration: 0.55,
                delay: 0.12,
                ease: "easeOut",
              }}
            >
              <Trident />
            </motion.span>
          </>
        )}
      </span>
    </TactileWord>
  );
}