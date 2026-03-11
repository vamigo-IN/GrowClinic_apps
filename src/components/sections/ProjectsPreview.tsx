import React from "react";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { Button } from "../ui/Button";

export async function ProjectsPreview() {
    const featuredProjects = await prisma.project.findMany({
        where: { published: true },
        take: 3,
        orderBy: { createdAt: "desc" }
    });

    if (featuredProjects.length === 0) return null;

    return (
        <section className="py-24 bg-white overflow-hidden" id="portfolio">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex flex-col md:flex-row justify-between items-end mb-16 gap-6">
                    <div className="max-w-2xl space-y-4">
                        <h2 className="text-sm font-black text-primary uppercase tracking-[0.3em]">Case Studies</h2>
                        <h3 className="text-4xl md:text-5xl font-black text-gray-900 tracking-tight leading-tight">
                            Real Results for <span className="text-gradient">Real Clinics</span>
                        </h3>
                        <p className="text-lg text-gray-500 font-medium">
                            Explore how we've helped medical practices transform their digital presence and skyrocket their patient acquisition.
                        </p>
                    </div>
                    <Link href="/projects">
                        <Button variant="outline" className="group">
                            View All Case Studies
                            <svg className="w-4 h-4 ml-2 transition-transform group-hover:translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M17 8l4 4m0 0l-4 4m4-4H3"></path>
                            </svg>
                        </Button>
                    </Link>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    {featuredProjects.map((project) => (
                        <Link 
                            key={project.id} 
                            href={`/projects/${project.slug}`}
                            className="group relative bg-white rounded-[2.5rem] border border-black/5 p-8 shadow-sm transition-all duration-500 hover:shadow-2xl hover:-translate-y-2 overflow-hidden"
                        >
                            <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 blur-3xl rounded-full -mr-16 -mt-16 group-hover:bg-primary/10 transition-colors"></div>
                            
                            <div className="relative space-y-6">
                                <div className="flex items-center justify-between">
                                    <div className="w-12 h-12 rounded-2xl bg-white border border-black/5 shadow-sm p-2 group-hover:scale-110 transition-transform duration-500">
                                        {project.logoUrl ? (
                                            <img src={project.logoUrl} alt="" className="w-full h-full object-contain" />
                                        ) : (
                                            <div className="w-full h-full bg-primary/20 rounded-lg animate-pulse"></div>
                                        )}
                                    </div>
                                    <div className="text-right">
                                        <p className="text-[10px] font-black text-primary uppercase tracking-widest">Achieved</p>
                                        <p className="text-lg font-black text-gray-900">{project.growth}</p>
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <h4 className="text-xl font-bold text-gray-900 group-hover:text-primary transition-colors">{project.title}</h4>
                                    <p className="text-sm text-gray-500 font-medium line-clamp-2">{project.detail.substring(0, 100)}...</p>
                                </div>

                                <div className="pt-4 flex items-center gap-2 text-primary font-bold text-xs uppercase tracking-widest">
                                    Read Full Case Study
                                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M13 7l5 5m0 0l-5 5m5-5H6"></path></svg>
                                </div>
                            </div>
                        </Link>
                    ))}
                </div>
            </div>
        </section>
    );
}
