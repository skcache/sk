"use client";

import TactileWord from "./TactileWord";
import { useStage } from "./StageProvider";

/**
 * The `music` word in the intro. A hard tactile click opens the shared
 * stage's music island (empty -> compact -> compactLong -> long ->
 * compactLong -> compact -> empty). Clicking again while it is already
 * open is a no-op; the island closes itself.
 */
export default function MusicWord() {
  const { open } = useStage();
  return (
    <TactileWord label="music" onActivate={() => open("music")}>
      music
    </TactileWord>
  );
}