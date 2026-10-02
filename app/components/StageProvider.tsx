"use client";

import { createContext, useContext, useState, type ReactNode } from "react";
import InteractionStage, { type StageAction } from "./InteractionStage";

const StageContext = createContext<{
  open: (a: StageAction) => void;
  active: StageAction | null;
} | null>(null);

/**
 * Single stage pointer for the whole page. Intro words request the
 * stage through useStage().open(); the InteractionStage renders below
 * the intro. One provider, one active egg at a time; opening the
 * action that is already active is a no-op (repeat clicks are
 * ignored while a toy runs).
 */
export default function StageProvider({ children }: { children: ReactNode }) {
  const [active, setActive] = useState<StageAction | null>(null);

  return (
    <StageContext.Provider
      value={{
        open: (a) => setActive((prev) => (prev === a ? prev : a)),
        active,
      }}
    >
      {children}
      <InteractionStage active={active} onDone={() => setActive(null)} />
    </StageContext.Provider>
  );
}

export function useStage() {
  const ctx = useContext(StageContext);
  if (!ctx) throw new Error("useStage must be used inside StageProvider");
  return ctx;
}