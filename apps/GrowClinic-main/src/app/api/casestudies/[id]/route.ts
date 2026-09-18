import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { apiGuard } from "@/lib/guards";
import { revalidateCaseStudies } from "@/lib/revalidate";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const casestudy = await prisma.caseStudy.findUnique({
      where: { id },
    });
    // Unpublished case studies are only visible to signed-in users (admin editor).
    if (!casestudy || (!casestudy.published && !(await auth())?.user)) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    return NextResponse.json(casestudy);
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch case study" }, { status: 500 });
  }
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const session = await apiGuard("admin");
    if (session instanceof NextResponse) return session;

    const data = await req.json();
    const updated = await prisma.caseStudy.update({
      where: { id },
      data: {
        title: data.title,
        slug: data.slug,
        clientName: data.clientName,
        category: data.category || null,
        services: data.services || null,
        location: data.location || null,
        specialty: data.specialty || null,
        challenge: data.challenge,
        solution: data.solution,
        results: data.results,
        metrics: data.metrics || null,
        clientQuote: data.clientQuote || null,
        clientQuoteAuthor: data.clientQuoteAuthor || null,
        imageUrl: data.imageUrl,
        metaDescription: data.metaDescription || null,
        focusKeyword: data.focusKeyword || null,
        published: data.published,
      },
    });

    revalidateCaseStudies(updated.slug);
    return NextResponse.json(updated);
  } catch (error: any) {
    console.error("Error updating case study:", error);
    if (error?.code === "P2002") {
      return NextResponse.json({ error: "Slug must be unique" }, { status: 400 });
    }
    return NextResponse.json({ error: "Failed to update case study" }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const session = await apiGuard("admin");
    if (session instanceof NextResponse) return session;

    await prisma.caseStudy.delete({
      where: { id },
    });

    revalidateCaseStudies();
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Error deleting case study:", error);
    return NextResponse.json({ error: "Failed to delete case study" }, { status: 500 });
  }
}
