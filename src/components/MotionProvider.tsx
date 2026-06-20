"use client";

import { MotionConfig } from "motion/react";

/** Honors the OS "reduce motion" setting for all motion animations under it. */
export function MotionProvider({ children }: { children: React.ReactNode }) {
  return <MotionConfig reducedMotion="user">{children}</MotionConfig>;
}
