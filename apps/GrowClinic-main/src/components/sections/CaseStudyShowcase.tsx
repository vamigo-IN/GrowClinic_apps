import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { parseMetrics, CASE_STUDY_CATEGORY_MAP } from "@/lib/case-study-categories";

export interface ShowcaseItem {
    id: string; slug: string; title: string; clientName: string;
    imageUrl?: string | null; results?: string | null; metrics?: string | null;
    serviceKeys?: string[]; clientQuote?: string | null; clientQuoteAuthor?: string | null;
}
export interface ShowcaseSection {
    key: string;
    label: string;
    kicker: string;
    description: string;
    tagline?: string;
    items: ShowcaseItem[];
}

// Soft alternating section backgrounds + watermark stroke colours.
const BG = ["bg-[#eef4ff]", "bg-[#eef7e9]"];
const STROKE = ["rgba(37,99,235,0.16)", "rgba(101,163,13,0.20)"];

function snippet(s: string | null | undefined, n = 220): string {
    if (!s) return "";
    const plain = s.replace(/<[^>]*>?/gm, "").replace(/[#*_>`]/g, "").trim();
    return plain.length > n ? plain.slice(0, n).trimEnd() + "…" : plain;
}

function ImagePanel({ item }: { item: ShowcaseItem }) {
    return (
        <Link href={`/case-studies/${item.slug}`} className="block group">
            {/* Framed "product screenshot" card — soft outer frame + inner rounded media */}
            <div className="rounded-[22px] bg-white p-2.5 md:p-3 shadow-2xl border border-black/5 ring-1 ring-black/[0.03] transition-transform duration-500 group-hover:-translate-y-1">
                <div className="rounded-[16px] overflow-hidden bg-gray-50 aspect-[16/10] flex items-center justify-center">
                    {item.imageUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={item.imageUrl} alt={item.title} className="w-full h-full object-cover object-top" />
                    ) : (
                        <div className="text-center px-8">
                            <div className="text-5xl font-black text-primary/30">{(item.clientName || item.title || "?").charAt(0)}</div>
                            <p className="mt-3 text-sm font-semibold text-gray-500">{item.clientName}</p>
                        </div>
                    )}
                </div>
            </div>
        </Link>
    );
}

function CaseRow({ item, flip }: { item: ShowcaseItem; flip: boolean }) {
    const media = <ImagePanel item={item} />;
    const metrics = parseMetrics(item.metrics).slice(0, 3);
    const serviceLabels = (item.serviceKeys || []).map((k) => CASE_STUDY_CATEGORY_MAP[k]?.label).filter(Boolean);
    const copy = (
        <div className="space-y-4">
            <p className="text-xs font-bold text-primary uppercase tracking-[0.2em]">{item.clientName}</p>
            <h3 className="text-2xl md:text-3xl font-semibold text-gray-900 tracking-tight leading-snug">{item.title}</h3>
            {serviceLabels.length > 0 && (
                <div className="flex flex-wrap gap-2">
                    {serviceLabels.map((label, i) => (
                        <span key={i} className="text-[11px] font-bold text-primary uppercase tracking-wide bg-primary/5 border border-primary/10 rounded-full px-2.5 py-1">{label}</span>
                    ))}
                </div>
            )}
            {metrics.length > 0 && (
                <div className="flex flex-wrap gap-3">
                    {metrics.map((m, i) => (
                        <div key={i} className="rounded-xl bg-white border border-black/5 shadow-sm px-4 py-2.5">
                            <div className="text-xl font-black text-gray-900 leading-none">{m.value}</div>
                            <div className="mt-1 text-[11px] font-semibold text-gray-500">{m.label}</div>
                        </div>
                    ))}
                </div>
            )}
            {metrics.length === 0 && snippet(item.results) && (
                <div className="space-y-1.5">
                    <p className="text-[11px] font-bold text-gray-400 uppercase tracking-[0.2em]">Key results</p>
                    <p className="text-base text-gray-600 font-medium leading-relaxed">{snippet(item.results)}</p>
                </div>
            )}
            {item.clientQuote && (
                <blockquote className="border-l-4 border-primary/30 pl-4 italic text-gray-600 font-medium">
                    “{item.clientQuote}”
                    {item.clientQuoteAuthor && <footer className="mt-1 not-italic text-xs font-bold text-gray-500">— {item.clientQuoteAuthor}</footer>}
                </blockquote>
            )}
            <div className="pt-2">
                <Button href={`/case-studies/${item.slug}`} variant="primary" className="group/btn px-7">
                    View Case Study
                    <svg className="w-4 h-4 ml-2 transition-transform group-hover/btn:translate-x-1" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M17 8l4 4m0 0l-4 4m4-4H3" /></svg>
                </Button>
            </div>
        </div>
    );
    return (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-16 items-center">
            {flip ? (
                <><div className="order-2 lg:order-1">{copy}</div><div className="order-1 lg:order-2">{media}</div></>
            ) : (
                <>{media}{copy}</>
            )}
        </div>
    );
}

export function CaseStudyShowcase({ sections }: { sections: ShowcaseSection[] }) {
    if (!sections.length) return null;
    return (
        <div>
            {sections.map((section, idx) => {
                const bg = BG[idx % BG.length];
                const stroke = STROKE[idx % STROKE.length];
                return (
                    <section key={section.key} id={section.key} className={`${bg} py-20 md:py-28 overflow-hidden scroll-mt-24`}>
                        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                            {/* Service intro */}
                            <div className="relative mb-14 md:mb-16">
                                <span
                                    aria-hidden
                                    className="pointer-events-none select-none absolute -top-12 md:-top-16 left-0 text-[6rem] md:text-[8.5rem] font-black leading-none"
                                    style={{ WebkitTextStroke: `2px ${stroke}`, color: "transparent" }}
                                >
                                    {section.kicker}
                                </span>
                                <div className="relative pt-6 md:pt-10 max-w-3xl space-y-4">
                                    <div className="flex items-center gap-3">
                                        <h2 className="text-4xl md:text-5xl font-semibold text-gray-900 tracking-tight leading-tight">{section.label}</h2>
                                        <span className="mt-1 text-xs font-bold text-primary bg-white/70 border border-primary/10 rounded-full px-2.5 py-1">
                                            {section.items.length} {section.items.length === 1 ? "story" : "stories"}
                                        </span>
                                    </div>
                                    <p className="text-lg text-gray-600 font-medium leading-relaxed">{section.description}</p>
                                    {section.tagline && <p className="text-primary font-semibold italic">{section.tagline}</p>}
                                </div>
                            </div>

                            {/* Case studies, stacked one by one */}
                            <div className="space-y-16 md:space-y-20">
                                {section.items.map((item, i) => (
                                    <CaseRow key={item.id} item={item} flip={i % 2 === 1} />
                                ))}
                            </div>
                        </div>
                    </section>
                );
            })}
        </div>
    );
}
