"use client";

import { useEffect, useRef } from "react";

/**
 * Basketball enters the shared stage from the left and crosses with
 * NBA-quality ballistics: REAL time-integrated physics (gravity +
 * restitution), so every bounce apex and airtime falls out of the
 * math naturally (54 -> 32 -> 16px with r = 0.77), the spin is
 * consistent with the crossing speed, and the squash happens ONLY
 * at the impact window (a brief 90ms dip), never a permanent
 * distortion. A grounded contact shadow follows horizontally and
 * breathes with height. Choreographed on a rAF clock mutating
 * transforms directly - no re-renders.
 */
const DUR = 2450; // total, ms - slow, readable crossing
const GRAVITY = 2600; // px/s^2
const RESTITUTION = 0.77; // r^2 = 0.59 -> natural apex decay 54/32/16
const APEX = 54; // first apex, px (desktop)
const IMPACT_MS = 90; // squash window at each ground contact
const DROP_IN = 64; // spawn height above the floor at the word (falls in)

/* ---- 8-bit basketball: a 13x13 pixel sprite, classic four-seam
   pattern (vertical/horizontal + the two diagonals), light
   top-left / dark bottom-right shading, hard-edged pixels. Rendered
   at 2px per cell (26px) with crispEdges so it reads like an NES
   sprite, not a vector. Sprites don't rotate in 8-bit games (and
   the four-panel symmetry hides spin anyway) - the motion is pure
   vertical + squash, which is how the old games did it. ---- */
const PX = 13;
const PIXEL_CENTER = (PX - 1) / 2;
const INK = "#3b1a00"; // seam / outline ink
const RIM = "#8a3d05";
const SHADE = "#c25e10";
const BASE = "#e8761d";
const LIGHT = "#ff9a3c";
const GLINT = "#ffb059";

function pixelCells() {
  const cells: { x: number; y: number; fill: string }[] = [];
  for (let y = 0; y < PX; y++) {
    for (let x = 0; x < PX; x++) {
      const dx = x - PIXEL_CENTER;
      const dy = y - PIXEL_CENTER;
      const d2 = dx * dx + dy * dy;
      if (d2 > 42) continue; // circle silhouette (r ~ 6.5)
      let fill = BASE;
      const seam = dx === 0 || dy === 0 || Math.abs(dx) === Math.abs(dy);
      if (seam) {
        fill = INK;
      } else if (d2 > 36) {
        fill = RIM;
      } else if (d2 > 27) {
        fill = SHADE;
      } else if (dx < 0 && dy < 0 && d2 < 20) {
        fill = d2 < 6 ? GLINT : LIGHT; // top-left glint
      } else if (dx > 1 && dy > 1) {
        fill = SHADE;
      } else if (dx < -2 || dy < -2) {
        fill = LIGHT;
      }
      cells.push({ x, y, fill });
    }
  }
  return cells;
}

const PIXEL_CELLS = pixelCells();

function PixelBall({ size = 26 }: { size?: number }) {
  return (
    <svg
      viewBox={`0 0 ${PX} ${PX}`}
      width={size}
      height={size}
      shapeRendering="crispEdges"
      aria-hidden="true"
    >
      {PIXEL_CELLS.map((c, i) => (
        <rect key={i} x={c.x} y={c.y} width={1} height={1} fill={c.fill} />
      ))}
    </svg>
  );
}

export default function BasketballStage({ onDone }: { onDone: () => void }) {
  const ref = useRef<HTMLDivElement>(null);
  const shadowRef = useRef<HTMLSpanElement>(null);
  const onDoneRef = useRef(onDone);
  useEffect(() => {
    onDoneRef.current = onDone;
  }, [onDone]);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const shadow = shadowRef.current;
    const stage = el.parentElement;
    // stage height caps the apex on short viewports (72px mobile)
    const maxApex = stage && stage.clientHeight < 88 ? 40 : APEX;
    const travel = stage ? stage.clientWidth + 140 : 520; // word -> past right edge
    // SPAWN AT THE WORD: measure the basketball word button, so the
    // ball drops from exactly there (visible above the stage, falls
    // in, first bounce lands at the word)
    const wordBtn = document.querySelector<HTMLElement>(
      'button[aria-label="basketball"]',
    );
    // STAGE-LOCAL x: the ball's translate lives inside the stage,
    // while getBoundingClientRect is page-global - subtract the stage
    // origin or the ball lands a full stage-width right of the word
    const stageRect = stage ? stage.getBoundingClientRect() : { left: 0 };
    const wr = wordBtn ? wordBtn.getBoundingClientRect() : null;
    const wordX = wr ? wr.left + wr.width / 2 - stageRect.left : 60;
    const vy0 = Math.sqrt(2 * GRAVITY * maxApex); // px/s launch upward (stretch normalization)
    let raf = 0;
    let startT = 0;
    let prev = 0;
    let y = 64; // spawns 64px above the floor at the word's x (visible
    // above the stage top), falls in with gravity, first bounce lands
    // at the word
    let vy = 0; // falls in with gravity
    let impactLeft = 0; // squash window countdown, ms
    let impactAmp = 0;
    const ease = (x: number) => (x < 0.12 ? 0 : x > 0.88 ? 1 : (x - 0.12) / 0.76);

    const tick = (now: number) => {
      const elapsed = now - startT;
      if (elapsed >= DUR) {
        onDoneRef.current();
        return;
      }
      const dt = Math.min(32, now - prev);
      prev = now;
      // ----- vertical: true time integration -----
      vy -= (GRAVITY * dt) / 1000;
      y += (vy * dt) / 1000;
      if (y <= 0) {
        const speed = Math.abs(vy);
        y = 0;
        if (vy < 0) {
          // micro-bounce settler: when the next apex is under 3px the
          // ball rolls instead of ticking tiny bounces forever
          const nextApex = (vy * vy) / (2 * GRAVITY);
          if (nextApex < 3) {
            vy = 0;
          } else {
            vy = -vy * RESTITUTION;
            impactLeft = IMPACT_MS;
            impactAmp = Math.min(0.3, Math.max(0.16, speed / 2600));
          }
        }
      }
      // roll-out: after 82% of the crossing the ball is done bouncing
      // and rolls cleanly (no impacts, no squash - zero distortion)
      if (elapsed > DUR * 0.82) {
        y = 0;
        vy = 0;
      }
      // impact squash: a brief dip that returns - never persistent
      let scX = 1;
      let scY = 1;
      if (impactLeft > 0) {
        impactLeft -= dt;
        const k = Math.max(0, impactLeft / IMPACT_MS);
        const dip = impactAmp * Math.sin(Math.PI * (1 - k));
        scY = 1 - dip;
        scX = 1 + dip * 0.85;
      } else if (vy < -240) {
        // airborne STRETCH: elongates while falling fast (whiplash)
        const stretch = Math.min(0.07, (Math.abs(vy) / vy0) * 0.12);
        scY = 1 + stretch;
        scX = 1 - stretch * 0.7;
      }
      // ----- horizontal: from the word, crossing right -----
      const u = elapsed / DUR;
      const x = wordX - 18 + travel * ease(u);
      // NOTE: no rotation - pixel sprites don't spin (and the 8-bit
      // ball's four-panel seams are 90-deg symmetric anyway)
      const opacity =
        elapsed < 90 ? elapsed / 90 : elapsed > DUR - 170 ? Math.max(0, (DUR - elapsed) / 170) : 1;
      el.style.opacity = String(opacity);
      el.style.transform =
        `translate(${x.toFixed(1)}px, ${(-y).toFixed(1)}px) ` +
        `scaleX(${scX.toFixed(3)}) scaleY(${scY.toFixed(3)})`;
      // contact shadow: grounded sibling, follows x, breathes with height
      if (shadow) {
        const breath = Math.min(1, y / maxApex);
        shadow.style.opacity = String(0.52 * (1 - breath * 0.55));
        shadow.style.transform = `translateX(${x.toFixed(1)}px) scale(${(1 - breath * 0.26).toFixed(3)})`;
      }
      raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame((now) => {
      startT = now;
      prev = now;
      raf = requestAnimationFrame(tick);
    });
    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    <>
      <div className="stage-basketball" ref={ref}>
        <PixelBall size={26} />
      </div>
      <span className="bb-shadow" ref={shadowRef} aria-hidden="true" />
    </>
  );
}