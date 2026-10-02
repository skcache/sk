"use client";

import TactileWord from "./TactileWord";
import { useStage } from "./StageProvider";

/**
 * The `basketball` word is ONLY the trigger: a hard tactile click
 * opens the shared stage, where the ball enters from the left and
 * bounces across. The word itself never animates beyond the shared
 * press. Repeats while the ball runs are ignored by the stage.
 */
export default function BasketballWord() {
  const { open } = useStage();
  return (
    <TactileWord label="basketball" onActivate={() => open("basketball")}>
      <span className="word-anchor">basketball</span>
    </TactileWord>
  );
}