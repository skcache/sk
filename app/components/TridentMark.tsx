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
      {/* the build splits: the STAFF is what the navy pass creates,
          the HEAD is what the gold pass creates - and each is
          assembled PART BY PART bottom -> up (shaft line, then the
          pommel; lower blade, then collar+center blade, then upper
          blade) so the formation reads as pieces materializing, not
          a clipped smear */}
      <g className="ucsd-staff">
        <g className="ucsd-staff-shaft">
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
        </g>
        <g className="ucsd-staff-pommel">
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
        </g>
      </g>
      <g className="ucsd-head">
        {/* part 1: the convergent COLLAR + the LOWER blade - the head's
            base - so the head CONNECTS to the shaft from the very
            first moment of the gold pass */}
        <g className="ucsd-head-part1">
          <path
            d="M86 32.5 L110 36.5 L132 41.5 L116 33 L88 28.5 Z"
            fill={GOLD_MID}
            stroke={OUTLINE}
            strokeWidth="1.6"
            strokeLinejoin="round"
          />
          <path d="M86 32.5 L110 36.5 L112 34.5 L88 29 Z" fill={GOLD} stroke="none" />
          <path
            d="M74 13.5 L88 16 L88 28 L74 30.5 Z"
            fill={GOLD_LIGHT}
            stroke={OUTLINE}
            strokeWidth="1.5"
            strokeLinejoin="round"
          />
          <path d="M74 13.5 L88 16 L88 22 L74 20.5 Z" fill={GOLD} stroke="none" />
        </g>
        {/* part 2: the CENTER blade (the long sharp point - the
            head's main line) */}
        <g className="ucsd-head-part2">
          <path
            d="M88 15 L118 18 L146 22 L118 26 L88 29 Z"
            fill={GOLD}
            stroke={OUTLINE}
            strokeWidth="1.6"
            strokeLinejoin="round"
          />
          <path d="M88 15 L118 18 L118 22 L88 19.5 Z" fill={GOLD_LIGHT} stroke="none" />
        </g>
        {/* part 3: the UPPER blade (top of the head, forms last) */}
        <g className="ucsd-head-part3">
          <path
            d="M86 11.5 L110 7.5 L132 2.5 L116 11 L88 15.5 Z"
            fill={GOLD}
            stroke={OUTLINE}
            strokeWidth="1.6"
            strokeLinejoin="round"
          />
          <path d="M86 11.5 L110 7.5 L108 10 L88 15 Z" fill={GOLD_LIGHT} stroke="none" />
        </g>
      </g>
    </svg>
  );
}

export default TridentMark;