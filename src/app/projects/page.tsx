export const dynamic = "force-dynamic";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import Image from "next/image";
import { Metadata } from "next";

export const metadata: Metadata = {
    title: "Medical Case Studies & Success Stories",
    description: "See how we've helped clinics scale their patient acquisition and digital presence through data-backed growth systems.",
};

export default async function ProjectsPage() {
    const projects = await prisma.project.findMany({
        where: { published: true },
        orderBy: { createdAt: "desc" }
    });

    return (
        <main className="min-h-screen pt-24 pb-20 bg-mesh-gradient">

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="text-center mb-16 space-y-4">
                    <h1 className="text-4xl md:text-5xl font-black text-gray-900 tracking-tight">
                        Our <span className="text-gradient">Success Stories</span>
                    </h1>
                    <p className="text-xl text-gray-600 max-w-2xl mx-auto font-medium">
                        Real results for medical practices. See how we've helped clinics scale their patient acquisition and digital presence.
                    </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {projects.map((project) => (
                        <Link
                            key={project.id}
                            href={`/projects/${project.slug}`}
                            className="group bg-white rounded-3xl shadow-sm border border-black/5 overflow-hidden transition-all duration-500 hover:shadow-2xl hover:-translate-y-2"
                        >
                            <div className="p-8 space-y-6">
                                <div className="flex items-center justify-between">
                                    <div className="w-14 h-14 rounded-2xl bg-primary/5 flex items-center justify-center border border-primary/10 transition-transform duration-500 group-hover:scale-110">
                                        {project.logoUrl ? (
                                            <img src={project.logoUrl} alt="" className="w-10 h-10 rounded-lg object-contain" />
                                        ) : (
                                            <div className="w-8 h-8 rounded-full bg-primary/20 animate-pulse"></div>
                                        )}
                                    </div>
                                    <span className="text-xs font-bold text-primary uppercase tracking-widest px-3 py-1 bg-primary/5 rounded-full border border-primary/10">
                                        {project.specialty || "Case Study"}
                                    </span>
                                </div>

                                <div className="space-y-2">
                                    <h3 className="text-2xl font-bold text-gray-900 leading-tight group-hover:text-primary transition-colors">
                                        {project.title}
                                    </h3>
                                    <p className="text-gray-500 text-sm font-medium">With {project.doctorName}</p>
                                </div>

                                <div className="pt-6 border-t border-gray-100">
                                    <div className="flex flex-col gap-1">
                                        <span className="text-[10px] font-black uppercase tracking-widest text-primary/60">ACHIEVEMENT</span>
                                        <span className="text-xl font-black text-gray-900 group-hover:text-primary transition-colors">
                                            {project.growth}
                                        </span>
                                    </div>
                                </div>

                                <div className="flex items-center gap-2 text-primary font-bold text-sm">
                                    View Full Case Study
                                    <svg className="w-4 h-4 transition-transform duration-300 group-hover:translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M17 8l4 4m0 0l-4 4m4-4H3"></path>
                                    </svg>
                                </div>
                            </div>
                        </Link>
                    ))}

                    {projects.length === 0 && (
                        <div className="col-span-full py-20 text-center">
                            <div className="inline-block p-6 rounded-3xl bg-gray-50 border border-gray-200">
                                <p className="text-gray-500 font-medium italic">Our latest success stories are being documented. Check back soon!</p>
                            </div>
                        </div>
                    )}
                </div>
            </div>

        </main>
    );
}
