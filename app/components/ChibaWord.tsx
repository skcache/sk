"use client";

import { useCallback, useState, type AnimationEvent } from "react";
import TactileWord from "./TactileWord";

/**
 * "Chiba Lab" - a mini easter egg. The word keeps the shared tactile
 * click (press down, spring back), and every completed click runs a
 * ONE-TIME light sweep left -> right across the text: a bright band
 * passes over the letters once (~0.85s) and the word returns to
 * plain ink. Clicks during the sweep are ignored; after it finishes
 * the next click can sweep again. Reduced motion: just the click.
 *
 * The sweep is a clipped-text gradient overlay (same proven recipe as
 * the thinking glow, but with `forwards` - exactly one pass).
 */
export default function ChibaWord() {
  const [run, setRun] = useState(0); // sweep run counter (0 = idle)

  const activate = useCallback(() => {
    setRun((r) => (r === 0 ? 1 : r)); // start one sweep cycle
  }, []);

  const done = useCallback((e: AnimationEvent<HTMLSpanElement>) => {
    // only the sweep's own animation counts (ancestor animations
    // bubble animationend too and would cut the sweep short)
    if (e.animationName === "chiba-sweep-once") setRun(0);
  }, []);

  return (
    <TactileWord label="Chiba Lab" onActivate={activate}>
      <span className="chiba-word">
        <span
          className={`chiba-sweep${run > 0 ? " run" : ""}`}
          data-chiba="Chiba Lab"
          onAnimationEnd={run > 0 ? done : undefined}
        >
          Chiba Lab
        </span>
      </span>
    </TactileWord>
  );
}