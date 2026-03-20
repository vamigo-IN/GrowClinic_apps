export const dynamic = "force-dynamic";
import React from "react";
import { prisma } from "@/lib/prisma";
import { SectionHeading } from "@/components/ui/SectionHeading";
import Link from "next/link";
import Image from "next/image";
import { ArrowRight, Calendar, User, Tag } from "lucide-react";

export const metadata = {
  title: "Blog & Healthcare Insights",
  description: "Expert insights on medical practice growth, patient acquisition, and healthcare technology.",
};

export default async function BlogPage() {
  const posts = await prisma.post.findMany({
    where: { published: true },
    include: { tags: true, author: { select: { name: true } } },
    orderBy: { createdAt: "desc" },
  });

  return (
    <main className="pt-32 pb-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <SectionHeading 
          title="Insights &" 
          highlight="Intelligence" 
          subtitle="The latest strategies in medical growth and clinic engineering."
          level="h1"
        />

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10 mt-16">
          {posts.map((post) => (
            <article key={post.id} className="group bg-white rounded-[2.5rem] border border-slate-100 overflow-hidden shadow-3xl hover:-translate-y-2 transition-all duration-500">
              <Link href={`/blog/${post.slug}`} className="block relative h-64 overflow-hidden">
                <Image
                  src={post.featuredImage || "https://images.unsplash.com/photo-1576091160550-217359f4ecf8?auto=format&fit=crop&q=80"}
                  alt={post.title}
                  fill
                  className="object-cover transition-transform duration-700 group-hover:scale-110"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-900/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 flex items-end p-8">
                  <span className="text-white font-black uppercase text-xs tracking-widest flex items-center gap-2">
                    Read Article <ArrowRight className="w-4 h-4" />
                  </span>
                </div>
              </Link>

              <div className="p-10">
                <div className="flex items-center gap-4 mb-6">
                  {post.tags?.[0] && (
                    <span className="px-4 py-1.5 rounded-full bg-primary/5 text-primary text-[10px] font-black uppercase tracking-widest border border-primary/10">
                      {post.tags[0].name}
                    </span>
                  )}
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                    <Calendar className="w-3 h-3" />
                    {new Date(post.createdAt).toLocaleDateString()}
                  </span>
                </div>

                <Link href={`/blog/${post.slug}`}>
                  <h2 className="text-2xl font-black text-slate-900 mb-4 leading-tight tracking-tight group-hover:text-primary transition-colors">
                    {post.title}
                  </h2>
                </Link>

                <p className="text-slate-500 font-medium leading-relaxed mb-8 line-clamp-3">
                  {post.excerpt || post.content.substring(0, 150).replace(/[#*]/g, '') + "..."}
                </p>

                <div className="flex items-center justify-between pt-8 border-t border-slate-50">
                  <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-400">
                    <User className="w-4 h-4 text-primary" />
                    {post.author?.name || "GrowClinic Expert"}
                  </div>
                  <Link href={`/blog/${post.slug}`} className="w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center text-slate-400 group-hover:bg-primary group-hover:text-white transition-all duration-300">
                    <ArrowRight className="w-5 h-5" />
                  </Link>
                </div>
              </div>
            </article>
          ))}
        </div>

        {posts.length === 0 && (
          <div className="text-center py-20 bg-slate-50 rounded-[3rem] border border-dashed border-slate-200">
            <h3 className="text-xl font-bold text-slate-400">No insights published yet.</h3>
          </div>
        )}
      </div>
    </main>
  );
}
