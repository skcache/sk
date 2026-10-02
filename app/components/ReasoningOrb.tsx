"use client";

/**
 * ReasoningOrb - a CRISP 22px vector spinner replacing the package's
 * canvas orb (which rendered as a blurry smear at display size).
 * Six reasoning states, each a distinct subtle motion pattern, all
 * drawn as sharp SVG strokes at any scale:
 *
 *  solving    - a three-quarter arc sweeping around
 *  working    - two dots orbiting a center
 *  searching  - a ring with a pulse traveling around it
 *  weaving    - two arcs counter-rotating (weave)
 *  composing  - three short bars collecting upward (like a compose)
 *  breathing  - a ring breathing in/out
 *
 * Reduced motion: every variant freezes as a static ring glyph.
 */
export type ReasoningState =
  | "solving"
  | "working"
  | "searching"
  | "weaving"
  | "composing"
  | "breathing";

const STATES: ReasoningState[] = [
  "solving",
  "working",
  "searching",
  "weaving",
  "composing",
  "breathing",
];

export function pickReasoningState(): ReasoningState {
  return STATES[Math.floor(Math.random() * STATES.length)];
}

export default function ReasoningOrb({
  state,
  paused = false,
  size = 22,
  className = "",
}: {
  state: ReasoningState;
  paused?: boolean;
  size?: number;
  className?: string;
}) {
  const sp = paused ? { animationPlayState: "paused" as const } : undefined;
  return (
    <span
      className={`reasoning-orb reason-${state} ${className}`}
      style={{ width: size, height: size }}
      aria-hidden="true"
    >
      <svg viewBox="0 0 24 24" width={size} height={size} fill="none" aria-hidden="true" style={sp}>
        {state === "solving" && (
          <path
            className="ro-arc"
            d="M12 3.2a8.8 8.8 0 1 1-8.24 5.76"
            stroke="currentColor"
            strokeWidth="2.4"
            strokeLinecap="round"
          />
        )}
        {state === "working" && (
          <>
            <circle className="ro-dot ro-dot-a" cx="12" cy="12" r="2.1" fill="currentColor" />
            <circle className="ro-dot ro-dot-b" cx="12" cy="12" r="1.1" fill="currentColor" opacity="0.55" />
          </>
        )}
        {state === "searching" && (
          <>
            <circle className="ro-ring" cx="12" cy="12" r="8.4" stroke="currentColor" strokeWidth="1.7" opacity="0.4" />
            <circle className="ro-ring-pulse" cx="3.6" cy="12" r="1.7" fill="currentColor" />
          </>
        )}
        {state === "weaving" && (
          <>
            <path className="ro-weave ro-weave-a" d="M7.5 4.6 16.5 19.4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            <path className="ro-weave ro-weave-b" d="M16.5 4.6 7.5 19.4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </>
        )}
        {state === "composing" && (
          <>
            <rect className="ro-bar ro-bar-a" x="5.6" y="13.6" width="3.4" height="6.8" rx="1.7" fill="currentColor" />
            <rect className="ro-bar ro-bar-b" x="10.3" y="10.6" width="3.4" height="9.8" rx="1.7" fill="currentColor" />
            <rect className="ro-bar ro-bar-c" x="15" y="7.6" width="3.4" height="12.8" rx="1.7" fill="currentColor" />
          </>
        )}
        {state === "breathing" && (
          <circle className="ro-breathe" cx="12" cy="12" r="8.4" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
        )}
      </svg>
    </span>
  );
}