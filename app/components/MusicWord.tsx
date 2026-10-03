"use client";

import TactileWord from "./TactileWord";
import { useStage } from "./StageProvider";

/**
 * The `music` word: ONLY the trigger. The island measures the word's
 * own box when it mounts and a VISIBLE seed is born from that exact
 * position - there is no invisible anchor and no shared projection ID.
 * The visible object the user pressed is the object that travels.
 */
export default function MusicWord() {
  const { open } = useStage();
  return (
    <TactileWord label="music" onActivate={() => open("music")}>
      <span className="music-word">music</span>
    </TactileWord>
  );
}