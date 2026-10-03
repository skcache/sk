"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useReducedMotion } from "motion/react";
import TactileWord from "./TactileWord";
import TridentMark from "./TridentMark";

const WIPE_DELAY = 1100; // after the page reveal settles

/**
 * THE ONE MASTER TIMELINE (normalized to 1000ms). Every piece of
 * the choreography - the navy text sweep, the staff formation, the
 * gold text sweep, the head formation, the hold beat, and the throw
 * - is driven from THIS single clock. No setTimeout handoff chains,
 * no per-widget timers; the frame clock crosses thresholds and the
 * classes flip once:
 *
 *   0.00  start (load paint / click)
 *   0.05  NAVY begins rising through the letters   + staff begins
 *   0.34  GOLD chases (navy nearly done)           + head begins
 *   0.66  gold completes, letters fully gold
 *   0.74  trident fully formed (all parts revealed)
 *   0.84  [click only] THROW begins - after a short readable beat
 *   1.00  master completes; letters have returned to ink
 *
 * LOAD: the paint timeline only - navy -> gold -> ink, once, no
 * trident. CLICK: the same paint timeline + the trident mounts at
 * t=0 (fully hidden, above the phrase) and its formation rides the
 * exact same pass thresholds, then it is thrown left -> right.
 *
 * The letters are LAYERED glyphs (the thinking lesson, vertical):
 * every character is a base ink glyph + a navy glyph + a gold glyph.
 * The navy layer is clip-hidden below the baseline and revealed
 * bottom -> top; the gold layer chases and reveals bottom -> top
 * OVER the navy. No background rewinds, no transition:none handoff -
 * a white seam is structurally impossible because the gold paints
 * over the navy.
 *
 * Reduced motion: no paint, instant ink; click still throws the
 * trident fast and horizontal.
 */
const LETTERS = "UC San Diego".split("");

const T = {
  NAVY: 50, //  0.05 - navy text sweep + staff formation begin
  GOLD: 340, //  0.34 - gold text sweep + head formation chase
  MELT: 700, //  0.70 - the letters wash back to ink
  THROW: 840, // 0.84 - the fully-formed trident is thrown
  END: 1000, //  1.00 - master completes
};

export default function UCSDWord() {
  const reduceMotion = useReducedMotion();
  const [pass, setPass] = useState(0); // 0 idle | 1 navy | 2 gold | 3 melt
  const [trident, setTrident] = useState<{
    origin: { x: number; y: number };
    thrown: boolean;
    run: number;
  } | null>(null);
  const wordRef = useRef<HTMLSpanElement>(null);
  const runningRef = useRef(false);
  const runRef = useRef(0);
  const guards = useRef<ReturnType<typeof setTimeout>[]>([]);

  const finish = useCallback(() => {
    runningRef.current = false;
    setPass(0);
    setTrident(null);
  }, []);

  // ONE replayable master clock. `withTrident` distinguishes the
  // load paint from the click (paint + trident + throw).
  const play = useCallback(
    (withTrident: boolean) => {
      if (runningRef.current) return; // an animation is running: ignore
      runningRef.current = true;
      const id = ++runRef.current;
      setPass(0);
      setTrident(null);

      if (withTrident) {
        const rect = wordRef.current?.getBoundingClientRect();
        if (!rect) return;
        // mounts IMMEDIATELY at timeline start, fully hidden
        setTrident({
          origin: { x: rect.left + rect.width / 2, y: rect.top - 32 },
          thrown: false,
          run: id,
        });
      }

      if (reduceMotion) {
        setPass(3); // instant ink
        if (withTrident) {
          const t = setTimeout(() => {
            setTrident((cur) => (cur && cur.run === id ? { ...cur, thrown: true } : cur));
          }, 120);
          guards.current.push(t);
        }
        const g = setTimeout(finish, 900);
        guards.current.push(g);
        return;
      }

      const t0 = performance.now();
      let last = -1;
      let raf = 0;
      const tick = (now: number) => {
        if (runRef.current !== id) return; // superseded
        const t = now - t0;
        if (t >= T.NAVY && last < 1) {
          setPass(1);
          last = 1;
        }
        if (t >= T.GOLD && last < 2) {
          setPass(2);
          last = 2;
        }
        if (t >= T.MELT && last < 3) {
          setPass(3);
          last = 3;
        }
        if (withTrident && t >= T.THROW && last < 4) {
          last = 4;
          setTrident((cur) => (cur && cur.run === id ? { ...cur, thrown: true } : cur));
        }
        if (t < T.END) {
          raf = requestAnimationFrame(tick);
        } else {
          finish();
        }
      };
      raf = requestAnimationFrame(tick);
      // ONE safety net (not a timeline): if rAF stalls (backgrounded
      // tab) the run still force-completes to clean ink.
      const guard = setTimeout(finish, T.END + 150);
      guards.current.push(guard);
    },
    [reduceMotion, finish]
  );

  // LOAD: the paint timeline runs once after the reveal settles.
  useEffect(() => {
    const t = setTimeout(() => play(false), WIPE_DELAY);
    return () => clearTimeout(t);
  }, [play]);

  // cleanup guards on unmount
  useEffect(() => {
    const g = guards.current;
    return () => g.forEach(clearTimeout);
  }, []);

  const activate = useCallback(() => {
    play(true);
  }, [play]);

  const endFlight = useCallback(() => {
    setTrident((cur) => (cur ? { ...cur, thrown: false } : cur));
    finish();
  }, [finish]);

  return (
    <TactileWord label="UC San Diego" onActivate={activate} className="whitespace-nowrap">
      <span className="word-anchor" ref={wordRef}>
        {/* layered glyphs: base ink + navy + gold, each character own
            its reveal (bottom -> top). The gold chases the navy over
            the same baseline - no gap is structurally possible. */}
        <span
          aria-hidden="true"
          className={`ucsd-word${pass >= 1 ? " pass-navy" : ""}${pass >= 2 ? " pass-gold" : ""}${pass >= 3 ? " pass-melt" : ""}`}
        >
          {LETTERS.map((c, i) =>
            c === " " ? (
              <span key={i} className="ucsd-gap">
                {"\u00A0"}
              </span>
            ) : (
              <span key={i} className="ucsd-glyph">
                <span className="base">{c}</span>
                <span className="navy">{c}</span>
                <span className="gold">{c}</span>
              </span>
            )
          )}
        </span>
        {trident && (
          <TridentBuild
            key={`run-${trident.run}`}
            origin={trident.origin}
            pass={pass}
            thrown={trident.thrown}
            fast={!!reduceMotion}
            onEnd={endFlight}
          />
        )}
      </span>
    </TactileWord>
  );
}

/**
 * The trident: mounted at timeline start (fully hidden), built by
 * the same pass classes the letters use (build-staff during the
 * navy pass, build-head during the gold pass - every part clipped
 * below the baseline, revealed bottom -> up), and once the master
 * timeline flips `thrown` it receives a FULLY FORMED trident and
 * only FLIES it: quick horizontal acceleration, a very subtle
 * droop, exit beyond the viewport right. It does NOT decide when
 * construction is complete - the master clock does.
 * Rendered via portal so the coordinates are viewport-true.
 */
function TridentBuild({
  origin,
  pass,
  thrown,
  fast,
  onEnd,
}: {
  origin: { x: number; y: number };
  pass: number;
  thrown: boolean;
  fast: boolean;
  onEnd: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const onEndRef = useRef(onEnd);
  useEffect(() => {
    onEndRef.current = onEnd;
  }, [onEnd]);

  // FLIGHT ONLY. The formation is already complete before this
  // runs: the master timeline decided `thrown`.
  useEffect(() => {
    if (!thrown) return;
    const el = ref.current;
    if (!el) return;
    const vw = window.innerWidth;
    const V0 = fast ? 2200 : 950; // px/s - decisive snap
    const A = fast ? 200 : 1500; // px/s^2 - quick acceleration
    const G = fast ? 160 : 300; // very subtle droop
    let raf = 0;
    const t0 = performance.now();
    const tick = (now: number) => {
      const s = (now - t0) / 1000;
      const x = origin.x + V0 * s + 0.5 * A * s * s;
      const y = origin.y + 0.5 * G * s * s;
      if (x > vw + 60) {
        onEndRef.current();
        return;
      }
      el.style.transform = `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px)`;
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [thrown, origin, fast]);

  return createPortal(
    <div className="ucsd-trident-wrap" aria-hidden="true">
      <div
        ref={ref}
        className={`ucsd-trident-fly${pass >= 1 ? " build-staff" : ""}${pass >= 2 ? " build-head" : ""}`}
        style={{ left: 0, top: 0 }}
      >
        <TridentMark height={28} />
      </div>
    </div>,
    document.body
  );
}