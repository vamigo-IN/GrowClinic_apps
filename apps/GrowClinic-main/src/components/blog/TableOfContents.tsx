"use client";

import { useEffect, useState } from "react";

interface TocItem {
  id: string;
  text: string;
  level: number;
}

// Compact, animated table of contents with scroll-spy: the active heading
// highlights and the indicator slides smoothly as you read; clicks smooth-scroll.
export function TableOfContents({ items }: { items: TocItem[] }) {
  const [active, setActive] = useState<string>("");
  const [open, setOpen] = useState(true);

  useEffect(() => {
    const headings = items
      .map((i) => document.getElementById(i.id))
      .filter((el): el is HTMLElement => Boolean(el));
    if (!headings.length) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible[0]) setActive(visible[0].target.id);
      },
      { rootMargin: "-96px 0px -68% 0px", threshold: 0 },
    );
    headings.forEach((h) => observer.observe(h));
    return () => observer.disconnect();
  }, [items]);

  if (items.length < 2) return null;

  const jump = (e: React.MouseEvent, id: string) => {
    e.preventDefault();
    const el = document.getElementById(id);
    if (!el) return;
    el.scrollIntoView({ behavior: "smooth", block: "start" });
    history.replaceState(null, "", `#${id}`);
    setActive(id);
  };

  return (
    <nav
      aria-label="Table of contents"
      className="mb-10 rounded-[15px] border border-slate-200/70 bg-slate-50/70 p-4 sm:p-5"
    >
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 hover:text-slate-600 transition-colors"
      >
        On this page
        <span className={`transition-transform duration-300 ${open ? "rotate-180" : ""}`}>▾</span>
      </button>

      <div
        className="overflow-hidden transition-all duration-300 ease-out"
        style={{ maxHeight: open ? `${items.length * 40 + 16}px` : 0, opacity: open ? 1 : 0 }}
      >
        <ul className="mt-3 list-none p-0 m-0 space-y-0.5 border-l border-slate-200">
          {items.map((h) => {
            const isActive = active === h.id;
            return (
              <li key={h.id}>
                <a
                  href={`#${h.id}`}
                  onClick={(e) => jump(e, h.id)}
                  className={[
                    "block -ml-px border-l-2 py-1 text-[13px] leading-snug transition-all duration-300 ease-out",
                    h.level === 3 ? "pl-6" : "pl-3 font-semibold",
                    isActive
                      ? "border-primary text-primary translate-x-0.5"
                      : "border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300",
                  ].join(" ")}
                >
                  {h.text}
                </a>
              </li>
            );
          })}
        </ul>
      </div>
    </nav>
  );
}
