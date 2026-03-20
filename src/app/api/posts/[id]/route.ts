import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

interface Params {
  params: Promise<{ id: string }>;
}

// GET /api/posts/[id] - Fetch a single post by ID
export async function GET(req: Request, { params }: Params) {
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
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const { title, slug, content, excerpt, featuredImage, category, published, tags } = await req.json();

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
        tags: {
          set: [], // disconnect all
          connectOrCreate: tagConnections,
        },
      },
      include: { tags: true },
    });

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
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    await prisma.post.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: "Failed to delete post" }, { status: 500 });
  }
}
