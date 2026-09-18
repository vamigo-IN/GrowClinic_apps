"use client";

import { useEffect, useState } from "react";
import { Sun, Moon } from "lucide-react";

// Toggles the `.light` class on the admin root (`.admin`) and persists the
// choice. Default is dark; an inline script in the layout applies the saved
// preference before paint to avoid a flash.
export function ThemeToggle() {
    const [light, setLight] = useState(false);

    useEffect(() => {
        const root = document.querySelector(".admin");
        setLight(!!root?.classList.contains("light"));
    }, []);

    const toggle = () => {
        const root = document.querySelector(".admin");
        if (!root) return;
        const next = !root.classList.contains("light");
        root.classList.toggle("light", next);
        try {
            localStorage.setItem("admin-theme", next ? "light" : "dark");
        } catch {
            /* ignore */
        }
        setLight(next);
    };

    return (
        <button
            onClick={toggle}
            aria-label="Toggle light/dark mode"
            title={light ? "Switch to dark" : "Switch to light"}
            className="flex h-8 w-8 items-center justify-center rounded-md border border-[var(--a-border)] text-[var(--a-muted)] hover:text-[var(--a-accent)] hover:border-[var(--a-accent)] transition-colors"
        >
            {light ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
        </button>
    );
}
