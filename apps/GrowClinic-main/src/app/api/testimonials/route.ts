import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiGuard } from "@/lib/guards";
import { revalidatePath } from "next/cache";

export async function GET() {
  try {
    const testimonials = await prisma.testimonial.findMany({
      where: { published: true },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json(testimonials);
  } catch (error) {
    console.error("Error fetching testimonials:", error);
    return NextResponse.json({ error: "Failed to fetch testimonials" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await apiGuard("editor");
    if (session instanceof NextResponse) return session;

    const data = await request.json();
    const testimonial = await prisma.testimonial.create({
      data: {
        name: data.name,
        role: data.role,
        company: data.company,
        content: data.content,
        avatarUrl: data.avatarUrl,
        rating: Number(data.rating) || 5,
        featured: data.featured || false,
        published: data.published !== undefined ? data.published : true,
      },
    });

    revalidatePath("/");
    revalidatePath("/testimonials");

    return NextResponse.json(testimonial);
  } catch (error) {
    console.error("Error creating testimonial:", error);
    return NextResponse.json({ error: "Failed to create testimonial" }, { status: 500 });
  }
}
