"use client";

import { useCallback, useState, type AnimationEvent } from "react";
import TactileWord from "./TactileWord";

/**
 * "Chiba Lab" - a mini easter egg. Keeps the shared tactile click
 * (press down, spring back), but its one-pass text animation is its
 * OWN thing - NOT the inference glow sweep: every completed click
 * pops the letters UP in a quick left->right cascade (each letter
 * rises 0.3em with a soft overshoot, ~40ms stagger), one pass,
 * then the word sits plain ink again. Clicks mid-cascade are
 * ignored; after it finishes the next click cascades again.
 * Reduced motion: just the click.
 */
const LETTERS = "Chiba Lab".split("");
const LAST = LETTERS.length - 1;

export default function ChibaWord() {
  const [run, setRun] = useState(0); // cascade run counter (0 = idle)

  const activate = useCallback(() => {
    setRun((r) => (r === 0 ? 1 : r)); // start one cascade cycle
  }, []);

  const done = useCallback(
    (e: AnimationEvent<HTMLSpanElement>, i: number) => {
      // only the LAST letter's own pop counts (ancestor animations
      // bubble animationend too and would cut the cascade short)
      if (e.animationName === "chiba-letter-pop" && i === LAST) setRun(0);
    },
    [],
  );

  return (
    <TactileWord label="Chiba Lab" onActivate={activate}>
      <span className="chiba-word">
        {LETTERS.map((c, i) => (
          <span
            key={i}
            className={`chiba-letter${run > 0 ? " run" : ""}`}
            style={{ animationDelay: `${i * 42}ms` }}
            onAnimationEnd={run > 0 ? (e) => done(e, i) : undefined}
          >
            {c === " " ? "\u00A0" : c}
          </span>
        ))}
      </span>
    </TactileWord>
  );
}