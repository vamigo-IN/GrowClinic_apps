"use client";

import React, { useEffect, useRef, useState } from "react";
import { useInView } from "framer-motion";

interface CountUpProps {
    end: number;
    duration?: number;
    prefix?: string;
    suffix?: string;
    decimals?: number;
    className?: string;
}

// Animated number that counts up when it scrolls into view (easeOutCubic).
export function CountUp({
    end,
    duration = 1800,
    prefix = "",
    suffix = "",
    decimals = 0,
    className = "",
}: CountUpProps) {
    const ref = useRef<HTMLSpanElement>(null);
    const inView = useInView(ref, { once: true, margin: "-40px" });
    // Start at the final value so the server-rendered HTML (and no-JS / crawlers)
    // shows the real number; the client animates from 0 once it scrolls into view.
    const [value, setValue] = useState(end);

    useEffect(() => {
        if (!inView) return;
        let raf = 0;
        const start = performance.now();
        const tick = (now: number) => {
            const p = Math.min((now - start) / duration, 1);
            const eased = 1 - Math.pow(1 - p, 3);
            setValue(end * eased);
            if (p < 1) {
                raf = requestAnimationFrame(tick);
            } else {
                setValue(end);
            }
        };
        raf = requestAnimationFrame(tick);
        return () => cancelAnimationFrame(raf);
    }, [inView, end, duration]);

    const display =
        decimals > 0
            ? value.toFixed(decimals)
            : Math.round(value).toLocaleString("en-IN");

    return (
        <span ref={ref} className={className}>
            {prefix}
            {display}
            {suffix}
        </span>
    );
}

interface ProgressBarProps {
    value: number; // 0-100
    className?: string;
    barClassName?: string;
}

// Animated progress bar that fills when scrolled into view.
export function ProgressBar({ value, className = "", barClassName = "" }: ProgressBarProps) {
    const ref = useRef<HTMLDivElement>(null);
    const inView = useInView(ref, { once: true, margin: "-40px" });

    return (
        <div ref={ref} className={`w-full h-2 rounded-full bg-white/10 overflow-hidden ${className}`}>
            <div
                className={`h-full rounded-full bg-primary-gradient transition-[width] duration-[1600ms] ease-out ${barClassName}`}
                style={{ width: inView ? `${Math.min(100, Math.max(0, value))}%` : "0%" }}
            />
        </div>
    );
}
