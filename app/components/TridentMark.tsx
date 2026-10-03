const LIGHT = "#F2C14E";
const MID = "#C69214";
const SHADOW = "#7A5208";

/* ---- the trident, v6: the REFERENCE, 1:1. Flat-shaded low-poly,
   no outlines - the facet tones alone define the form (light top
   faces, mid side faces, dark bottom faces). Three prismatic wedge
   blades (the center longest, the sides nearly parallel), a blocky
   chamfered crown, a cuboid collar, a LONG uniform-width square
   shaft (two planes: light face over dark face), and a cube pommel.
   The palette is exactly three tones. Lying HORIZONTAL, pointing
   RIGHT - it shoots left -> right. ---- */
function TridentMark({ height = 28 }: { height?: number }) {
  const width = (height * 150) / 44;
  return (
    <svg viewBox="0 0 150 44" width={width} height={height} aria-hidden="true">
      {/* the build splits: the STAFF is what the navy pass creates,
          the HEAD is what the gold pass creates - each assembled
          part by part bottom -> up */}
      <g className="ucsd-staff">
        <g className="ucsd-staff-shaft">
          {/* ---- LONG square shaft: uniform width, two planes ---- */}
          <path d="M76 18 L76 21.5 L8 21 L8 17.5 Z" fill={LIGHT} />
          <path d="M76 21.5 L76 25.5 L8 25 L8 21 Z" fill={SHADOW} />
        </g>
        <g className="ucsd-staff-pommel">
          {/* ---- cube pommel, slightly larger than the shaft ---- */}
          <path d="M8 16.5 L12.5 21.5 L8 27.5 L3.5 28.5 L0.5 21.9 L3.5 15 Z" fill={MID} />
          <path d="M8 16.5 L12.5 21.5 L8 21 L3.5 16 Z" fill={LIGHT} />
          <path d="M8 21.5 L8 27.5 L3.5 28.5 L3.5 21.9 Z" fill={SHADOW} />
        </g>
      </g>
      <g className="ucsd-head">
        {/* part 1: the blocky CROWN + the LOWER blade - the head's
            base connects to the shaft from the first gold moment */}
        <g className="ucsd-head-part1">
          {/* the LOWER blade: a wedge - light top face, dark bottom */}
          <path d="M86 30.5 L106 34 L130 39.5 L112 32.8 L88 28.5 Z" fill={MID} />
          <path d="M86 30.5 L106 34 L130 39.5 L126 37.8 L106 33 Z" fill={LIGHT} />
          <path d="M88 31.8 L112 34.5 L130 39.5 L124 39 L108 35.5 L88 32.5 Z" fill={SHADOW} />
          {/* the crown: the chamfered block the blades merge into */}
          <path d="M76 14 L90 16 L90 28 L76 30 Z" fill={MID} />
          <path d="M76 14 L90 16 L90 19.5 L76 17.5 Z" fill={LIGHT} />
          <path d="M76 25 L90 27 L90 28 L76 30 Z" fill={SHADOW} />
        </g>
        {/* part 2: the CENTER blade - the longest, straight out */}
        <g className="ucsd-head-part2">
          <path d="M88 15.5 L118 18.5 L148 22 L118 25.5 L88 28.5 Z" fill={MID} />
          <path d="M88 15.5 L118 18.5 L148 22 L118 20.8 L88 17.8 Z" fill={LIGHT} />
          <path d="M88 26.5 L118 23.2 L148 22 L122 24 L90 27.8 Z" fill={SHADOW} />
        </g>
        {/* part 3: the UPPER blade - nearly parallel, slightly out */}
        <g className="ucsd-head-part3">
          <path d="M86 13.5 L106 10 L130 4.5 L112 11.2 L88 15.5 Z" fill={MID} />
          <path d="M86 13.5 L106 10 L130 4.5 L126 6.2 L106 10.5 Z" fill={LIGHT} />
          <path d="M88 14.4 L112 11.2 L130 9.8 L124 9.6 L108 12.5 L88 15 Z" fill={SHADOW} />
        </g>
      </g>
    </svg>
  );
}

export default TridentMark;