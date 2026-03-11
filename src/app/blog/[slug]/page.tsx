import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import Image from "next/image";
import { Calendar, User, Clock, ArrowLeft, Share2, Facebook, Twitter, Linkedin } from "lucide-react";
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
    description: post.excerpt || post.content.substring(0, 160),
    openGraph: {
      title: post.title,
      description: post.excerpt || post.content.substring(0, 160),
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

  return (
    <article className="pt-32 pb-20 relative overflow-hidden">
      {/* Visual background */}
      <div className="absolute top-0 left-0 w-full h-96 bg-slate-50/50 -z-10"></div>
      
      <div className="max-w-4xl mx-auto px-4">
        {/* Breadcrumb / Back Navigation */}
        <Link href="/blog" className="inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 hover:text-primary transition-colors mb-12">
          <ArrowLeft className="w-4 h-4" />
          Back to Insights
        </Link>

        {/* Header */}
        <header className="mb-16">
          <div className="flex flex-wrap items-center gap-4 mb-8">
            {post.tags.map(tag => (
              <span key={tag.id} className="px-4 py-1.5 rounded-full bg-primary/10 text-primary text-[10px] font-black uppercase tracking-widest">
                {tag.name}
              </span>
            ))}
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
              <Clock className="w-3 h-3" />
              {Math.ceil(post.content.split(' ').length / 200)} min read
            </span>
          </div>

          <h1 className="text-4xl md:text-6xl lg:text-7xl font-black text-slate-900 leading-[1.1] tracking-tight mb-10">
            {post.title}
          </h1>

          <div className="flex flex-wrap items-center justify-between gap-8 pt-10 border-t border-slate-100">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary font-black overflow-hidden border border-white shadow-sm ring-4 ring-primary/5">
                {post.author?.image ? (
                  <img src={post.author.image} alt={post.author.name || ""} className="w-full h-full object-cover" />
                ) : (
                  <span className="text-lg">G</span>
                )}
              </div>
              <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Published By</p>
                <p className="text-sm font-black text-slate-900 tracking-tight">{post.author?.name || "GrowClinic Expert"}</p>
              </div>
            </div>
            
            <div className="flex items-center gap-6 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
              <span className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-primary" />
                {new Date(post.createdAt).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
              </span>
            </div>
          </div>
        </header>

        {/* Featured Image */}
        {post.featuredImage && (
          <div className="relative aspect-[16/9] mb-20 rounded-[3rem] overflow-hidden shadow-3xl border border-slate-100">
            <Image
              src={post.featuredImage}
              alt={post.title}
              fill
              className="object-cover"
              priority
            />
          </div>
        )}

        {/* Content */}
        <div className="prose prose-slate prose-lg max-w-none 
          prose-headings:font-black prose-headings:tracking-tight prose-headings:text-slate-900
          prose-p:text-slate-600 prose-p:font-medium prose-p:leading-relaxed
          prose-strong:text-slate-900 prose-strong:font-black
          prose-a:text-primary prose-a:font-bold prose-a:no-underline hover:prose-a:underline
          prose-img:rounded-[2rem] prose-img:border prose-img:border-slate-100
          prose-ul:list-disc prose-li:text-slate-600 prose-li:font-medium
          mb-24">
          <div dangerouslySetInnerHTML={{ __html: post.content }} />
        </div>

        {/* Social Share Footer */}
        <div className="bg-slate-50 rounded-[3rem] p-10 md:p-16 border border-slate-100 text-center">
            <h3 className="text-2xl font-black text-slate-900 mb-8 tracking-tight">Enjoyed this insight? Share with your network.</h3>
            <div className="flex justify-center gap-4">
                {[Facebook, Twitter, Linkedin].map((Icon, i) => (
                    <button key={i} className="w-14 h-14 rounded-2xl bg-white border border-slate-100 shadow-sm flex items-center justify-center text-slate-400 hover:text-primary hover:-translate-y-1 transition-all">
                        <Icon className="w-6 h-6" />
                    </button>
                ))}
            </div>
        </div>

        {/* CTA */}
        <div className="mt-32 p-12 bg-primary-gradient rounded-[3rem] text-center shadow-glow text-white">
            <h2 className="text-3xl md:text-4xl font-black mb-6 tracking-tight">Ready to engineer your clinic's growth?</h2>
            <p className="text-white/80 font-medium mb-10 max-w-2xl mx-auto text-lg">Book your strategy session with our medical growth leads today.</p>
            <Link href="/#audit">
                <Button variant="outline" className="bg-white text-primary border-none text-xs font-black uppercase tracking-widest px-10 py-5 rounded-3xl hover:bg-slate-50 transition-all">
                    Get Free Audit
                </Button>
            </Link>
        </div>
      </div>
    </article>
  );
}
