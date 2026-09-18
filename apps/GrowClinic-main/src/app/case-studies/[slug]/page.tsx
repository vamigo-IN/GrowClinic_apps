// ISR: render once, then re-render at most every 5 min. Public content
// mutations call revalidatePath (see src/lib/revalidate.ts) to update sooner.
export const revalidate = 300;
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { Button } from "@/components/ui/Button";
import Link from "next/link";
import { Metadata } from "next";
import { CASE_STUDY_CATEGORY_MAP, parseMetrics, serviceKeysFor } from "@/lib/case-study-categories";
import { jsonLdString } from "@/lib/html";

const SITE = "https://www.growclinic.io";

function plain(s: string | null | undefined, n = 160): string {
    if (!s) return "";
    const t = s.replace(/<[^>]*>?/gm, "").replace(/[#*_>`]/g, "").replace(/\s+/g, " ").trim();
    return t.length > n ? t.slice(0, n).trimEnd() + "…" : t;
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
    const { slug } = await params;
    const cs = await prisma.caseStudy.findUnique({ where: { slug } });
    if (!cs || !cs.published) return { title: "Case Study Not Found" };

    const svcLabels = serviceKeysFor(cs).map((k) => CASE_STUDY_CATEGORY_MAP[k]?.label).filter(Boolean);
    const where = cs.location ? ` in ${cs.location}` : "";
    const title = `${cs.title} | GrowClinic Case Study`;
    const description = cs.metaDescription
        || plain(cs.results)
        || `How GrowClinic helped ${cs.clientName}${where} grow patient acquisition${svcLabels.length ? ` with ${svcLabels.join(", ")}` : ""}.`;
    const img = cs.imageUrl || `${SITE}/images/og-image.jpg`;

    return {
        title,
        description,
        keywords: cs.focusKeyword ? [cs.focusKeyword] : undefined,
        alternates: { canonical: `${SITE}/case-studies/${slug}` },
        openGraph: { title, description, url: `${SITE}/case-studies/${slug}`, type: "article", images: [{ url: img }] },
        twitter: { card: "summary_large_image", title, description, images: [img] },
    };
}

function toHtml(s: string | null | undefined): string {
    return (s || "").replace(/\n/g, "<br/>");
}

export default async function CaseStudyDetailPage({ params }: { params: Promise<{ slug: string }> }) {
    const { slug } = await params;
    let cs: Awaited<ReturnType<typeof prisma.caseStudy.findUnique>> = null;
    try {
        cs = await prisma.caseStudy.findUnique({ where: { slug } });
    } catch (e) {
        console.error("Case study detail query failed:", e);
    }

    if (!cs || !cs.published) notFound();

    const serviceLabels = serviceKeysFor(cs).map((k) => CASE_STUDY_CATEGORY_MAP[k]?.label).filter(Boolean);
    const metrics = parseMetrics(cs.metrics);
    const summary = cs.metaDescription || plain(cs.results, 200);

    const blocks = [
        { label: "The Challenge", body: cs.challenge },
        { label: "Our Solution", body: cs.solution },
        { label: "The Results", body: cs.results },
    ].filter((b) => b.body && b.body.trim());

    // Structured data — Article for rich results + AEO, plus breadcrumbs.
    const jsonLd = {
        "@context": "https://schema.org",
        "@type": "Article",
        headline: cs.title,
        description: summary,
        image: cs.imageUrl ? [cs.imageUrl] : [`${SITE}/images/og-image.jpg`],
        datePublished: cs.createdAt.toISOString(),
        dateModified: cs.updatedAt.toISOString(),
        author: { "@type": "Organization", name: "GrowClinic", url: SITE },
        publisher: { "@type": "Organization", name: "GrowClinic", logo: { "@type": "ImageObject", url: `${SITE}/images/logo.png` } },
        mainEntityOfPage: { "@type": "WebPage", "@id": `${SITE}/case-studies/${slug}` },
        about: [...serviceLabels, cs.specialty, cs.location].filter(Boolean).join(", ") || undefined,
        keywords: cs.focusKeyword || undefined,
    };
    const breadcrumbLd = {
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        itemListElement: [
            { "@type": "ListItem", position: 1, name: "Home", item: SITE },
            { "@type": "ListItem", position: 2, name: "Case Studies", item: `${SITE}/case-studies` },
            { "@type": "ListItem", position: 3, name: cs.title, item: `${SITE}/case-studies/${slug}` },
        ],
    };

    return (
        <main className="min-h-screen bg-white">
            <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdString(jsonLd) }} />
            <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdString(breadcrumbLd) }} />

            {/* Hero Header */}
            <section className="pt-32 pb-20 bg-mesh-gradient border-b border-gray-100">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
                        <div className="space-y-8">
                            <Link href="/case-studies" className="inline-flex items-center gap-2 text-primary font-bold text-sm tracking-widest uppercase hover:opacity-70 transition-opacity">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M10 19l-7-7m0 0l7-7m-7 7h18"></path></svg>
                                Back to Case Studies
                            </Link>

                            <div className="space-y-4">
                                <div className="flex flex-wrap items-center gap-2">
                                    {serviceLabels.map((label, idx) => (
                                        <span key={idx} className="inline-block text-xs font-bold text-primary uppercase tracking-[0.2em] bg-primary/5 border border-primary/10 rounded-full px-3 py-1">{label}</span>
                                    ))}
                                    {cs.specialty && (
                                        <span className="inline-block text-xs font-bold text-gray-500 uppercase tracking-[0.2em] bg-white border border-black/5 rounded-full px-3 py-1">{cs.specialty}</span>
                                    )}
                                    {cs.location && (
                                        <span className="inline-block text-xs font-bold text-gray-500 uppercase tracking-[0.2em] bg-white border border-black/5 rounded-full px-3 py-1">{cs.location}</span>
                                    )}
                                </div>
                                <h1 className="text-4xl md:text-6xl font-bold text-gray-900 tracking-tight leading-none">
                                    {cs.title}
                                </h1>
                                <p className="text-xl text-gray-600 font-medium">
                                    A collaboration with <span className="text-primary font-bold">{cs.clientName}</span> to transform patient acquisition.
                                </p>
                            </div>
                        </div>

                        <div className="relative">
                            <div className="absolute -inset-4 bg-primary/10 rounded-[15px] blur-3xl opacity-50 animate-pulse"></div>
                            <div className="relative bg-white p-6 md:p-8 rounded-[15px] shadow-2xl border border-black/5">
                                {cs.imageUrl ? (
                                    // eslint-disable-next-line @next/next/no-img-element
                                    <img src={cs.imageUrl} alt={cs.title} className="w-full rounded-lg" />
                                ) : (
                                    <div className="flex flex-col items-center justify-center text-center py-12 space-y-4">
                                        <div className="w-32 h-32 rounded-full bg-gray-100 flex items-center justify-center">
                                            <span className="text-4xl font-semibold text-gray-300">{cs.clientName.charAt(0)}</span>
                                        </div>
                                        <p className="text-2xl font-black text-gray-900">{cs.clientName}</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* AEO summary — concise answer for search + AI engines */}
            {summary && (
                <section className="border-b border-gray-100 bg-white">
                    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                        <p className="text-lg text-gray-700 font-medium leading-relaxed">
                            <span className="font-bold text-gray-900">Summary: </span>{summary}
                        </p>
                    </div>
                </section>
            )}

            {/* Metrics band — data-driven headline stats */}
            {metrics.length > 0 && (
                <section className="bg-gray-50 border-b border-gray-100">
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14">
                        <div className={`grid gap-6 grid-cols-2 ${metrics.length === 1 ? "md:grid-cols-1" : metrics.length === 2 ? "md:grid-cols-2" : metrics.length === 3 ? "md:grid-cols-3" : "md:grid-cols-4"}`}>
                            {metrics.map((m, i) => (
                                <div key={i} className="text-center p-6 rounded-[15px] bg-white border border-black/5 shadow-sm">
                                    <div className="text-3xl md:text-4xl font-black text-gray-900">{m.value}</div>
                                    <div className="mt-2 text-sm text-gray-500 font-semibold">{m.label}</div>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>
            )}

            {/* Client quote — social proof */}
            {cs.clientQuote && (
                <section className="bg-white">
                    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
                        <figure className="relative rounded-[18px] bg-primary/5 border border-primary/10 p-10 md:p-12">
                            <div className="text-6xl leading-none text-primary/20 font-serif absolute top-4 left-6">&ldquo;</div>
                            <blockquote className="relative text-xl md:text-2xl font-semibold text-gray-800 leading-relaxed">
                                {cs.clientQuote}
                            </blockquote>
                            {cs.clientQuoteAuthor && (
                                <figcaption className="mt-5 text-sm font-bold text-primary uppercase tracking-wide">— {cs.clientQuoteAuthor}</figcaption>
                            )}
                        </figure>
                    </div>
                </section>
            )}

            {/* Case Study Content */}
            <section className="py-24">
                <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-14">
                    {blocks.map((b) => (
                        <div key={b.label} className="space-y-4">
                            <h2 className="text-sm font-black text-primary uppercase tracking-[0.3em]">{b.label}</h2>
                            <div
                                className="prose prose-lg prose-blue max-w-none text-gray-700 font-medium leading-relaxed"
                                dangerouslySetInnerHTML={{ __html: toHtml(b.body) }}
                            />
                        </div>
                    ))}

                    {/* CTA — centered */}
                    <div className="mt-20 p-12 rounded-[15px] bg-gray-900 text-white relative overflow-hidden shadow-2xl text-center">
                        <div className="absolute top-0 right-0 w-64 h-64 bg-primary/20 blur-3xl rounded-full -mr-32 -mt-32"></div>
                        <div className="relative flex flex-col items-center space-y-6">
                            <h2 className="text-3xl font-semibold">Ready to be our next success story?</h2>
                            <p className="text-gray-400 text-lg max-w-xl font-medium">
                                Join dozens of thriving clinics that have transformed their patient acquisition with our growth system.
                            </p>
                            <div className="flex flex-wrap gap-4 pt-2 justify-center">
                                <Link href="https://audit.growclinic.io">
                                    <Button variant="primary" size="lg" className="px-10">Audit Your Clinic</Button>
                                </Link>
                                <Link href="/contact">
                                    <Button variant="outline" size="lg" className="px-10 bg-white/10 border-white/20 text-white hover:bg-white hover:text-black">Book Strategy Call</Button>
                                </Link>
                            </div>
                        </div>
                    </div>
                </div>
            </section>
        </main>
    );
}
