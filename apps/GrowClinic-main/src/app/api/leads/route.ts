import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isEmail, text } from "@/lib/input";

// Public endpoint to submit a lead from a landing page form
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const name = text(body?.name, 120);
    const email = text(body?.email, 254);
    const phone = text(body?.phone, 40);
    const source = text(body?.source, 64);
    const notes = text(body?.notes, 2000);

    if (!name || !email) {
      return NextResponse.json({ error: "Name and email are required" }, { status: 400 });
    }
    if (!isEmail(email)) {
      return NextResponse.json({ error: "A valid email is required" }, { status: 400 });
    }

    const lead = await prisma.lead.create({
      data: {
        name,
        email,
        phone: phone || null,
        source: source || "Website Form",
        notes: notes || null,
      },
    });

    return NextResponse.json({ message: "Lead captured successfully", lead }, { status: 201 });
  } catch (error) {
    console.error("Error creating lead:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
