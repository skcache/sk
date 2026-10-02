"use client";

// Adapted from Cult UI's open-source DynamicIsland (MIT license,
// https://www.cult-ui.com/docs/components/dynamic-island). The live
// registry is unreachable (Vercel DEPLOYMENT_NOT_FOUND), so the source
// is copied faithfully per the repair brief: provider context + size
// presets + motion shell + scheduleAnimation queue.

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ComponentProps,
  type PropsWithChildren,
} from "react";
import { motion, useReducedMotion } from "motion/react";

export type DynamicIslandSize = {
  width: number;
  height: number;
  borderRadius: number;
};
export type DynamicIslandPreset = "default" | "compact" | "compactLong" | "long";

export const DYNAMIC_ISLAND_SIZES: Record<DynamicIslandPreset, DynamicIslandSize> = {
  default: { width: 0, height: 0, borderRadius: 0 },
  compact: { width: 150, height: 36, borderRadius: 20 },
  compactLong: { width: 190, height: 36, borderRadius: 20 },
  long: { width: 260, height: 56, borderRadius: 22 },
};

type DynamicIslandContextValue = {
  size: DynamicIslandSize;
  setSize: (size: DynamicIslandSize) => void;
};

const DynamicIslandContext = createContext<DynamicIslandContextValue | null>(null);

export function useDynamicIsland() {
  const ctx = useContext(DynamicIslandContext);
  if (!ctx) throw new Error("useDynamicIsland must be used within DynamicIslandProvider");
  return ctx;
}

/** The Cult UI animation queue: schedule the next island step. */
export function scheduleAnimation(delayMs: number, fn: () => void) {
  return window.setTimeout(fn, delayMs);
}

export function DynamicIslandProvider({ children }: PropsWithChildren) {
  const [size, setSize] = useState<DynamicIslandSize>(DYNAMIC_ISLAND_SIZES.default);
  const value = useMemo(() => ({ size, setSize }), [size, setSize]);
  return <DynamicIslandContext.Provider value={value}>{children}</DynamicIslandContext.Provider>;
}

export function DynamicIsland({
  children,
  className = "",
  exit,
  ...rest
}: PropsWithChildren<{ className?: string; exit?: ComponentProps<typeof motion.div>["exit"] }> &
  Omit<
    ComponentProps<typeof motion.div>,
    "children" | "className" | "exit" | "animate" | "initial" | "transition" | "variants"
  >) {
  const { size } = useDynamicIsland();
  const reduceMotion = useReducedMotion();
  return (
    <motion.div
      className={`dynamic-island ${className}`}
      initial={false}
      animate={{ width: size.width, height: size.height, borderRadius: size.borderRadius }}
      transition={
        reduceMotion
          ? { duration: 0.01 }
          : { type: "spring", stiffness: 260, damping: 26, mass: 1 }
      }
      exit={exit}
      {...rest}
    >
      {children}
    </motion.div>
  );
}

export function DynamicContainer({
  children,
  className = "",
}: PropsWithChildren<{ className?: string }>) {
  return <div className={`dynamic-island-container ${className}`}>{children}</div>;
}

export function DynamicTitle({ children, className = "" }: PropsWithChildren<{ className?: string }>) {
  return <span className={`dynamic-island-title ${className}`}>{children}</span>;
}

export function DynamicDescription({
  children,
  className = "",
}: PropsWithChildren<{ className?: string }>) {
  return <span className={`dynamic-island-description ${className}`}>{children}</span>;
}

/** Claim a size preset: the shell springs to it while mounted. */
export function useDynamicIslandSize(preset: DynamicIslandPreset) {
  const { setSize } = useDynamicIsland();
  useEffect(() => {
    setSize(DYNAMIC_ISLAND_SIZES[preset]);
  }, [preset, setSize]);
}