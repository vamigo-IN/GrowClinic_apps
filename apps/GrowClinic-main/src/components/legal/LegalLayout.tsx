import React from "react";
import { SectionHeading } from "@/components/ui/SectionHeading";

export interface TocItem {
    id: string;
    title: string;
}

interface LegalLayoutProps {
    title: string;
    highlight?: string;
    lastUpdated: string;
    intro?: React.ReactNode;
    toc?: TocItem[];
    children: React.ReactNode;
}

export function LegalLayout({ title, highlight, lastUpdated, intro, toc, children }: LegalLayoutProps) {
    return (
        <main className="pt-32 pb-24 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-primary/5 rounded-full blur-[120px] pointer-events-none -mr-64 -mt-32 opacity-50" />
            <div className="max-w-4xl mx-auto relative z-10">
                <SectionHeading title={title} highlight={highlight} centered={false} level="h1" />

                <div className="-mt-10 mb-10">
                    <span className="inline-block text-size-tiny text-weight-bold uppercase tracking-[0.2em] text-slate-400 bg-slate-50 border border-slate-100 rounded-full px-4 py-2">
                        Effective Date: {lastUpdated}
                    </span>
                </div>

                {intro && (
                    <div className="text-lg text-slate-600 font-medium leading-relaxed space-y-4 mb-12">
                        {intro}
                    </div>
                )}

                {toc && toc.length > 0 && (
                    <nav
                        aria-label="Table of contents"
                        className="bg-white/70 backdrop-blur-sm border border-slate-100 rounded-[15px] p-8 mb-14 shadow-sm"
                    >
                        <h2 className="text-size-tiny text-weight-bold uppercase tracking-[0.3em] text-slate-400 mb-6">
                            On This Page
                        </h2>
                        <ol className="grid sm:grid-cols-2 gap-x-8 gap-y-3 list-none m-0 p-0">
                            {toc.map((item, i) => (
                                <li key={item.id} className="flex gap-3 items-baseline">
                                    <span className="text-primary font-black text-xs shrink-0 w-5">{i + 1}.</span>
                                    <a
                                        href={`#${item.id}`}
                                        className="text-slate-600 hover:text-primary font-bold text-sm transition-colors"
                                    >
                                        {item.title}
                                    </a>
                                </li>
                            ))}
                        </ol>
                    </nav>
                )}

                <article className="space-y-2">{children}</article>
            </div>
        </main>
    );
}

export function LegalSection({
    id,
    number,
    title,
    children,
}: {
    id: string;
    number: number;
    title: string;
    children: React.ReactNode;
}) {
    return (
        <section id={id} className="scroll-mt-28 pt-8">
            <h2 className="text-xl md:text-2xl font-black text-slate-900 mb-5 tracking-tight">
                <span className="text-primary">{number}.</span> {title}
            </h2>
            <div className="space-y-4 text-slate-600 font-medium leading-relaxed text-[15px] md:text-base">
                {children}
            </div>
        </section>
    );
}

export function LegalList({ items }: { items: React.ReactNode[] }) {
    return (
        <ul className="space-y-3 my-2">
            {items.map((item, i) => (
                <li key={i} className="flex gap-3">
                    <span className="mt-2 w-1.5 h-1.5 rounded-full bg-primary shrink-0" />
                    <span>{item}</span>
                </li>
            ))}
        </ul>
    );
}

export function LegalTable({
    headers,
    rows,
}: {
    headers: string[];
    rows: React.ReactNode[][];
}) {
    return (
        <div className="overflow-x-auto my-4 rounded-[15px] border border-slate-100">
            <table className="w-full text-left text-sm border-collapse">
                <thead>
                    <tr className="bg-slate-50">
                        {headers.map((h, i) => (
                            <th
                                key={i}
                                className="px-5 py-4 font-black text-slate-700 text-[11px] uppercase tracking-wider border-b border-slate-100"
                            >
                                {h}
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody>
                    {rows.map((row, ri) => (
                        <tr key={ri} className="align-top">
                            {row.map((cell, ci) => (
                                <td
                                    key={ci}
                                    className="px-5 py-4 text-slate-600 font-medium border-b border-slate-50 leading-relaxed"
                                >
                                    {cell}
                                </td>
                            ))}
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}
