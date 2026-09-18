import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { apiGuard } from "@/lib/guards";
import { revalidateCaseStudies } from "@/lib/revalidate";

// GET /api/casestudies — signed-in users get every case study (admin list);
// anyone else only published ones.
export async function GET() {
  try {
    const session = await auth();
    const casestudies = await prisma.caseStudy.findMany({
      where: session?.user ? undefined : { published: true },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json(casestudies);
  } catch (error) {
    console.error("Error fetching case studies:", error);
    return NextResponse.json({ error: "Failed to fetch case studies" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await apiGuard("admin");
    if (session instanceof NextResponse) return session;

    const data = await req.json();
    const casestudy = await prisma.caseStudy.create({
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

    revalidateCaseStudies(casestudy.slug);
    return NextResponse.json(casestudy);
  } catch (error: any) {
    console.error("Error creating case study:", error);
    if (error?.code === "P2002") {
      return NextResponse.json({ error: "Slug must be unique" }, { status: 400 });
    }
    return NextResponse.json({ error: "Failed to create case study" }, { status: 500 });
  }
}
