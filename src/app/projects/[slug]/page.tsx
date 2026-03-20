export const dynamic = "force-dynamic";
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { Button } from "@/components/ui/Button";
import Link from "next/link";
import { Metadata } from "next";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
    const { slug } = await params;
    const project = await prisma.project.findUnique({
        where: { slug: slug },
    });

    if (!project) return { title: "Case Study Not Found" };

    return {
        title: `${project.title} | Medical Case Study`,
        description: `Deep dive into how GrowClinic helped ${project.doctorName} achieve ${project.growth} through our strategic acquisition system.`,
    };
}

export default async function ProjectCaseStudyPage({ params }: { params: Promise<{ slug: string }> }) {
    const { slug } = await params;
    const project = await prisma.project.findUnique({
        where: { slug: slug },
    });

    if (!project || (!project.published)) notFound();

    return (
        <main className="min-h-screen bg-white">

            {/* Hero Header */}
            <section className="pt-32 pb-20 bg-mesh-gradient border-b border-gray-100">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
                        <div className="space-y-8">
                            <Link href="/projects" className="inline-flex items-center gap-2 text-primary font-bold text-sm tracking-widest uppercase hover:opacity-70 transition-opacity">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M10 19l-7-7m0 0l7-7m-7 7h18"></path></svg>
                                Back to Success Stories
                            </Link>

                            <div className="space-y-4">
                                <h1 className="text-4xl md:text-6xl font-black text-gray-900 tracking-tight leading-none">
                                    {project.title}
                                </h1>
                                <p className="text-xl text-gray-600 font-medium">
                                    A collaboration with <span className="text-primary font-bold">{project.doctorName}</span> to transform Patient Acquisition.
                                </p>
                            </div>

                            <div className="grid grid-cols-2 gap-6">
                                <div className="p-6 rounded-2xl bg-white/50 backdrop-blur-md border border-white shadow-xl">
                                    <p className="text-[10px] font-black uppercase text-primary/60 tracking-widest mb-1">Growth Results</p>
                                    <p className="text-3xl font-black text-gray-900">{project.growth}</p>
                                </div>
                                <div className="p-6 rounded-2xl bg-white/50 backdrop-blur-md border border-white shadow-xl">
                                    <p className="text-[10px] font-black uppercase text-primary/60 tracking-widest mb-1">Specialty</p>
                                    <p className="text-3xl font-black text-gray-900">{project.specialty || "N/A"}</p>
                                </div>
                            </div>
                        </div>

                        <div className="relative">
                            <div className="absolute -inset-4 bg-primary/10 rounded-[3rem] blur-3xl opacity-50 animate-pulse"></div>
                            <div className="relative bg-white p-12 rounded-[2.5rem] shadow-2xl border border-black/5 flex flex-col items-center justify-center text-center space-y-6">
                                {project.logoUrl ? (
                                    <img src={project.logoUrl} alt={project.title} className="w-32 h-32 object-contain" />
                                ) : (
                                    <div className="w-32 h-32 rounded-full bg-gray-100 flex items-center justify-center">
                                        <span className="text-4xl font-black text-gray-300">{project.title.charAt(0)}</span>
                                    </div>
                                )}
                                <div>
                                    <p className="text-2xl font-black text-gray-900">{project.title}</p>
                                    {project.website && (
                                        <a href={project.website} target="_blank" rel="noopener noreferrer" className="text-primary font-bold hover:underline">
                                            Visit Website
                                        </a>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Case Study Content */}
            <section className="py-24">
                <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="prose prose-lg prose-blue max-w-none">
                        <div dangerouslySetInnerHTML={{ __html: project.detail.replace(/\n/g, '<br/>') }} className="text-gray-700 font-medium leading-relaxed whitespace-pre-wrap" />
                    </div>

                    <div className="mt-20 p-12 rounded-[2.5rem] bg-gray-900 text-white relative overflow-hidden shadow-2xl">
                        <div className="absolute top-0 right-0 w-64 h-64 bg-primary/20 blur-3xl rounded-full -mr-32 -mt-32"></div>
                        <div className="relative space-y-6">
                            <h2 className="text-3xl font-black">Ready to be our next Success Story?</h2>
                            <p className="text-gray-400 text-lg max-w-xl font-medium">
                                Join dozens of thriving clinics that have transformed their patient acquisition with our 5-step growth system.
                            </p>
                            <div className="flex flex-wrap gap-4 pt-4">
                                <Link href="/#audit">
                                    <Button variant="primary" size="lg" className="px-10">Get Free Clinic Audit</Button>
                                </Link>
                                <Link href="/#book">
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
