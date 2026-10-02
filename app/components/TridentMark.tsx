const GOLD_LIGHT = "#F2C14E";
const GOLD = "#C69214";
const GOLD_MID = "#A3730F";
const GOLD_DARK = "#7A5208";
const GOLD_DEEP = "#61420A";
const OUTLINE = "#3A2A05";

/* ---- the trident, v4: reference-faithful - the LOW-POLY golden
   trident from the reference image, proportioned like the real
   thing: three THICK angular blade prongs (center longest, sides
   fanning), a solid convergent collar, a LONG hexagonal-faceted
   shaft, and a faceted gem pommel. The shaft dominates (60% of the
   length) and each facet is its own polygon in its own tone, so the
   low-poly read survives at icon size. Lying HORIZONTAL, pointing
   RIGHT - it shoots left -> right. ---- */
function TridentMark({ height = 26 }: { height?: number }) {
  const width = (height * 150) / 44;
  return (
    <svg viewBox="0 0 150 44" width={width} height={height} aria-hidden="true">
      {/* ---- head: three thick angular blades pointing right ---- */}
      {/* center blade - longest, sharp diamond tip */}
      <path
        d="M88 15 L118 18 L146 22 L118 26 L88 29 Z"
        fill={GOLD}
        stroke={OUTLINE}
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      <path d="M88 15 L118 18 L118 22 L88 19.5 Z" fill={GOLD_LIGHT} stroke="none" />
      {/* upper blade - angles up, sharp tip */}
      <path
        d="M86 11.5 L110 7.5 L132 2.5 L116 11 L88 15.5 Z"
        fill={GOLD}
        stroke={OUTLINE}
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      <path d="M86 11.5 L110 7.5 L108 10 L88 15 Z" fill={GOLD_LIGHT} stroke="none" />
      {/* lower blade - angles down, sharp tip */}
      <path
        d="M86 32.5 L110 36.5 L132 41.5 L116 33 L88 28.5 Z"
        fill={GOLD_MID}
        stroke={OUTLINE}
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      <path d="M86 32.5 L110 36.5 L112 34.5 L88 29 Z" fill={GOLD} stroke="none" />
      {/* ---- convergent collar - the blades' solid base ---- */}
      <path
        d="M74 13.5 L88 16 L88 28 L74 30.5 Z"
        fill={GOLD_LIGHT}
        stroke={OUTLINE}
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <path d="M74 13.5 L88 16 L88 22 L74 20.5 Z" fill={GOLD} stroke="none" />
      {/* ---- LONG hexagonal-faceted shaft (the dominant line) ----
          two bold facet planes; the tone contrast between them IS
          the seam (no hairline strokes to mush at icon size) */}
      <path
        d="M72 17.5 L72 22.5 L10 20.8 L10 15.8 Z"
        fill={GOLD_LIGHT}
        stroke={OUTLINE}
        strokeWidth="1.2"
      />
      <path d="M72 22.5 L72 28.5 L10 24.6 L10 20.8 Z" fill={GOLD_DARK} stroke="none" />
      <path d="M72 22.5 L10 20.8" stroke={OUTLINE} strokeWidth="1" fill="none" />
      {/* ---- faceted gem pommel ---- */}
      <path
        d="M10 15.8 L14 20 L10 26.2 L4.5 28.6 L1 21.6 L4.5 13.2 Z"
        fill={GOLD_MID}
        stroke={OUTLINE}
        strokeWidth="1.4"
        strokeLinejoin="round"
      />
      {/* gem facets: light top-left, deep shadow bottom-right */}
      <path d="M10 15.8 L14 20 L7.4 20.8 L4.5 13.2 Z" fill={GOLD} stroke="none" />
      <path d="M14 20 L10 26.2 L7 24.8 L7.4 20.8 Z" fill={GOLD_DEEP} stroke="none" />
    </svg>
  );
}

export default TridentMark;