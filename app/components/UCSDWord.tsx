"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useReducedMotion } from "motion/react";
import TactileWord from "./TactileWord";
import TridentMark from "./TridentMark";

const WIPE_DELAY = 1000; // after the page reveal settles

/* The paint choreography is ONE CSS animation owned by the overlays
   (see globals.css: ucsd-navy-rise / ucsd-gold-rise / the trident's
   staff/head rises). React only says RUN STARTED (adds the `run`
   class with the duration as --ucsd-run-ms) and RUN FINISHED
   (removes it). The same fractions drive the word AND the trident,
   so formation can never drift from the paint.

   TEMPO: the first load is a fast ~500ms hint (navy ~150ms rise,
   gold chases at ~140ms, quick fade), the click is ~950ms so the
   trident's formation reads. The click adds the trident: the staff
   reveals during the navy window, the head during the gold window,
   then ~90ms of hold and the throw. The finish reset is invisible:
   the overlays rest at opacity 0, so their clip geometry can reset
   instantly with nothing seen. */
const LOAD_MS = 500;
const CLICK_MS = 950;
const HOLD_MS = 90;

const LETTERS = "UC San Diego".split("");

export default function UCSDWord() {
  const reduceMotion = useReducedMotion();
  const [run, setRun] = useState<{ id: number; ms: number } | null>(null);
  const [trident, setTrident] = useState<{
    origin: { x: number; y: number };
    thrown: boolean;
    id: number;
  } | null>(null);
  const wordRef = useRef<HTMLSpanElement>(null);
  const runningRef = useRef(false);
  const runIdRef = useRef(0);
  const guards = useRef<ReturnType<typeof setTimeout>[]>([]);

  const pushGuard = useCallback((t: ReturnType<typeof setTimeout>) => {
    guards.current.push(t);
  }, []);

  // RUN FINISHED for the word: the run class drops and the overlays
  // reset to their invisible rest state - instant and unseen (their
  // opacity is already 0: no reverse wipe is ever visible).
  const endRun = useCallback((id: number) => {
    setRun((r) => (r && r.id === id ? null : r));
  }, []);

  const finish = useCallback(() => {
    runningRef.current = false;
    setRun(null);
    setTrident(null);
  }, []);

  // ONE entry for load and click. The same paint choreography, two
  // tempos; the click additionally mounts the trident at t=0 fully
  // concealed and, once the paint run completes + the hold beat,
  // throws it.
  const play = useCallback(
    (withTrident: boolean) => {
      if (runningRef.current) return; // an animation is running: ignore
      runningRef.current = true;
      const id = ++runIdRef.current;
      const ms = withTrident ? CLICK_MS : LOAD_MS;

      if (reduceMotion) {
        // no paint: the letters stay ink; the click still throws
        if (withTrident) {
          const rect = wordRef.current?.getBoundingClientRect();
          if (rect) {
            setTrident({
              origin: { x: rect.left + rect.width / 2, y: rect.top - 28 },
              thrown: false,
              id,
            });
            pushGuard(
              setTimeout(() => {
                setTrident((c) => (c && c.id === id ? { ...c, thrown: true } : c));
              }, 60)
            );
          }
        }
        pushGuard(setTimeout(finish, withTrident ? 1100 : 40));
        return;
      }

      // RUN STARTED - the CSS choreography owns the whole paint.
      setRun({ id, ms });

      if (withTrident) {
        const rect = wordRef.current?.getBoundingClientRect();
        if (!rect) {
          finish();
          return;
        }
        // mount IMMEDIATELY at timeline start, fully concealed
        setTrident({ origin: { x: rect.left + rect.width / 2, y: rect.top - 28 }, thrown: false, id });
      }

      // RUN FINISHED (paint): the word resets invisibly. On click,
      // the completion beat (HOLD_MS) then the throw.
      pushGuard(
        setTimeout(() => {
          endRun(id);
          if (withTrident) {
            pushGuard(
              setTimeout(() => {
                setTrident((c) => (c && c.id === id ? { ...c, thrown: true } : c));
              }, HOLD_MS)
            );
          } else {
            finish();
          }
        }, ms + 20)
      );
      // safety net: force-complete this run ONLY (a stale guard from
      // an earlier run must never clear a newer one)
      pushGuard(
        setTimeout(() => {
          if (runIdRef.current === id) finish();
        }, ms + HOLD_MS + 1500)
      );
    },
    [reduceMotion, finish, endRun, pushGuard]
  );

  // LOAD: the fast paint hint runs once after the reveal settles.
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

  return (
    <TactileWord label="UC San Diego" onActivate={activate} className="whitespace-nowrap">
      <span className="word-anchor" ref={wordRef}>
        {/* layered glyphs: base ink + navy + gold. The overlays own
            their animation - one run class starts the whole paint. */}
        <span
          aria-hidden="true"
          className={`ucsd-word${run ? " run" : ""}`}
          style={run ? ({ "--ucsd-run-ms": `${run.ms}ms` } as React.CSSProperties) : undefined}
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
            key={`run-${trident.id}`}
            origin={trident.origin}
            runMs={run ? run.ms : CLICK_MS}
            thrown={trident.thrown}
            fast={!!reduceMotion}
            onEnd={finish}
          />
        )}
      </span>
    </TactileWord>
  );
}

/**
 * The trident: mounted at timeline start fully concealed, formed by
 * the SAME --ucsd-run-ms choreography (staff during the navy window,
 * head during the gold window - all gold). Once the paint run
 * completes and the hold beat passes, the master flips `thrown` and
 * this component only FLIES the fully-formed mark: quick horizontal
 * acceleration, a very subtle droop, exit beyond the viewport right.
 * It does NOT decide when construction is complete.
 * Rendered via portal so the coordinates are viewport-true.
 */
function TridentBuild({
  origin,
  runMs,
  thrown,
  fast,
  onEnd,
}: {
  origin: { x: number; y: number };
  runMs: number;
  thrown: boolean;
  fast: boolean;
  onEnd: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const onEndRef = useRef(onEnd);
  useEffect(() => {
    onEndRef.current = onEnd;
  }, [onEnd]);

  // FLIGHT ONLY - formation is complete before this ever runs.
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
        className={`ucsd-trident-fly${runMs > 0 ? " run" : ""}`}
        style={{ left: 0, top: 0, "--ucsd-run-ms": `${runMs}ms` } as React.CSSProperties}
      >
        <TridentMark height={26} />
      </div>
    </div>,
    document.body
  );
}