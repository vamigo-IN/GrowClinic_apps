export const dynamic = "force-dynamic";

import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import Link from "next/link";
import { MermaidRenderer } from "@/components/blog/MermaidRenderer";

interface PreviewProps {
  params: Promise<{ id: string }>;
}

// Previews are intentionally public-but-unguessable (cuid) and never indexed.
export const metadata: Metadata = {
  robots: { index: false, follow: false },
  title: "Preview",
};

export default async function PreviewPage({ params }: PreviewProps) {
  const { id } = await params;
  const post = await prisma.post
    .findUnique({
      where: { id },
      include: { author: { select: { name: true } }, tags: true },
    })
    .catch(() => null);

  if (!post) notFound();

  const wordCount = post.content.replace(/<[^>]*>?/gm, "").split(/\s+/).filter(Boolean).length;
  const readingTime = Math.max(1, Math.ceil(wordCount / 200));

  return (
    <div className="min-h-screen bg-white">
      {/* Preview banner */}
      <div className="sticky top-0 z-50 bg-amber-500 text-white text-center text-xs sm:text-sm font-bold py-2 px-4">
        Preview mode {post.published ? "· Published" : "· Draft (not live)"} — this page is noindex and link-shareable. It reflects the last saved version.
      </div>

      <article className="max-w-3xl mx-auto px-4 sm:px-6 py-12">
        {post.featuredImage && (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img
            src={post.featuredImage}
            alt={post.title}
            className="w-full rounded-[15px] mb-8 object-cover max-h-96 border border-slate-100"
          />
        )}
        <p className="text-xs font-black uppercase tracking-widest text-primary mb-3">{post.category || "Insights"}</p>
        <h1 className="text-4xl md:text-5xl font-black text-slate-900 tracking-tight leading-tight mb-4">{post.title}</h1>
        <p className="text-sm text-slate-500 mb-10">
          {readingTime} min read
        </p>
        <div
          className="prose prose-slate prose-lg max-w-none blog-content
            [&_table]:w-full [&_table]:border-collapse [&_th]:border [&_td]:border [&_th]:border-slate-200 [&_td]:border-slate-200 [&_th]:p-2 [&_td]:p-2 [&_th]:bg-slate-50
            [&_.callout]:bg-primary/5 [&_.callout]:border [&_.callout]:border-primary/20 [&_.callout]:rounded-xl [&_.callout]:p-4 [&_.callout]:my-5
            [&_iframe]:w-full [&_iframe]:aspect-video [&_iframe]:rounded-xl [&_video]:w-full [&_video]:rounded-xl
            [&_mark]:px-1 [&_mark]:rounded"
          dangerouslySetInnerHTML={{ __html: post.content }}
        />
        <MermaidRenderer />
        <div className="mt-12 pt-6 border-t border-slate-100 text-sm">
          {post.published ? (
            <Link href={`/blog/${post.slug}`} className="text-primary font-bold hover:underline">
              View the live post →
            </Link>
          ) : (
            <span className="text-slate-400 font-medium">Not published yet — publish from the admin to make it live.</span>
          )}
        </div>
      </article>
    </div>
  );
}
