import type { Ref } from "react";

const GOLD = "#C69214";

/* ---- the trident, minimal: TWO perfectly overlapping SVG layers
   inside an HTML wrapper. The staff layer (the long thin shaft) and
   the head layer (small collar + long central tine + two restrained
   outer tines) share the same width/height/viewBox, so the geometry
   aligns exactly - and the FORMATION clips the HTML layer wrappers
   (predictable on every browser/mobile), never SVG <g> elements.
   One solid gold color, five flat paths, flat minimal icon language.
   Horizontal, pointing right. ---- */
function TridentMark({
  width = 84,
  height = 26,
  staffRef,
  headRef,
  markRef,
}: {
  width?: number;
  height?: number;
  staffRef?: Ref<HTMLSpanElement>;
  headRef?: Ref<HTMLSpanElement>;
  markRef?: Ref<HTMLSpanElement>;
}) {
  const viewBox = "0 0 140 44";
  return (
    <span className="trident-mark" style={{ width, height }} aria-hidden="true" ref={markRef}>
      <span className="trident-staff-layer" ref={staffRef}>
        <svg viewBox={viewBox} width={width} height={height}>
          {/* the long thin shaft (1ad96e geometry, mirrored on y=22) */}
          <path d="M82 19.5 L82 24.5 L10 24.5 Q5 24.5 5 22 Q5 19.5 10 19.5 Z" fill={GOLD} />
        </svg>
      </span>
      <span className="trident-head-layer" ref={headRef}>
        <svg viewBox={viewBox} width={width} height={height}>
          {/* the small collar (mirrored on y=22) */}
          <path d="M82 17.5 L92 19.5 L92 24.5 L82 26.5 Z" fill={GOLD} />
          {/* the central tine - long and sharp */}
          <path d="M90 16.5 L118 19.2 L140 22 L118 24.8 L90 27.5 Z" fill={GOLD} />
          {/* the two restrained outer tines */}
          <path d="M88 14.5 L106 10.5 L122 6.5 L108 13 L88 16.5 Z" fill={GOLD} />
          <path d="M88 29.5 L106 33.5 L122 37.5 L108 31 L88 27.5 Z" fill={GOLD} />
        </svg>
      </span>
    </span>
  );
}

export default TridentMark;