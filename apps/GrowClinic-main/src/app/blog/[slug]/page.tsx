// ISR: render once, then re-render at most every 5 min. Post mutations
// call revalidatePath (see src/lib/revalidate.ts) to update sooner.
export const revalidate = 300;
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import Image from "next/image";
import { Calendar, ArrowLeft, Facebook, Twitter, Linkedin, Clock, ChevronUp } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { SummariseWithAI } from "@/components/blog/SummariseWithAI";
import { MermaidRenderer } from "@/components/blog/MermaidRenderer";
import { TableOfContents } from "@/components/blog/TableOfContents";
import { jsonLdString } from "@/lib/html";
import { Metadata } from "next";

interface PostPageProps {
  params: Promise<{ slug: string }>;
}

// Inject ids into h2/h3 headings and build a table of contents from the post HTML.
function buildToc(html: string): { html: string; toc: { id: string; text: string; level: number }[] } {
  const toc: { id: string; text: string; level: number }[] = [];
  const used = new Set<string>();
  const processed = html.replace(/<(h2|h3)([^>]*)>([\s\S]*?)<\/\1>/gi, (_m, tag: string, attrs: string, inner: string) => {
    const text = inner.replace(/<[^>]+>/g, "").trim();
    if (!text) return `<${tag}${attrs}>${inner}</${tag}>`;
    let base = text.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 60) || "section";
    let id = base;
    let n = 1;
    while (used.has(id)) id = `${base}-${n++}`;
    used.add(id);
    const cleaned = attrs.replace(/\sid="[^"]*"/i, "");
    toc.push({ id, text, level: tag.toLowerCase() === "h2" ? 2 : 3 });
    return `<${tag}${cleaned} id="${id}">${inner}</${tag}>`;
  });
  return { html: processed, toc };
}

export async function generateMetadata({ params }: PostPageProps): Promise<Metadata> {
  const { slug } = await params;
  const post = await prisma.post.findUnique({
    where: { slug },
    include: { author: { select: { name: true } } }
  });

  // Drafts 404 — don't leak their title/description through metadata either.
  if (!post || !post.published) return {};

  // Per-post SEO/social overrides (fall back to sensible defaults).
  const p = post as typeof post & {
    metaDescription?: string | null;
    ogTitle?: string | null; ogDescription?: string | null; ogImage?: string | null;
    canonicalUrl?: string | null; noIndex?: boolean | null;
  };
  const plain = post.content.replace(/<[^>]*>?/gm, "").substring(0, 160);
  // <meta name="description"> prefers the dedicated field; OG cards prefer the OG override.
  const desc = p.metaDescription || p.ogDescription || post.excerpt || plain;
  const ogDesc = p.ogDescription || p.metaDescription || post.excerpt || plain;
  const ogTitle = p.ogTitle || post.title;
  const img = p.ogImage || post.featuredImage || "https://www.growclinic.io/images/og-image.jpg";
  const canonical = p.canonicalUrl || `https://www.growclinic.io/blog/${slug}`;

  return {
    title: post.title,
    description: desc,
    alternates: { canonical },
    ...(p.noIndex ? { robots: { index: false, follow: false } } : {}),
    openGraph: {
      title: ogTitle,
      description: ogDesc,
      type: "article",
      url: canonical,
      publishedTime: (post.publishedAt ?? post.createdAt).toISOString(),
      authors: ["GrowClinic"],
      images: img ? [{ url: img }] : [],
    },
    twitter: {
      card: "summary_large_image",
      title: ogTitle,
      description: ogDesc,
      images: img ? [img] : [],
    },
  };
}

export default async function BlogPostPage({ params }: PostPageProps) {
  const { slug } = await params;
  // Auto-publish any scheduled post whose time has arrived (covers direct hits
  // on a scheduled URL before the blog index has been visited).
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

  const postUrl = `https://www.growclinic.io/blog/${slug}`;
  const { html: contentHtml, toc } = buildToc(post.content);

  // Related posts (latest published, excluding this one)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let relatedPosts: any[] = [];
  try {
    relatedPosts = await prisma.post.findMany({
      where: { published: true, slug: { not: slug } },
      orderBy: [{ publishedAt: "desc" }, { createdAt: "desc" }],
      take: 3,
      select: { title: true, slug: true, excerpt: true, category: true, featuredImage: true, createdAt: true, publishedAt: true },
    });
  } catch (e) {
    console.error("Related posts query failed:", e);
    relatedPosts = [];
  }

  // Share links
  const enc = encodeURIComponent(postUrl);
  const shareLinks = {
    facebook: `https://www.facebook.com/sharer/sharer.php?u=${enc}`,
    twitter: `https://twitter.com/intent/tweet?url=${enc}&text=${encodeURIComponent(post.title)}`,
    linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${enc}`,
  };

  const articleJsonLd = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    "headline": post.title,
    "description": post.excerpt || post.content.replace(/<[^>]*>?/gm, '').substring(0, 160),
    "image": post.featuredImage || "https://www.growclinic.io/images/og-image.jpg",
    "datePublished": (post.publishedAt ?? post.createdAt).toISOString(),
    "dateModified": post.updatedAt.toISOString(),
    "wordCount": wordCount,
    "articleSection": post.category || "Insights",
    "inLanguage": "en-IN",
    "author": {
      "@type": "Person",
      "name": "GrowClinic",
    },
    "publisher": {
      "@type": "Organization",
      "name": "GrowClinic",
      "logo": {
        "@type": "ImageObject",
        "url": "https://www.growclinic.io/images/logo.png",
      },
    },
    "mainEntityOfPage": {
      "@type": "WebPage",
      "@id": `https://www.growclinic.io/blog/${slug}`,
    },
  };

  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": [
      { "@type": "ListItem", "position": 1, "name": "Home", "item": "https://www.growclinic.io" },
      { "@type": "ListItem", "position": 2, "name": "Blog", "item": "https://www.growclinic.io/blog" },
      { "@type": "ListItem", "position": 3, "name": post.title, "item": `https://www.growclinic.io/blog/${slug}` },
    ],
  };

  return (
    <article className="relative overflow-hidden">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLdString(articleJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLdString(breadcrumbJsonLd) }}
      />
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
          <Link href="/blog" className="inline-flex items-center gap-2 text-size-tiny text-weight-bold uppercase tracking-widest text-slate-400 hover:text-primary transition-colors mb-12 group">
            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
            Back to Journal
          </Link>

          {/* Category & Reading Time */}
          <div className="flex flex-wrap items-center gap-3 mb-8">
            <span className="px-4 py-1.5 rounded-full bg-gradient-to-r from-primary/10 to-primary/5 text-primary text-size-tiny text-weight-bold uppercase tracking-widest border border-primary/10">
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
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-semibold text-slate-900 tracking-tight leading-[1.08] mb-10">
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
              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-primary" />
                <span suppressHydrationWarning>
                  {new Date(post.publishedAt ?? post.createdAt).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                </span>
              </p>
            </div>

            {/* Social Actions */}
            <div className="flex items-center gap-2">
              {[
                { Icon: Facebook, href: shareLinks.facebook },
                { Icon: Twitter, href: shareLinks.twitter },
                { Icon: Linkedin, href: shareLinks.linkedin },
              ].map(({ Icon, href }, i) => (
                <a key={i} href={href} target="_blank" rel="noopener noreferrer" aria-label="Share this article" className="w-10 h-10 rounded-full flex items-center justify-center border border-slate-100 text-slate-400 hover:text-primary hover:bg-primary/5 hover:border-primary/20 hover:-translate-y-0.5 transition-all">
                  <Icon className="w-4 h-4" />
                </a>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Featured Image */}
      {post.featuredImage && (
        <div className="max-w-5xl mx-auto px-4 sm:px-6 mb-16">
          <div className="relative w-full h-[300px] sm:h-[450px] lg:h-[550px] rounded-[15px] sm:rounded-[15px] overflow-hidden shadow-2xl border border-slate-200/60 bg-slate-100">
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
        {/* Summarise this post with AI */}
        <SummariseWithAI url={postUrl} title={post.title} />

        {/* Table of contents — compact, animated scroll-spy */}
        <TableOfContents items={toc} />

        <div
          className="prose prose-slate prose-lg max-w-none
          prose-headings:font-black prose-headings:tracking-tight prose-headings:text-slate-900
          prose-h2:text-3xl prose-h2:mt-16 prose-h2:mb-6 prose-h2:pb-4 prose-h2:border-b prose-h2:border-slate-100
          prose-h3:text-2xl prose-h3:mt-12 prose-h3:mb-4
          prose-p:text-slate-600 prose-p:font-medium prose-p:leading-[1.85] prose-p:text-[17px]
          prose-strong:text-slate-900 prose-strong:font-black
          prose-a:text-primary prose-a:font-bold prose-a:no-underline hover:prose-a:underline prose-a:transition-colors
          prose-img:rounded-[15px] prose-img:border prose-img:border-slate-100 prose-img:shadow-lg prose-img:my-10
          [&_img]:max-w-full [&_img]:h-auto [&_h2]:scroll-mt-28 [&_h3]:scroll-mt-28
          prose-blockquote:border-l-4 prose-blockquote:border-primary prose-blockquote:bg-primary/5 prose-blockquote:rounded-r-[15px] prose-blockquote:py-4 prose-blockquote:px-6 prose-blockquote:not-italic prose-blockquote:text-slate-600 prose-blockquote:font-medium
          prose-ul:list-disc prose-li:text-slate-600 prose-li:font-medium prose-li:text-[17px]
          prose-ol:list-decimal
          prose-code:bg-slate-100 prose-code:px-2 prose-code:py-0.5 prose-code:rounded-lg prose-code:text-sm prose-code:font-mono prose-code:text-primary prose-code:before:content-none prose-code:after:content-none
          prose-pre:bg-slate-900 prose-pre:rounded-[15px] prose-pre:shadow-lg prose-pre:border prose-pre:border-slate-800
          mb-20"
          dangerouslySetInnerHTML={{ __html: contentHtml }}
          suppressHydrationWarning
        />
        <MermaidRenderer />

        {/* Tags */}
        {post.tags.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-16 pt-8 border-t border-slate-100">
            <span className="text-size-tiny text-weight-bold uppercase tracking-widest text-slate-400 mr-2 self-center">Topics:</span>
            {post.tags.map((tag) => (
              <span key={tag.id} className="px-4 py-2 rounded-full bg-slate-50 text-slate-600 text-xs font-bold border border-slate-100 hover:bg-primary/5 hover:text-primary hover:border-primary/20 transition-all cursor-pointer">
                {tag.name}
              </span>
            ))}
          </div>
        )}

        {/* Related posts */}
        {relatedPosts.length > 0 && (
          <div className="mb-20">
            <h2 className="text-2xl font-black text-slate-900 tracking-tight mb-8">Keep reading</h2>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {relatedPosts.map((rp) => (
                <Link key={rp.slug} href={`/blog/${rp.slug}`} className="group rounded-[15px] border border-slate-100 bg-white overflow-hidden hover:shadow-xl hover:-translate-y-1 transition-all">
                  <div className="relative h-40 bg-slate-50">
                    {rp.featuredImage ? (
                      <Image src={rp.featuredImage} alt={rp.title} fill className="object-contain" sizes="400px" />
                    ) : (
                      <div className="absolute inset-0 bg-gradient-to-br from-primary/10 to-slate-100" />
                    )}
                  </div>
                  <div className="p-5">
                    {rp.category && <span className="text-[10px] font-black uppercase tracking-widest text-primary">{rp.category}</span>}
                    <h3 className="mt-2 font-black text-slate-900 leading-snug line-clamp-2 group-hover:text-primary transition-colors">{rp.title}</h3>
                    {rp.excerpt && <p className="mt-2 text-sm text-slate-500 font-medium line-clamp-2">{rp.excerpt}</p>}
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* CTA */}
        <div className="p-12 md:p-16 bg-gradient-to-br from-primary via-primary to-primary-dark rounded-[15px] text-center shadow-2xl shadow-primary/20 text-white mb-20 relative overflow-hidden">
          {/* Background decoration */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2" />
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/5 rounded-full translate-y-1/2 -translate-x-1/2" />

          <div className="relative z-10">
            <h2 className="text-3xl md:text-4xl font-semibold mb-6 tracking-tight">Ready to engineer your clinic&apos;s growth?</h2>
            <p className="text-white/80 font-medium mb-10 max-w-2xl mx-auto text-lg">Get your clinic growth audit, then we map your next 90 days.</p>
            <Link href="https://audit.growclinic.io">
              <Button variant="outline" className="bg-white text-primary border-none text-size-tiny text-weight-bold uppercase tracking-widest px-10 py-5 rounded-[15px] hover:bg-slate-50 hover:shadow-lg transition-all">
                Audit Your Clinic
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </article>
  );
}
