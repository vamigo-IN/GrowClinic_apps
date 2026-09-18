// ISR: render once, then re-render at most every 5 min. Public content
// mutations call revalidatePath (see src/lib/revalidate.ts) to update sooner.
export const revalidate = 300;
import { prisma } from "@/lib/prisma";
import { Metadata } from "next";
import { CASE_STUDY_CATEGORIES, serviceKeysFor } from "@/lib/case-study-categories";
import { CaseStudyShowcase, ShowcaseSection } from "@/components/sections/CaseStudyShowcase";

export const metadata: Metadata = {
    title: "Our Portfolio — Medical Marketing Case Studies",
    description: "See how we've helped clinics scale patient acquisition across Meta Ads, Google Ads, SEO, Google Business Profile and websites — with real, measurable results.",
    alternates: { canonical: "https://www.growclinic.io/case-studies" },
};

export default async function CaseStudiesPage() {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let caseStudies: any[] = [];
    try {
        caseStudies = await prisma.caseStudy.findMany({
            where: { published: true },
            orderBy: { createdAt: "desc" },
            select: {
                id: true, slug: true, title: true, clientName: true, imageUrl: true,
                results: true, metrics: true, category: true, services: true,
                clientQuote: true, clientQuoteAuthor: true,
            },
        });
    } catch (e) {
        console.error("Case studies list query failed:", e);
        caseStudies = [];
    }

    // Attach the resolved service keys to each study, and bucket by service — a
    // study appears under EVERY service it delivered (clients buy bundles).
    const enriched = caseStudies.map((cs) => ({ ...cs, serviceKeys: serviceKeysFor(cs) }));
    const bySvc = new Map<string, any[]>();
    for (const cs of enriched) {
        const keys = cs.serviceKeys.length ? cs.serviceKeys : ["__other"];
        for (const k of keys) {
            if (!bySvc.has(k)) bySvc.set(k, []);
            bySvc.get(k)!.push(cs);
        }
    }

    const sections: ShowcaseSection[] = [
        ...CASE_STUDY_CATEGORIES.filter((c) => bySvc.get(c.key)?.length).map((c) => ({
            key: c.key, label: c.label, kicker: c.kicker, description: c.description, tagline: c.tagline,
            items: bySvc.get(c.key)!,
        })),
        ...(bySvc.get("__other")?.length
            ? [{ key: "__other", label: "Case Studies", kicker: "WORK", description: "Real results for real clinics — see how we've helped medical practices grow their patient acquisition.", tagline: "", items: bySvc.get("__other")! }]
            : []),
    ];

    return (
        <main className="min-h-screen bg-white">
            {/* Header */}
            <section className="pt-28 pb-16 bg-mesh-gradient text-center">
                <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 space-y-4">
                    <p className="text-sm font-black text-primary uppercase tracking-[0.3em]">Our Portfolio</p>
                    <h1 className="text-4xl md:text-6xl font-semibold text-gray-900 tracking-tight">
                        Real Results for <span className="text-gradient">Real Clinics</span>
                    </h1>
                    <p className="text-xl text-gray-600 font-medium">
                        A look at how we engineer patient acquisition across every channel — from paid ads to search, profiles and websites.
                    </p>

                    {sections.length > 1 && (
                        <nav className="flex flex-wrap justify-center gap-2.5 pt-6">
                            {sections.map((s) => (
                                <a
                                    key={s.key}
                                    href={`#${s.key}`}
                                    className="text-sm font-bold text-gray-700 bg-white border border-black/5 shadow-sm rounded-full px-4 py-2 hover:bg-primary hover:text-white transition-colors"
                                >
                                    {s.label}
                                </a>
                            ))}
                        </nav>
                    )}
                </div>
            </section>

            {sections.length === 0 ? (
                <div className="py-24 text-center">
                    <div className="inline-block p-6 rounded-[15px] bg-gray-50 border border-gray-200">
                        <p className="text-gray-500 font-medium italic">Our latest success stories are being documented. Check back soon!</p>
                    </div>
                </div>
            ) : (
                <CaseStudyShowcase sections={sections} />
            )}
        </main>
    );
}
