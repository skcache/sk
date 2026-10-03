const GOLD = "#C69214";

/* ---- the trident, minimal: a single flat gold mark that sits
   beside Geist type. Horizontal, pointing right: a long thin shaft
   (soft taper to the butt), a small collar, a clear long central
   tine, and two restrained outer tines. FIVE paths, ONE color -
   the navy/gold distinction belongs to the TEXT passes and sets
   TIMING only, never the trident's color. ---- */
function TridentMark({ height = 26 }: { height?: number }) {
  const width = (height * 140) / 44;
  return (
    <svg viewBox="0 0 140 44" width={width} height={height} aria-hidden="true">
      <g className="ucsd-staff">
        {/* the long thin shaft */}
        <path d="M82 19.5 L82 24.5 L10 23.5 Q5 23.6 5 21.5 L10 19.5 Z" fill={GOLD} />
      </g>
      <g className="ucsd-head">
        {/* the small collar */}
        <path d="M82 17.5 L92 19.5 L92 28.5 L82 30.5 Z" fill={GOLD} />
        {/* the central tine - long and sharp */}
        <path d="M90 16.5 L118 19.2 L140 22 L118 24.8 L90 27.5 Z" fill={GOLD} />
        {/* the two restrained outer tines */}
        <path d="M88 14.5 L106 10.5 L122 6.5 L108 13 L88 16.5 Z" fill={GOLD} />
        <path d="M88 29.5 L106 33.5 L122 37.5 L108 31 L88 27.5 Z" fill={GOLD} />
      </g>
    </svg>
  );
}

export default TridentMark;