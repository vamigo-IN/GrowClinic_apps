import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { apiGuard } from "@/lib/guards";
import { revalidatePath } from "next/cache";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const testimonial = await prisma.testimonial.findUnique({
      where: { id },
    });

    // Unpublished testimonials are only visible to signed-in users (admin editor).
    if (!testimonial || (!testimonial.published && !(await auth())?.user)) {
      return NextResponse.json({ error: "Testimonial not found" }, { status: 404 });
    }

    return NextResponse.json(testimonial);
  } catch (error) {
    console.error("Error fetching testimonial:", error);
    return NextResponse.json({ error: "Failed to fetch testimonial" }, { status: 500 });
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await apiGuard("editor");
    if (session instanceof NextResponse) return session;

    const { id } = await params;
    const data = await request.json();
    const testimonial = await prisma.testimonial.update({
      where: { id },
      data: {
        name: data.name,
        role: data.role,
        company: data.company,
        content: data.content,
        avatarUrl: data.avatarUrl,
        rating: data.rating !== undefined ? Number(data.rating) : undefined,
        featured: data.featured,
        published: data.published,
      },
    });

    revalidatePath("/");
    revalidatePath("/testimonials");

    return NextResponse.json(testimonial);
  } catch (error) {
    console.error("Error updating testimonial:", error);
    return NextResponse.json({ error: "Failed to update testimonial" }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await apiGuard("editor");
    if (session instanceof NextResponse) return session;

    const { id } = await params;
    await prisma.testimonial.delete({
      where: { id },
    });

    revalidatePath("/");
    revalidatePath("/testimonials");

    return NextResponse.json({ message: "Testimonial deleted successfully" });
  } catch (error) {
    console.error("Error deleting testimonial:", error);
    return NextResponse.json({ error: "Failed to delete testimonial" }, { status: 500 });
  }
}
