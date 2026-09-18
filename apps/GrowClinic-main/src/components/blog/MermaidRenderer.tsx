"use client";

import { useEffect } from "react";

// Renders ```mermaid code blocks (inserted via the editor's Flowchart button)
// as actual diagrams. Loads mermaid from CDN only when the post contains one,
// so regular posts pay zero JS cost.
declare global {
  interface Window {
    mermaid?: {
      initialize: (config: Record<string, unknown>) => void;
      run: (opts: { nodes: HTMLElement[] }) => Promise<void>;
    };
    __mermaidLoading?: Promise<void>;
  }
}

function loadMermaid(): Promise<void> {
  if (window.mermaid) return Promise.resolve();
  if (window.__mermaidLoading) return window.__mermaidLoading;
  window.__mermaidLoading = new Promise((resolve, reject) => {
    const s = document.createElement("script");
    s.src = "https://cdn.jsdelivr.net/npm/mermaid@11/dist/mermaid.min.js";
    s.async = true;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error("mermaid failed to load"));
    document.head.appendChild(s);
  });
  return window.__mermaidLoading;
}

export function MermaidRenderer() {
  useEffect(() => {
    const blocks = Array.from(
      document.querySelectorAll<HTMLElement>("pre > code.language-mermaid")
    );
    if (blocks.length === 0) return;

    let cancelled = false;
    loadMermaid()
      .then(() => {
        if (cancelled || !window.mermaid) return;
        window.mermaid.initialize({
          startOnLoad: false,
          theme: "neutral",
          securityLevel: "strict",
        });
        const nodes: HTMLElement[] = [];
        for (const code of blocks) {
          const pre = code.parentElement;
          if (!pre) continue;
          const div = document.createElement("div");
          div.className = "mermaid my-8 flex justify-center overflow-x-auto";
          div.textContent = code.textContent || "";
          pre.replaceWith(div);
          nodes.push(div);
        }
        return window.mermaid.run({ nodes });
      })
      .catch((err) => console.error("Mermaid render failed:", err));

    return () => {
      cancelled = true;
    };
  }, []);

  return null;
}
