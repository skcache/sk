const GOLD = "#C69214"; // base gold
const GOLD_LIGHT = "#E3B23C"; // bright facet
const GOLD_DARK = "#9A6F10"; // shade facet
const GOLD_DEEP = "#7A5A08"; // facet edges

/* ---- the trident, replicated from the reference (a golden low-poly
   game asset): three flat angular blade prongs (center longest,
   sides fanning), the prongs converging into a solid collar block,
   a long hexagonal-faceted shaft, and a faceted gem-cut pommel.
   Drawn HORIZONTAL, pointing RIGHT (it shoots left -> right).
   Every polygon gets a deep-gold stroke so the facets read crisply
   at small sizes. ---- */
function TridentMark({ height = 20 }: { height?: number }) {
  const width = (height * 96) / 40;
  return (
    <svg viewBox="0 0 96 40" width={width} height={height} aria-hidden="true">
      {/* ---- head: three blade prongs, right-pointing ---- */}
      {/* center prong (longest) */}
      <polygon points="62,15 78,16.6 96,20 78,23.4 62,25" fill={GOLD} stroke={GOLD_DEEP} strokeWidth="0.8" />
      <polygon points="62,15 78,16.6 78,20 62,20" fill={GOLD_LIGHT} stroke="none" />
      {/* top side prong (shorter, fanned up) */}
      <polygon points="70,17.4 80,9.5 84.5,2.8 72,5.6 66,14" fill={GOLD} stroke={GOLD_DEEP} strokeWidth="0.8" />
      <polygon points="70,17.4 80,9.5 80,6.5 72.5,13" fill={GOLD_LIGHT} stroke="none" />
      {/* bottom side prong (shorter, fanned down) */}
      <polygon points="70,22.6 80,30.5 84.5,37.2 72,34.4 66,26" fill={GOLD_DARK} stroke={GOLD_DEEP} strokeWidth="0.8" />
      <polygon points="70,22.6 80,30.5 72,34.4 66,26" fill={GOLD} stroke="none" />
      {/* ---- collar: the prongs converge into a solid block ---- */}
      <polygon points="58,13 67,15.4 67,24.6 58,27" fill={GOLD_DARK} stroke={GOLD_DEEP} strokeWidth="0.8" />
      <polygon points="58,13 67,15.4 67,20 58,18" fill={GOLD} stroke="none" />
      {/* ---- shaft: long, hexagonal-faceted, tapering toward the
           pommel (thicker at the collar, thinner at the butt) ---- */}
      <polygon points="58,20.6 58,25 12,22.7 12,19.4" fill={GOLD_DEEP} stroke={GOLD_DEEP} strokeWidth="0.8" />
      <polygon points="58,17.4 58,20.6 12,19.4 12,16.6" fill={GOLD} stroke="none" />
      <polygon points="58,14 58,17.4 12,16.6 12,14.2" fill={GOLD_LIGHT} stroke={GOLD_DEEP} strokeWidth="0.8" />
      {/* ---- pommel: faceted gem-cut butt ---- */}
      <polygon points="12,14.2 14.4,19.5 12,23.8 5,26 1.5,19.5 5,12.6" fill={GOLD_DARK} stroke={GOLD_DEEP} strokeWidth="0.8" />
      <polygon points="12,14.2 14.4,19.5 8.6,20 5,12.6" fill={GOLD} stroke="none" />
      <polygon points="5,12.6 2.6,15.2 5,26 1.5,19.5" fill={GOLD} stroke="none" />
    </svg>
  );
}

export default TridentMark;