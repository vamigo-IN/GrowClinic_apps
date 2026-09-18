import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiGuard } from "@/lib/guards";
import { submitToIndexNow, blogUrl } from "@/lib/indexnow";
import { revalidateBlog } from "@/lib/revalidate";

// GET /api/posts — admin post list (includes drafts, so signed-in users only;
// the public blog reads published posts directly from the database).
export async function GET() {
  const guard = await apiGuard("session");
  if (guard instanceof NextResponse) return guard;
  try {
    const posts = await prisma.post.findMany({
      include: { tags: true },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json(posts);
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch posts" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await apiGuard("editor");
    if (session instanceof NextResponse) return session;

    const { title, slug, content, excerpt, featuredImage, category, published, scheduledFor, tags,
      metaDescription, focusKeyword, secondaryKeywords, canonicalUrl, ogTitle, ogDescription, ogImage, noIndex } = await req.json();

    if (!title || !slug || !content) {
      return NextResponse.json({ error: "Title, slug, and content are required" }, { status: 400 });
    }

    // Handle tag connections
    const tagConnections = Array.isArray(tags) 
      ? tags.map((tagName: string) => ({
          where: { name: tagName },
          create: { name: tagName, slug: tagName.toLowerCase().replace(/[^a-z0-9]+/g, "-") },
        }))
      : [];

    const post = await prisma.post.create({
      data: {
        title,
        slug,
        content,
        excerpt,
        featuredImage,
        category,
        published: published || false,
        scheduledFor: scheduledFor ? new Date(scheduledFor) : null,
        // Stamp the go-live moment so blog date + ordering reflect publish, not draft creation.
        publishedAt: published ? new Date() : null,
        metaDescription: metaDescription || null,
        focusKeyword: focusKeyword || null,
        secondaryKeywords: secondaryKeywords || null,
        canonicalUrl: canonicalUrl || null,
        ogTitle: ogTitle || null,
        ogDescription: ogDescription || null,
        ogImage: ogImage || null,
        noIndex: !!noIndex,
        authorId: session.user.id,
        tags: {
          connectOrCreate: tagConnections,
        },
      },
      include: { tags: true },
    });

    if (post.published) {
      await submitToIndexNow([blogUrl(post.slug), "https://www.growclinic.io/blog"]);
    }

    revalidateBlog(post.slug);
    return NextResponse.json(post, { status: 201 });
  } catch (error: any) {
    console.error("Error creating post:", error);
    if (error.code === 'P2002') {
       return NextResponse.json({ error: "Slug must be unique" }, { status: 400 });
    }
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
