const GOLD_LIGHT = "#F2C14E";
const GOLD = "#C69214";
const GOLD_MID = "#A3730F";
const GOLD_DARK = "#7A5208";
const GOLD_DEEP = "#61420A";
const OUTLINE = "#3A2A05";

/* ---- the trident, v5: a BOLD, clean weapon silhouette built for
   small sizes. Three THICK blades with long sharp tips (center
   longest, side blades fanning), a solid convergent collar, a long
   two-facet tapering shaft, and a simple faceted pommel. The
   outlines are thin so the shapes, not the strokes, carry the icon;
   the light facet on the top edge of every piece does the
   low-poly work. Lying HORIZONTAL, pointing RIGHT - it shoots
   left -> right. ---- */
function TridentMark({ height = 28 }: { height?: number }) {
  const width = (height * 140) / 44;
  return (
    <svg viewBox="0 0 140 44" width={width} height={height} aria-hidden="true">
      {/* the build splits: the STAFF is what the navy pass creates,
          the HEAD is what the gold pass creates - and each is
          assembled PART BY PART bottom -> up (shaft line, then the
          pommel; collar+lower blade, then center blade, then upper
          blade) so the formation reads as pieces materializing, not
          a clipped smear */}
      <g className="ucsd-staff">
        <g className="ucsd-staff-shaft">
          {/* ---- LONG two-facet shaft (the dominant line) ---- */}
          <path
            d="M76 17.5 L76 21.5 L10 20 L10 16 Z"
            fill={GOLD_LIGHT}
            stroke={OUTLINE}
            strokeWidth="1"
          />
          <path d="M76 21.5 L76 26.5 L10 24 L10 20 Z" fill={GOLD_DARK} stroke="none" />
          <path d="M76 21.5 L10 20" stroke={OUTLINE} strokeWidth="0.9" fill="none" />
        </g>
        <g className="ucsd-staff-pommel">
          {/* ---- faceted pommel: a solid cap with one light bevel */}
          <path
            d="M10 15.5 L14 20.5 L10 25.5 L4.5 27.5 L1 20.5 L4.5 13.5 Z"
            fill={GOLD_MID}
            stroke={OUTLINE}
            strokeWidth="1.1"
            strokeLinejoin="round"
          />
          <path d="M10 15.5 L14 20.5 L7 21 L4.5 13.5 Z" fill={GOLD} stroke="none" />
        </g>
      </g>
      <g className="ucsd-head">
        {/* part 1: the convergent COLLAR + the LOWER blade - the head's
            base - so the head CONNECTS to the shaft from the very
            first moment of the gold pass */}
        <g className="ucsd-head-part1">
          <path
            d="M86 31.5 L106 35 L126 40.5 L112 33 L88 28.5 Z"
            fill={GOLD_MID}
            stroke={OUTLINE}
            strokeWidth="1.1"
            strokeLinejoin="round"
          />
          <path d="M86 31.5 L106 35 L106.5 33 L88 29 Z" fill={GOLD} stroke="none" />
          <path
            d="M78 14 L90 16.5 L90 27.5 L78 30 Z"
            fill={GOLD_LIGHT}
            stroke={OUTLINE}
            strokeWidth="1.1"
            strokeLinejoin="round"
          />
          <path d="M78 14 L90 16.5 L90 22 L78 20.5 Z" fill={GOLD} stroke="none" />
        </g>
        {/* part 2: the CENTER blade (the long sharp point - the
            head's main line) */}
        <g className="ucsd-head-part2">
          <path
            d="M90 15 L116 18 L138 22 L116 26 L90 29 Z"
            fill={GOLD}
            stroke={OUTLINE}
            strokeWidth="1.1"
            strokeLinejoin="round"
          />
          <path d="M90 15 L116 18 L116 22 L90 19.5 Z" fill={GOLD_LIGHT} stroke="none" />
        </g>
        {/* part 3: the UPPER blade (top of the head, forms last) */}
        <g className="ucsd-head-part3">
          <path
            d="M86 12.5 L106 9 L126 3.5 L112 11 L88 15.5 Z"
            fill={GOLD}
            stroke={OUTLINE}
            strokeWidth="1.1"
            strokeLinejoin="round"
          />
          <path d="M86 12.5 L106 9 L106.5 11 L88 15 Z" fill={GOLD_LIGHT} stroke="none" />
        </g>
      </g>
    </svg>
  );
}

export default TridentMark;