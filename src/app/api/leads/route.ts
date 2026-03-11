import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Public endpoint to submit a lead from a landing page form
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { name, email, phone, source, notes } = body;

    if (!name || !email) {
      return NextResponse.json({ error: "Name and email are required" }, { status: 400 });
    }

    const lead = await prisma.lead.create({
      data: {
        name,
        email,
        phone,
        source: source || "Website Form",
        notes,
      },
    });

    return NextResponse.json({ message: "Lead captured successfully", lead }, { status: 201 });
  } catch (error) {
    console.error("Error creating lead:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
