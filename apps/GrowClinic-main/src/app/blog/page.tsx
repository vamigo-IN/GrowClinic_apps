// ISR: render once, then re-render at most every 5 min. Public content
// mutations call revalidatePath (see src/lib/revalidate.ts) to update sooner.
export const revalidate = 300;
import { prisma } from "@/lib/prisma";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { Sparkles } from "lucide-react";
import { BlogExplorer, type BlogItem } from "@/components/blog/BlogExplorer";
import { publishDueScheduled } from "@/lib/schedule";

export const metadata = {
  title: "Blog & Healthcare Insights",
  description: "Expert insights on medical practice growth, patient acquisition, and healthcare technology.",
};

const FALLBACK_IMAGE =
  "https://images.unsplash.com/photo-1576091160550-217359f4ecf8?auto=format&fit=crop&q=80";

export default async function BlogPage() {
  // Never let a brief DB outage 500 this page — a 5xx on a public route can
  // trip the host's health check and restart the app. Degrade to an empty
  // list instead so the page always renders.
  let posts: Array<{
    id: string; slug: string; title: string; excerpt: string | null;
    featuredImage: string | null; category: string | null; content: string;
    createdAt: Date; publishedAt: Date | null;
  }> = [];
  try {
    await publishDueScheduled();
    posts = await prisma.post.findMany({
      where: { published: true },
      orderBy: [{ publishedAt: "desc" }, { createdAt: "desc" }],
      select: {
        id: true,
        slug: true,
        title: true,
        excerpt: true,
        featuredImage: true,
        category: true,
        content: true,
        createdAt: true,
        publishedAt: true,
      },
    });
  } catch (e) {
    console.error("BlogPage: DB unavailable, rendering empty list.", e);
  }

  const items: BlogItem[] = posts.map((p) => ({
    id: p.id,
    slug: p.slug,
    title: p.title,
    excerpt:
      p.excerpt ||
      p.content.replace(/<[^>]*>?/gm, "").substring(0, 150).replace(/[#*]/g, "") + "…",
    featuredImage: p.featuredImage || FALLBACK_IMAGE,
    category: p.category || "Insights",
    date: new Date(p.publishedAt ?? p.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
    readingTime: Math.max(
      1,
      Math.ceil(p.content.replace(/<[^>]*>?/gm, "").split(/\s+/).filter(Boolean).length / 200),
    ),
  }));

  const categories = [...new Set(posts.map((p) => p.category).filter(Boolean))] as string[];

  return (
    <main className="relative overflow-hidden pb-20 pt-28">
      {/* Background decorations */}
      <div className="absolute right-0 top-0 -z-10 h-[600px] w-[600px] rounded-full bg-primary/5 blur-3xl" />
      <div className="absolute left-0 top-[400px] -z-10 h-[500px] w-[500px] rounded-full bg-primary/[0.03] blur-3xl" />

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-10 text-center">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-primary/10 bg-primary/5 px-4 py-2 text-size-tiny text-weight-bold uppercase tracking-widest text-primary">
            <Sparkles className="h-3.5 w-3.5" />
            Knowledge Hub
          </div>
          <SectionHeading
            title="Insights &"
            highlight="Intelligence"
            subtitle="The latest strategies in medical growth and clinic engineering."
            level="h1"
          />
        </div>

        <BlogExplorer posts={items} categories={categories} />
      </div>
    </main>
  );
}
