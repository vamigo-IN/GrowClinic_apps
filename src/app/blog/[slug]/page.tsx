export const dynamic = "force-dynamic";
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import Image from "next/image";
import { Calendar, ArrowLeft, Facebook, Twitter, Linkedin, Clock, ChevronUp } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Metadata } from "next";

interface PostPageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: PostPageProps): Promise<Metadata> {
  const { slug } = await params;
  const post = await prisma.post.findUnique({
    where: { slug },
    include: { author: { select: { name: true } } }
  });

  if (!post) return {};

  return {
    title: post.title,
    description: post.excerpt || post.content.replace(/<[^>]*>?/gm, '').substring(0, 160),
    openGraph: {
      title: post.title,
      description: post.excerpt || post.content.replace(/<[^>]*>?/gm, '').substring(0, 160),
      type: "article",
      publishedTime: post.createdAt.toISOString(),
      authors: [post.author?.name || "GrowClinic Expert"],
      images: post.featuredImage ? [{ url: post.featuredImage }] : [],
    }
  };
}

export default async function BlogPostPage({ params }: PostPageProps) {
  const { slug } = await params;
  const post = await prisma.post.findUnique({
    where: { slug },
    include: {
      tags: true,
      author: { select: { name: true, image: true } }
    },
  });

  if (!post || !post.published) {
    notFound();
  }

  const wordCount = post.content.replace(/<[^>]*>?/gm, '').split(/\s+/).filter(Boolean).length;
  const readingTime = Math.max(1, Math.ceil(wordCount / 200));

  return (
    <article className="relative overflow-hidden">
      {/* Reading Progress Bar (purely decorative, CSS-driven) */}
      <div className="fixed top-0 left-0 w-full h-1 z-50 bg-slate-100">
        <div className="h-full bg-gradient-to-r from-primary to-primary-dark w-0" id="reading-progress" />
      </div>

      {/* Hero Section */}
      <div className="relative">
        {/* Background Gradient */}
        <div className="absolute inset-0 bg-gradient-to-b from-slate-50 via-white to-transparent h-[600px] -z-10" />
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-primary/5 rounded-full blur-3xl -z-10" />
        <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-primary/3 rounded-full blur-3xl -z-10" />

        <div className="max-w-4xl mx-auto px-4 sm:px-6 pt-32 pb-8">
          {/* Breadcrumb */}
          <Link href="/blog" className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-widest text-slate-400 hover:text-primary transition-colors mb-12 group">
            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
            Back to Journal
          </Link>

          {/* Category & Reading Time */}
          <div className="flex flex-wrap items-center gap-3 mb-8">
            <span className="px-4 py-1.5 rounded-full bg-gradient-to-r from-primary/10 to-primary/5 text-primary text-[10px] font-black uppercase tracking-widest border border-primary/10">
              {post.category || 'Insights'}
            </span>
            <span className="text-slate-300">•</span>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
              <Clock className="w-3 h-3" />
              {readingTime} min read
            </span>
            <span className="text-slate-300">•</span>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
              {wordCount.toLocaleString()} words
            </span>
          </div>

          {/* Title */}
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-black text-slate-900 tracking-tight leading-[1.08] mb-10">
            {post.title}
          </h1>

          {/* Excerpt */}
          {post.excerpt && (
            <p className="text-xl md:text-2xl text-slate-500 font-medium leading-relaxed mb-10 max-w-3xl">
              {post.excerpt}
            </p>
          )}

          {/* Author/Meta Row */}
          <div className="flex items-center justify-between border-y border-slate-100 py-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-primary to-primary-dark flex items-center justify-center text-white font-black text-lg shadow-lg shadow-primary/20">
                {(post.author?.name || "GC")[0]}
              </div>
              <div className="text-left">
                <p className="text-sm font-black text-slate-900 tracking-tight leading-none mb-1.5">{post.author?.name || "GrowClinic Expert"}</p>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                  <Calendar className="w-3 h-3 text-primary" />
                  <span suppressHydrationWarning>
                    {new Date(post.createdAt).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                  </span>
                </p>
              </div>
            </div>

            {/* Social Actions */}
            <div className="flex items-center gap-2">
              {[Facebook, Twitter, Linkedin].map((Icon, i) => (
                <button key={i} className="w-10 h-10 rounded-full flex items-center justify-center border border-slate-100 text-slate-400 hover:text-primary hover:bg-primary/5 hover:border-primary/20 hover:-translate-y-0.5 transition-all">
                  <Icon className="w-4 h-4" />
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Featured Image */}
      {post.featuredImage && (
        <div className="max-w-5xl mx-auto px-4 sm:px-6 mb-16">
          <div className="relative w-full h-[300px] sm:h-[450px] lg:h-[550px] rounded-[2rem] sm:rounded-[3rem] overflow-hidden shadow-2xl border border-slate-200/60 bg-slate-100">
            <Image
              src={post.featuredImage}
              alt={post.title}
              fill
              className="object-cover"
              priority
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 80vw, 1200px"
            />
            {/* Subtle overlay gradient */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/10 via-transparent to-transparent" />
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6">
        <div
          className="prose prose-slate prose-lg max-w-none
          prose-headings:font-black prose-headings:tracking-tight prose-headings:text-slate-900
          prose-h2:text-3xl prose-h2:mt-16 prose-h2:mb-6 prose-h2:pb-4 prose-h2:border-b prose-h2:border-slate-100
          prose-h3:text-2xl prose-h3:mt-12 prose-h3:mb-4
          prose-p:text-slate-600 prose-p:font-medium prose-p:leading-[1.85] prose-p:text-[17px]
          prose-strong:text-slate-900 prose-strong:font-black
          prose-a:text-primary prose-a:font-bold prose-a:no-underline hover:prose-a:underline prose-a:transition-colors
          prose-img:rounded-[2rem] prose-img:border prose-img:border-slate-100 prose-img:shadow-lg prose-img:my-10
          [&_img]:max-w-full [&_img]:h-auto
          prose-blockquote:border-l-4 prose-blockquote:border-primary prose-blockquote:bg-primary/5 prose-blockquote:rounded-r-2xl prose-blockquote:py-4 prose-blockquote:px-6 prose-blockquote:not-italic prose-blockquote:text-slate-600 prose-blockquote:font-medium
          prose-ul:list-disc prose-li:text-slate-600 prose-li:font-medium prose-li:text-[17px]
          prose-ol:list-decimal
          prose-code:bg-slate-100 prose-code:px-2 prose-code:py-0.5 prose-code:rounded-lg prose-code:text-sm prose-code:font-mono prose-code:text-primary prose-code:before:content-none prose-code:after:content-none
          prose-pre:bg-slate-900 prose-pre:rounded-2xl prose-pre:shadow-lg prose-pre:border prose-pre:border-slate-800
          mb-20"
          dangerouslySetInnerHTML={{ __html: post.content }}
          suppressHydrationWarning
        />

        {/* Tags */}
        {post.tags.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-16 pt-8 border-t border-slate-100">
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 mr-2 self-center">Topics:</span>
            {post.tags.map((tag) => (
              <span key={tag.id} className="px-4 py-2 rounded-full bg-slate-50 text-slate-600 text-xs font-bold border border-slate-100 hover:bg-primary/5 hover:text-primary hover:border-primary/20 transition-all cursor-pointer">
                {tag.name}
              </span>
            ))}
          </div>
        )}

        {/* Share CTA Card */}
        <div className="bg-gradient-to-br from-slate-50 to-slate-100/50 rounded-[3rem] p-10 md:p-16 border border-slate-100 text-center mb-16">
          <h3 className="text-2xl font-black text-slate-900 mb-4 tracking-tight">Enjoyed this insight?</h3>
          <p className="text-slate-500 font-medium mb-8">Share with your network and help more clinics grow.</p>
          <div className="flex justify-center gap-4">
            {[
              { Icon: Facebook, color: "hover:bg-blue-50 hover:text-blue-600 hover:border-blue-200" },
              { Icon: Twitter, color: "hover:bg-sky-50 hover:text-sky-500 hover:border-sky-200" },
              { Icon: Linkedin, color: "hover:bg-indigo-50 hover:text-indigo-600 hover:border-indigo-200" },
            ].map(({ Icon, color }, i) => (
              <button key={i} className={`w-14 h-14 rounded-2xl bg-white border border-slate-100 shadow-sm flex items-center justify-center text-slate-400 hover:-translate-y-1 transition-all ${color}`}>
                <Icon className="w-6 h-6" />
              </button>
            ))}
          </div>
        </div>

        {/* CTA */}
        <div className="p-12 md:p-16 bg-gradient-to-br from-primary via-primary to-primary-dark rounded-[3rem] text-center shadow-2xl shadow-primary/20 text-white mb-20 relative overflow-hidden">
          {/* Background decoration */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2" />
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/5 rounded-full translate-y-1/2 -translate-x-1/2" />

          <div className="relative z-10">
            <h2 className="text-3xl md:text-4xl font-black mb-6 tracking-tight">Ready to engineer your clinic&apos;s growth?</h2>
            <p className="text-white/80 font-medium mb-10 max-w-2xl mx-auto text-lg">Book your strategy session with our medical growth leads today.</p>
            <Link href="/#audit">
              <Button variant="outline" className="bg-white text-primary border-none text-xs font-black uppercase tracking-widest px-10 py-5 rounded-3xl hover:bg-slate-50 hover:shadow-lg transition-all">
                Get Free Audit
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </article>
  );
}
