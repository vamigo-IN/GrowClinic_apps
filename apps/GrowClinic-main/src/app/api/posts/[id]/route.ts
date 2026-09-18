import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiGuard } from "@/lib/guards";
import { submitToIndexNow, blogUrl } from "@/lib/indexnow";
import { revalidateBlog } from "@/lib/revalidate";

interface Params {
  params: Promise<{ id: string }>;
}

// GET /api/posts/[id] - Fetch a single post by ID (admin editor: drafts + author email)
export async function GET(req: Request, { params }: Params) {
  const guard = await apiGuard("session");
  if (guard instanceof NextResponse) return guard;
  try {
    const { id } = await params;
    const post = await prisma.post.findUnique({
      where: { id },
      include: { tags: true, author: { select: { name: true, email: true } } },
    });

    if (!post) {
      return NextResponse.json({ error: "Post not found" }, { status: 404 });
    }

    return NextResponse.json(post);
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch post" }, { status: 500 });
  }
}

// PUT /api/posts/[id] - Update a post
export async function PUT(req: Request, { params }: Params) {
  try {
    const session = await apiGuard("editor");
    if (session instanceof NextResponse) return session;

    const { id } = await params;
    const { title, slug, content, excerpt, featuredImage, category, published, scheduledFor, tags,
      metaDescription, focusKeyword, secondaryKeywords, canonicalUrl, ogTitle, ogDescription, ogImage, noIndex } = await req.json();

    if (!title || !slug || !content) {
      return NextResponse.json({ error: "Title, slug, and content are required" }, { status: 400 });
    }

    // Build tag connections
    const tagConnections = Array.isArray(tags)
      ? tags.map((tagName: string) => ({
          where: { name: tagName },
          create: { name: tagName, slug: tagName.toLowerCase().replace(/[^a-z0-9]+/g, "-") },
        }))
      : [];

    // Stamp publishedAt the first time a post goes live; keep it stable afterwards.
    const existing = await prisma.post.findUnique({ where: { id }, select: { publishedAt: true } });
    const willPublish = published ?? false;
    const publishedAt = willPublish ? (existing?.publishedAt ?? new Date()) : (existing?.publishedAt ?? null);

    // Disconnect all existing tags first, then reconnect
    const post = await prisma.post.update({
      where: { id },
      data: {
        title,
        slug,
        content,
        excerpt,
        featuredImage,
        category,
        published: published ?? false,
        scheduledFor: scheduledFor ? new Date(scheduledFor) : null,
        publishedAt,
        metaDescription: metaDescription || null,
        focusKeyword: focusKeyword || null,
        secondaryKeywords: secondaryKeywords || null,
        canonicalUrl: canonicalUrl || null,
        ogTitle: ogTitle || null,
        ogDescription: ogDescription || null,
        ogImage: ogImage || null,
        noIndex: !!noIndex,
        tags: {
          set: [], // disconnect all
          connectOrCreate: tagConnections,
        },
      },
      include: { tags: true },
    });

    if (post.published) {
      await submitToIndexNow([blogUrl(post.slug), "https://www.growclinic.io/blog"]);
    }

    revalidateBlog(post.slug);
    return NextResponse.json(post);
  } catch (error: any) {
    console.error("Error updating post:", error);
    if (error.code === "P2002") {
      return NextResponse.json({ error: "Slug must be unique" }, { status: 400 });
    }
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

// DELETE /api/posts/[id] - Delete a post
export async function DELETE(req: Request, { params }: Params) {
  try {
    const session = await apiGuard("editor");
    if (session instanceof NextResponse) return session;

    const { id } = await params;
    await prisma.post.delete({ where: { id } });
    revalidateBlog();
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: "Failed to delete post" }, { status: 500 });
  }
}
