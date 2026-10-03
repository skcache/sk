/* the two construction palettes.
   The reference is all-gold; the choreography demands the pieces
   carry the passes: the STAFF (built by the NAVY pass) is navy -
   light face #2A4470 (a small lighter derivation, allowed for the
   top-lit facet), mid #182B49 (the official UCSD navy), shadow
   #0E1B30. The HEAD (built by the GOLD pass) is gold: #F2C14E /
   #C69214 / #7A5208. Flat-shaded low-poly - the facet tones alone
   define the form, no outline strokes. */
const N_LIGHT = "#3E6296";
const N_MID = "#182B49";
const N_SHADOW = "#0E1B30";
const G_LIGHT = "#F2C14E";
const G_MID = "#C69214";
const G_SHADOW = "#7A5208";

/* ---- the trident: the reference silhouette, faithfully traced
   into SVG once (flat-shaded low-poly, no outlines). Three
   prismatic wedge blades (the center longest, pointing straight;
   the sides nearly parallel, slightly fanned), a blocky chamfered
   crown, a cuboid collar, a LONG uniform-width square shaft (two
   planes: light face over dark face), and a cube pommel slightly
   larger than the shaft. Lying HORIZONTAL, pointing RIGHT - it
   shoots left -> right. The part groups are the construction
   pieces: the staff (shaft + pommel) forms during the NAVY pass,
   the head (crown + the three blades) during the GOLD pass, each
   revealed bottom -> up by clips on the wrapper. ---- */
function TridentMark({ height = 28 }: { height?: number }) {
  const width = (height * 150) / 44;
  return (
    <svg viewBox="0 0 150 44" width={width} height={height} aria-hidden="true">
      <g className="ucsd-staff">
        <g className="ucsd-staff-shaft">
          {/* ---- LONG square shaft: uniform width, two planes ---- */}
          <path d="M76 18 L76 21.5 L8 21 L8 17.5 Z" fill={N_LIGHT} />
          <path d="M76 21.5 L76 25.5 L8 25 L8 21 Z" fill={N_SHADOW} />
        </g>
        <g className="ucsd-staff-pommel">
          {/* ---- cube pommel, slightly larger than the shaft ---- */}
          <path d="M8 16.5 L12.5 21.5 L8 27.5 L3.5 28.5 L0.5 21.9 L3.5 15 Z" fill={N_MID} />
          <path d="M8 16.5 L12.5 21.5 L8 21 L3.5 16 Z" fill={N_LIGHT} />
          <path d="M8 21.5 L8 27.5 L3.5 28.5 L3.5 21.9 Z" fill={N_SHADOW} />
        </g>
      </g>
      <g className="ucsd-head">
        {/* part 1: the blocky CROWN + the LOWER blade - the head's
            base connects to the shaft from the first gold moment */}
        <g className="ucsd-head-part1">
          <path d="M86 30.5 L106 34 L130 39.5 L112 32.8 L88 28.5 Z" fill={G_MID} />
          <path d="M86 30.5 L106 34 L130 39.5 L122 36.8 L104 32.2 Z" fill={G_LIGHT} />
          <path d="M88 31.8 L112 34.5 L130 39.5 L124 39 L108 35.5 L88 32.5 Z" fill={G_SHADOW} />
          <path d="M76 14 L90 16 L90 28 L76 30 Z" fill={G_MID} />
          <path d="M76 14 L90 16 L90 22 L76 20 Z" fill={G_LIGHT} />
          <path d="M76 25 L90 27 L90 28 L76 30 Z" fill={G_SHADOW} />
        </g>
        {/* part 2: the CENTER blade - the longest, straight out */}
        <g className="ucsd-head-part2">
          <path d="M88 15.5 L118 18.5 L148 22 L118 25.5 L88 28.5 Z" fill={G_MID} />
          <path d="M88 15.5 L118 18.5 L148 22 L118 21.6 L88 18.8 Z" fill={G_LIGHT} />
          <path d="M88 26.5 L118 23.2 L148 22 L122 24 L90 27.8 Z" fill={G_SHADOW} />
        </g>
        {/* part 3: the UPPER blade - nearly parallel, slightly out */}
        <g className="ucsd-head-part3">
          <path d="M86 13.5 L106 10 L130 4.5 L112 11.2 L88 15.5 Z" fill={G_MID} />
          <path d="M86 13.5 L106 10 L130 4.5 L122 7.6 L104 9.8 Z" fill={G_LIGHT} />
          <path d="M88 14.4 L112 11.2 L130 9.8 L124 9.6 L108 12.5 L88 15 Z" fill={G_SHADOW} />
        </g>
      </g>
    </svg>
  );
}

export default TridentMark;