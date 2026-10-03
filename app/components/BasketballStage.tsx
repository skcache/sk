"use client";

import { useEffect, useRef } from "react";

/**
 * The basketball egg: a deterministic OFFSCREEN-LEFT -> OFFSCREEN-RIGHT
 * crossing with exactly THREE uniform bounces off the divider line
 * above "some things i've done".
 *
 * The whole flight is PIECEWISE PARABOLAS - no gravity integration, no
 * restitution, no decay, no rolling. Horizontal speed is constant; the
 * four arcs are equally wide (the entry, the three impact arcs, and a
 * final leap that exits mid-air, fully offscreen right). Every bounce
 * is the same height and duration, so all three impacts are uniform
 * and countable.
 *
 * Rotation tracks the horizontal travel continuously (~2 full
 * clockwise turns across the screen) and never stops at impacts. Each
 * impact emits 5/4/3 tiny 2-3px pixel squares around the contact point
 * (first strongest) plus a brief 55ms contact squash. All on a rAF
 * clock mutating transforms directly - no re-renders mid-flight.
 */
const DUR_MS = 2150; // total crossing, ~2.15s (2.0-2.3 target)
const APEX = 44; // uniform bounce apex, px (42-48)
const FINAL_APEX = 46; // the exit leap sits slightly higher
const BALL = 26;
const SQUASH_MS = 55; // tiny contact squash window
const ENTRY_PAD = 80; // fully offscreen left, viewport-space
const GRID = 3.85; // (cross + pads) / GRID = one uniform arc's span

const PARTICLE_COLORS = ["#ffb059", "#ff9a3c", "#f3ead9"];

/* the 8-bit basketball stays: a 13x13 pixel sprite, classic
   four-seam pattern, hard-edged pixels at 2px per cell (26px) */
const PX = 13;
const PIXEL_CENTER = (PX - 1) / 2;
const INK = "#3b1a00";
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
      if (d2 > 42) continue;
      let fill = BASE;
      const seam = dx === 0 || dy === 0 || Math.abs(dx) === Math.abs(dy);
      if (seam) {
        fill = INK;
      } else if (d2 > 36) {
        fill = RIM;
      } else if (d2 > 27) {
        fill = SHADE;
      } else if (dx < 0 && dy < 0 && d2 < 20) {
        fill = d2 < 6 ? GLINT : LIGHT;
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

function PixelBall({ size = BALL }: { size?: number }) {
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
  const partsRef = useRef<HTMLDivElement>(null);
  const onDoneRef = useRef(onDone);

  useEffect(() => {
    onDoneRef.current = onDone;
  }, [onDone]);

  useEffect(() => {
    const el = ref.current;
    const parts = partsRef.current;
    if (!el || !parts) return;
    const stage = el.parentElement as HTMLElement | null;
    const stageRect = stage?.getBoundingClientRect() ?? { left: 0, top: 0 };
    // the GROUND LINE is the divider above "some things i've done",
    // measured once in stage-local coordinates - the ball's bottom
    // edge must contact it on every impact
    const div = document.querySelector<HTMLElement>("#things-done");
    const dr = div?.getBoundingClientRect();
    const ground = dr ? dr.top - stageRect.top : stage?.clientHeight ?? 120;

    const W = window.innerWidth;
    const entryX = -ENTRY_PAD - stageRect.left; // fully offscreen left
    const exitX = W + 10 - stageRect.left; // fully offscreen right
    const span = (exitX - entryX) / GRID; // one uniform arc's horizontal travel
    const boundary = [entryX, entryX + span, entryX + 2 * span, entryX + 3 * span];
    const vx = (exitX - entryX) / DUR_MS; // constant horizontal speed

    let raf = 0;
    let startT = 0;
    let prev = 0;
    let x = entryX;
    let passed = 0; // impacts already crossed (0..3)
    let squash = 0; // contact squash countdown, ms
    let doneSent = false;

    // tiny deterministic pixel squares at the contact point - the
    // first impact is the strongest (5), then quieter (4, 3)
    const emit = (atX: number, n: number) => {
      for (let i = 0; i < n; i++) {
        const s = document.createElement("span");
        s.className = "bb-particle";
        const size = 2 + (i % 2);
        const ox = ((i * 13) % 17) - 8;
        const oy = -(((i * 7) % 9) + 2);
        s.style.width = `${size}px`;
        s.style.height = `${size}px`;
        s.style.left = `${atX + ox}px`;
        s.style.top = `${ground - size + oy}px`;
        s.style.background = PARTICLE_COLORS[i % PARTICLE_COLORS.length];
        parts.appendChild(s);
        requestAnimationFrame(() =>
          requestAnimationFrame(() => {
            s.style.opacity = "0";
          })
        );
        setTimeout(() => s.remove(), 170);
      }
    };

    const tick = (now: number) => {
      const dt = Math.min(32, now - prev);
      prev = now;
      x += vx * dt;

      // impact detection - exactly once per boundary
      while (passed < 3 && x >= boundary[passed + 1]) {
        passed++;
        squash = SQUASH_MS;
        emit(boundary[passed], 5 - passed + 1);
      }

      // ---- deterministic piecewise parabola ----
      const seg = Math.min(passed, 3);
      const a = boundary[seg];
      // the FINAL arc's parabola continues past the exit point (its
      // would-be landing stays offscreen), so the ball exits mid-air
      // at u ~ 0.85 instead of touching down at the edge
      const b = seg === 3 ? boundary[3] + span : boundary[seg + 1];
      const u = Math.max(0, Math.min(1, (x - a) / (b - a)));
      const apex = seg === 3 ? FINAL_APEX : APEX;
      const ballBottom = ground - 4 * apex * u * (1 - u);
      const yTop = ballBottom - BALL;

      // rotation tracks horizontal travel continuously, clockwise,
      // ~2 full turns across the crossing - never stops at impacts
      const deg = (720 * (x - entryX)) / (exitX - entryX);

      // tiny contact squash: 55ms dip at each impact instant
      let scX = 1;
      let scY = 1;
      if (squash > 0) {
        squash -= dt;
        const k = Math.max(0, squash / SQUASH_MS);
        const dip = 0.13 * Math.sin(Math.PI * (1 - k));
        scY = 1 - dip;
        scX = 1 + dip * 0.7;
      }

      el.style.transform = `translate(${x.toFixed(1)}px, ${yTop.toFixed(1)}px) rotate(${deg.toFixed(1)}deg) scaleX(${scX.toFixed(3)}) scaleY(${scY.toFixed(3)})`;

      if (x >= exitX) {
        if (!doneSent) {
          doneSent = true;
          setTimeout(() => onDoneRef.current(), 150); // let particles die
        }
        return;
      }
      raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame((now) => {
      startT = now;
      prev = now;
      raf = requestAnimationFrame(tick);
    });
    void startT;
    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    <>
      <div className="stage-basketball" ref={ref}>
        <PixelBall />
      </div>
      <div className="bb-particles" ref={partsRef} aria-hidden="true" />
    </>
  );
}