export const dynamic = "force-dynamic";
import React from "react";
import { prisma } from "@/lib/prisma";
import { SectionHeading } from "@/components/ui/SectionHeading";
import Link from "next/link";
import Image from "next/image";
import { ArrowRight, Calendar, User, Clock, Sparkles } from "lucide-react";

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

  const featuredPost = posts[0];
  const remainingPosts = posts.slice(1);

  // Extract unique categories
  const categories = [...new Set(posts.map(p => p.category).filter(Boolean))] as string[];

  return (
    <main className="pt-28 pb-20 relative overflow-hidden">
      {/* Background decorations */}
      <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-primary/5 rounded-full blur-3xl -z-10" />
      <div className="absolute top-[400px] left-0 w-[500px] h-[500px] bg-primary/3 rounded-full blur-3xl -z-10" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/5 border border-primary/10 text-primary text-[10px] font-black uppercase tracking-widest mb-8">
            <Sparkles className="w-3.5 h-3.5" />
            Knowledge Hub
          </div>
          <SectionHeading
            title="Insights &"
            highlight="Intelligence"
            subtitle="The latest strategies in medical growth and clinic engineering."
            level="h1"
          />
        </div>

        {/* Category Filter Pills */}
        {categories.length > 0 && (
          <div className="flex flex-wrap justify-center gap-2 mb-16 relative z-10">
            <Link href="/blog" className="px-5 py-2.5 rounded-full bg-primary text-white text-[10px] font-black uppercase tracking-widest cursor-pointer shadow-md shadow-primary/20">
              All Articles
            </Link>
            {categories.map((cat) => (
              <Link key={cat} href={`/blog/category/${encodeURIComponent(cat.toLowerCase())}`} className="px-5 py-2.5 rounded-full bg-white text-slate-500 text-[10px] font-black uppercase tracking-widest cursor-pointer border border-slate-100 hover:bg-primary/5 hover:text-primary hover:border-primary/20 transition-all">
                {cat}
              </Link>
            ))}
          </div>
        )}

        {/* Featured Post (Hero Card) */}
        {featuredPost && (
          <div className="mb-20">
            <div className="relative bg-white rounded-[3rem] border border-slate-100 overflow-hidden shadow-2xl hover:shadow-3xl transition-all duration-500 hover:-translate-y-1 group block">
              <Link href={`/blog/${featuredPost.slug}`} className="absolute inset-0 z-0"><span className="sr-only">Read {featuredPost.title}</span></Link>
              <div className="grid md:grid-cols-2 gap-0">
                {/* Image Side */}
                <div className="relative h-72 md:h-[500px] overflow-hidden">
                  <Image
                    src={featuredPost.featuredImage || "https://images.unsplash.com/photo-1576091160550-217359f4ecf8?auto=format&fit=crop&q=80"}
                    alt={featuredPost.title}
                    fill
                    className="object-cover transition-transform duration-700 group-hover:scale-105 pointer-events-none"
                    priority
                  />
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-transparent to-white/30 md:block hidden pointer-events-none" />
                  <div className="absolute top-6 left-6 z-10">
                    <span className="px-4 py-2 rounded-full bg-white/90 backdrop-blur-sm text-primary text-[10px] font-black uppercase tracking-widest shadow-sm pointer-events-none">
                      Featured
                    </span>
                  </div>
                </div>

                {/* Content Side */}
                <div className="p-10 md:p-14 flex flex-col justify-center relative">
                  <div className="flex items-center gap-3 mb-6 relative z-10">
                    <Link href={`/blog/category/${encodeURIComponent((featuredPost.category || 'Insights').toLowerCase())}`} className="px-3 py-1.5 rounded-full bg-primary/5 text-primary text-[10px] font-black uppercase tracking-widest border border-primary/10 hover:bg-primary hover:text-white transition-colors">
                      {featuredPost.category || 'Insights'}
                    </Link>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5 pointer-events-none">
                      <Clock className="w-3 h-3" />
                      {Math.ceil(featuredPost.content.replace(/<[^>]*>?/gm, '').split(' ').length / 200)} min
                    </span>
                  </div>

                  <h2 className="text-3xl md:text-4xl font-black text-slate-900 mb-6 leading-tight tracking-tight group-hover:text-primary transition-colors pointer-events-none">
                    {featuredPost.title}
                  </h2>

                  <p className="text-slate-500 font-medium leading-relaxed mb-8 text-lg line-clamp-3 pointer-events-none">
                    {featuredPost.excerpt || featuredPost.content.replace(/<[^>]*>?/gm, '').substring(0, 200) + "..."}
                  </p>

                  <div className="flex items-center justify-between pt-6 border-t border-slate-100 pointer-events-none">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-primary to-primary-dark flex items-center justify-center text-white font-bold text-sm shadow-sm">
                        {(featuredPost.author?.name || "GC")[0]}
                      </div>
                      <div>
                        <p className="text-sm font-bold text-slate-900">{featuredPost.author?.name || "GrowClinic Expert"}</p>
                        <p className="text-[10px] text-slate-400 font-bold flex items-center gap-1" suppressHydrationWarning>
                          <Calendar className="w-3 h-3" />
                          {new Date(featuredPost.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                        </p>
                      </div>
                    </div>
                    <span className="w-12 h-12 rounded-full bg-slate-50 flex items-center justify-center text-slate-400 group-hover:bg-primary group-hover:text-white transition-all duration-300 shadow-sm relative z-10">
                      <ArrowRight className="w-5 h-5 pointer-events-none" />
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Article Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {remainingPosts.map((post) => (
            <article key={post.id} className="group relative bg-white rounded-[2.5rem] border border-slate-100 overflow-hidden shadow-lg hover:shadow-2xl hover:-translate-y-2 transition-all duration-500">
              <Link href={`/blog/${post.slug}`} className="absolute inset-0 z-0"><span className="sr-only">Read {post.title}</span></Link>
              
              <div className="block relative h-56 overflow-hidden pointer-events-none">
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
              </div>
              
              {/* Category Badge */}
              <div className="absolute top-4 left-4 z-10">
                <Link href={`/blog/category/${encodeURIComponent((post.category || 'Insights').toLowerCase())}`} className="px-3 py-1.5 rounded-full bg-white/90 backdrop-blur-sm text-primary text-[9px] font-black uppercase tracking-widest shadow-sm hover:bg-primary hover:text-white transition-colors cursor-pointer">
                  {post.category || 'Insights'}
                </Link>
              </div>

              <div className="p-8 relative">
                <div className="flex items-center gap-3 mb-5 pointer-events-none">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                    <Calendar className="w-3 h-3" />
                    <span suppressHydrationWarning>{new Date(post.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
                  </span>
                  <span className="text-slate-200">•</span>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                    <Clock className="w-3 h-3" />
                    {Math.ceil(post.content.replace(/<[^>]*>?/gm, '').split(' ').length / 200)} min
                  </span>
                </div>

                <div className="pointer-events-none relative z-10">
                  <h2 className="text-xl font-black text-slate-900 mb-4 leading-tight tracking-tight group-hover:text-primary transition-colors line-clamp-2">
                    {post.title}
                  </h2>
                </div>

                <p className="text-slate-500 font-medium leading-relaxed mb-6 line-clamp-3 text-sm pointer-events-none">
                  {post.excerpt || post.content.replace(/<[^>]*>?/gm, '').substring(0, 150).replace(/[#*]/g, '') + "..."}
                </p>

                <div className="flex items-center justify-between pt-6 border-t border-slate-50 pointer-events-none text-xs">
                  <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-400">
                    <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-primary/20 to-primary/10 flex items-center justify-center text-primary text-[10px] font-black">
                      {(post.author?.name || "GC")[0]}
                    </div>
                    {post.author?.name || "GrowClinic Expert"}
                  </div>
                  <div className="w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center text-slate-400 group-hover:bg-primary group-hover:text-white transition-all duration-300 pointer-events-auto relative z-10 cursor-pointer">
                    <ArrowRight className="w-5 h-5 pointer-events-none" />
                  </div>
                </div>
              </div>
            </article>
          ))}
        </div>

        {posts.length === 0 && (
          <div className="text-center py-24 bg-gradient-to-br from-slate-50 to-white rounded-[3rem] border border-dashed border-slate-200 relative z-10">
            <div className="w-20 h-20 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-6">
              <Sparkles className="w-8 h-8 text-slate-300" />
            </div>
            <h3 className="text-xl font-black text-slate-400 mb-2">No insights published yet.</h3>
            <p className="text-sm text-slate-400 font-medium">Check back soon — we are preparing valuable content for your growth journey.</p>
          </div>
        )}
      </div>
    </main>
  );
}
