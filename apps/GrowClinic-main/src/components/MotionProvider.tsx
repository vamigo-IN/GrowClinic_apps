"use client";

import { LazyMotion, domAnimation } from "framer-motion";

/**
 * Loads framer-motion's animation features lazily and shares them with every
 * `m.*` component in the tree. This keeps the heavy motion feature bundle out
 * of the initial JS and only fetches it when animations actually run.
 *
 * All animated components must use the lightweight `m` import (not `motion`),
 * otherwise the full feature bundle is pulled back in and the saving is lost.
 * We use `domAnimation` (animations + hover/tap/focus/inView gestures) rather
 * than `domMax` because the site uses no drag or layout animations.
 */
export function MotionProvider({ children }: { children: React.ReactNode }) {
  return <LazyMotion features={domAnimation}>{children}</LazyMotion>;
}
