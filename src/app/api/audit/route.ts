import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { fullName, clinicName, specialization, city, phone } = body;

    // Simulate some diagnostic data
    const seoScore = Math.floor(Math.random() * (85 - 40 + 1)) + 40; // 40-85
    const competitorRank = Math.floor(Math.random() * (15 - 3 + 1)) + 3; // 3-15
    const estimatedLeads = Math.floor(Math.random() * (120 - 45 + 1)) + 45; // 45-120

    const audit = await prisma.clinicAudit.create({
      data: {
        fullName,
        clinicName,
        specialization,
        city,
        phone,
        seoScore,
        competitorRank,
        estimatedLeads,
        status: "pending",
      },
    });

    return NextResponse.json({
      success: true,
      auditId: audit.id,
      report: {
        seoScore,
        competitorRank,
        estimatedLeads,
        roadmap: [
          "Optimize Google My Business Profile",
          "Fix 12 critical technical SEO issues",
          "Implement high-converting patient funnel",
          "Launch targeted local search ads"
        ]
      }
    });
  } catch (error: any) {
    console.error("Audit submission error:", error);
    return NextResponse.json({ error: "Failed to process audit request" }, { status: 500 });
  }
}

export async function GET(req: Request) {
    // Admin list will be separate, but we could put auth check here if needed
    return NextResponse.json({ error: "Method not allowed" }, { status: 405 });
}
