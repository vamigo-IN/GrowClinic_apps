"use client";

import React from "react";
import { Building2 } from "lucide-react";

interface ClientItem {
    name: string;
    logoUrl?: string | null;
    website?: string | null;
}

export function ClientMarquee({ clients }: { clients: ClientItem[] }) {
    const items = clients.length > 0
        ? clients
        : Array.from({ length: 6 }).map((_, i) => ({ name: `Client ${i + 1}`, logoUrl: null }));

    // Duplicate the set so the -50% scroll loops seamlessly.
    const loop = [...items, ...items];

    return (
        <div className="marquee-track relative overflow-hidden py-2">
            {/* Edge fades */}
            <div className="pointer-events-none absolute left-0 top-0 bottom-0 w-20 sm:w-32 bg-gradient-to-r from-slate-50 to-transparent z-10" />
            <div className="pointer-events-none absolute right-0 top-0 bottom-0 w-20 sm:w-32 bg-gradient-to-l from-slate-50 to-transparent z-10" />

            <div className="flex w-max animate-marquee gap-10 sm:gap-14">
                {loop.map((c, i) => (
                    <div key={i} className="shrink-0 flex items-center justify-center h-20 w-44">
                        {c.logoUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                                src={c.logoUrl}
                                alt={c.name}
                                className="max-h-12 max-w-[150px] object-contain grayscale opacity-60 hover:grayscale-0 hover:opacity-100 transition-all duration-500"
                            />
                        ) : (
                            <div className="h-16 w-max px-5 rounded-[15px] bg-white border border-slate-200 shadow-sm flex items-center justify-center gap-2.5 hover:border-primary/30 hover:shadow-primary/10 hover:shadow-md transition-all duration-500 whitespace-nowrap">
                                <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                                    <Building2 className="w-3.5 h-3.5 text-primary" />
                                </div>
                                <span className="text-sm font-bold text-slate-600 tracking-tight">{c.name}</span>
                            </div>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
}
