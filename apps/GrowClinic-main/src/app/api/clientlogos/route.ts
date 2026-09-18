import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiGuard } from "@/lib/guards";

// GET /api/clientlogos — list all published client logos ordered by `order`
export async function GET() {
  try {
    const logos = await prisma.clientLogo.findMany({
      where: { published: true },
      orderBy: [{ order: "asc" }, { createdAt: "asc" }],
    });
    return NextResponse.json(logos);
  } catch (error) {
    console.error("Error fetching client logos:", error);
    return NextResponse.json({ error: "Failed to fetch client logos" }, { status: 500 });
  }
}

// POST /api/clientlogos — create a new client logo entry
export async function POST(request: NextRequest) {
  try {
    const session = await apiGuard("editor");
    if (session instanceof NextResponse) return session;
    const data = await request.json();
    const logo = await prisma.clientLogo.create({
      data: {
        name: data.name,
        logoUrl: data.logoUrl || null,
        website: data.website || null,
        order: data.order ?? 0,
        published: data.published ?? true,
      },
    });
    return NextResponse.json(logo, { status: 201 });
  } catch (error) {
    console.error("Error creating client logo:", error);
    return NextResponse.json({ error: "Failed to create client logo" }, { status: 500 });
  }
}
