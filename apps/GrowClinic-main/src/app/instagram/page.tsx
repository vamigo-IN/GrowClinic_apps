import React from "react";
import type { Metadata } from "next";
import { Instagram, ArrowUpRight } from "lucide-react";

/* ------------------------------------------------------------------ */
/*  Config                                                             */
/* ------------------------------------------------------------------ */
const INSTAGRAM_HANDLE = "growclinic.io";
const INSTAGRAM_URL = "https://www.instagram.com/growclinic.io";

/**
 * Free, no-API Instagram feed embed.
 *
 * Paste the iframe `src` from a free widget here to show your LIVE feed:
 *   • LightWidget  → lightwidget.com (free)  → copy the src="https://cdn.lightwidget.com/widgets/xxxx.html"
 *   • SnapWidget   → snapwidget.com  (free)  → copy the iframe src
 *   • Behold       → behold.so       (free)
 * Leave empty to show the branded follow grid below.
 */
const INSTAGRAM_WIDGET_SRC = "";

export const metadata: Metadata = {
    title: "GrowClinic on Instagram | Healthcare Marketing",
    description:
        "Follow GrowClinic on Instagram for healthcare marketing tips, clinic growth wins, and behind-the-scenes of how we get doctors and clinics more patients.",
    alternates: { canonical: "https://www.growclinic.io/instagram" },
};

export default function InstagramPage() {
    return (
        <main className="bg-white">
            {/* Header */}
            <section className="relative overflow-hidden border-b border-slate-100 bg-mesh-gradient">
                <div className="mx-auto max-w-3xl px-4 py-20 text-center sm:px-6 lg:px-8">
                    <span className="inline-flex h-16 w-16 items-center justify-center rounded-[15px] bg-gradient-to-br from-[#feda75] via-[#d62976] to-[#4f5bd5] text-white shadow-lg">
                        <Instagram className="h-8 w-8" />
                    </span>
                    <h1 className="heading-style-h2 mt-6 text-slate-900">
                        @{INSTAGRAM_HANDLE}
                    </h1>
                    <p className="mx-auto mt-4 max-w-xl text-lg font-medium text-slate-600">
                        Clinic growth wins, healthcare marketing tips, and the systems we use to get doctors and
                        clinics more patients. Follow along.
                    </p>
                    <a
                        href={INSTAGRAM_URL}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-8 inline-flex items-center gap-2.5 rounded-[15px] bg-gradient-to-br from-[#feda75] via-[#d62976] to-[#4f5bd5] px-8 py-4 text-lg font-extrabold text-white shadow-lg transition-transform hover:-translate-y-0.5"
                    >
                        <Instagram className="h-5 w-5" />
                        Follow on Instagram
                    </a>
                </div>
            </section>

            {/* Feed */}
            <section className="py-16">
                <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
                    {INSTAGRAM_WIDGET_SRC ? (
                        <iframe
                            src={INSTAGRAM_WIDGET_SRC}
                            title="GrowClinic Instagram feed"
                            scrolling="no"
                            allowTransparency
                            className="w-full rounded-[15px] border border-slate-100"
                            style={{ minHeight: 640, border: 0, overflow: "hidden" }}
                        />
                    ) : (
                        <div className="rounded-[15px] border border-slate-100 bg-slate-50 p-10 text-center">
                            <div className="grid grid-cols-3 gap-3 sm:gap-4">
                                {[...Array(6)].map((_, i) => (
                                    <a
                                        key={i}
                                        href={INSTAGRAM_URL}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="group relative aspect-square overflow-hidden rounded-[15px] bg-gradient-to-br from-slate-100 to-slate-200 ring-1 ring-black/5"
                                    >
                                        <span className="absolute inset-0 flex items-center justify-center text-slate-300 transition-colors group-hover:text-primary">
                                            <Instagram className="h-7 w-7" />
                                        </span>
                                        <span className="absolute right-2 top-2 text-slate-300 opacity-0 transition-opacity group-hover:opacity-100">
                                            <ArrowUpRight className="h-4 w-4" />
                                        </span>
                                    </a>
                                ))}
                            </div>
                            <p className="mx-auto mt-8 max-w-md text-sm font-medium text-slate-500">
                                See the latest posts, reels and clinic results straight on Instagram.
                            </p>
                            <a
                                href={INSTAGRAM_URL}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="mt-5 inline-flex items-center gap-2 rounded-xl bg-primary px-6 py-3 font-bold text-white transition-transform hover:-translate-y-0.5"
                            >
                                View @{INSTAGRAM_HANDLE} <ArrowUpRight className="h-4 w-4" />
                            </a>
                        </div>
                    )}
                </div>
            </section>
        </main>
    );
}
