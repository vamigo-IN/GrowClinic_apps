import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { apiGuard } from "@/lib/guards";

type Params = { params: Promise<{ id: string }> };

// GET /api/clientlogos/[id]
export async function GET(_req: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    const logo = await prisma.clientLogo.findUnique({ where: { id } });
    // Unpublished logos are only visible to signed-in users (admin editor).
    if (!logo || (!logo.published && !(await auth())?.user)) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    return NextResponse.json(logo);
  } catch (error) {
    console.error("Error fetching client logo:", error);
    return NextResponse.json({ error: "Failed to fetch client logo" }, { status: 500 });
  }
}

// PATCH /api/clientlogos/[id]
export async function PATCH(request: NextRequest, { params }: Params) {
  try {
    const session = await apiGuard("editor");
    if (session instanceof NextResponse) return session;
    const { id } = await params;
    const data = await request.json();
    const logo = await prisma.clientLogo.update({
      where: { id },
      data: {
        name: data.name,
        logoUrl: data.logoUrl ?? null,
        website: data.website ?? null,
        order: data.order ?? 0,
        published: data.published ?? true,
      },
    });
    revalidatePath("/");
    return NextResponse.json(logo);
  } catch (error) {
    console.error("Error updating client logo:", error);
    return NextResponse.json({ error: "Failed to update client logo" }, { status: 500 });
  }
}

// DELETE /api/clientlogos/[id]
export async function DELETE(_req: NextRequest, { params }: Params) {
  try {
    const session = await apiGuard("editor");
    if (session instanceof NextResponse) return session;
    const { id } = await params;
    await prisma.clientLogo.delete({ where: { id } });
    revalidatePath("/");
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Error deleting client logo:", error);
    return NextResponse.json({ error: "Failed to delete client logo" }, { status: 500 });
  }
}
