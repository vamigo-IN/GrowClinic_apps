"use client";

import React from "react";
import { m, type Variants } from "framer-motion";

type AnimationType = "fadeUp" | "fadeIn" | "fadeLeft" | "scaleIn";

interface AnimatedSectionProps {
  children: React.ReactNode;
  className?: string;
  animation?: AnimationType;
  delay?: number;
  duration?: number;
  as?: "div" | "section";
}

const animations: Record<AnimationType, Variants> = {
  fadeUp: {
    hidden: { opacity: 0, y: 24 },
    visible: { opacity: 1, y: 0 },
  },
  fadeIn: {
    hidden: { opacity: 0 },
    visible: { opacity: 1 },
  },
  fadeLeft: {
    hidden: { opacity: 0, x: -30 },
    visible: { opacity: 1, x: 0 },
  },
  scaleIn: {
    hidden: { opacity: 0, scale: 0.9 },
    visible: { opacity: 1, scale: 1 },
  },
};

export function AnimatedSection({
  children,
  className = "",
  animation = "fadeUp",
  delay = 0,
  duration = 0.5,
  as = "div",
}: AnimatedSectionProps) {
  // Pick the element directly (the `m` proxy exposes m.div / m.section). This
  // avoids a dynamic factory call on every render, which would remount the node.
  const Component = as === "section" ? m.section : m.div;

  return (
    <Component
      variants={animations[animation]}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true }}
      transition={{ duration, delay }}
      className={className}
    >
      {children}
    </Component>
  );
}
