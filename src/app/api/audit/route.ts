import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { fullName, clinicName, specialization, city, phone, website, pinCode } = body;

    // We simulate highly authentic heuristic data based on user inputs
    
    // Website score is better if they provided a website. If not, it hurts their local visibility.
    const hasWebsite = Boolean(website && website.length > 5);
    const websiteHealthScore = hasWebsite ? Math.floor(Math.random() * (85 - 65 + 1)) + 65 : 20;
    
    // Local visibility gets a boost if they provided a highly specific pinCode
    const hasPinCode = Boolean(pinCode && pinCode.length > 2);
    const localVisibilityScore = hasPinCode ? Math.floor(Math.random() * (70 - 40 + 1)) + 40 : 30;
    
    const seoScore = Math.floor((websiteHealthScore + localVisibilityScore) / 2); // Blended score
    
    // Competitor rank: 1-10 string
    const competitorRank = Math.floor(Math.random() * (20 - 5 + 1)) + 5; 
    
    const estimatedLeads = Math.floor(Math.random() * (150 - 50 + 1)) + 50;
    
    // Simulate what their Google Business Profile status might be (heuristics)
    const googleBusinessStatus = hasPinCode && competitorRank < 10 ? "Optimized" : "Unclaimed or Incomplete";

    const audit = await prisma.clinicAudit.create({
      data: {
        fullName,
        clinicName,
        specialization,
        city,
        phone,
        website: website || null,
        pinCode: pinCode || "",
        seoScore,
        competitorRank,
        estimatedLeads,
        localVisibilityScore,
        websiteHealthScore,
        googleBusinessStatus,
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
        localVisibilityScore,
        websiteHealthScore,
        googleBusinessStatus,
        roadmap: [
          `Claim & verify Google My Business for ${pinCode || city}`,
          hasWebsite ? `Improve core web vitals for ${website}` : "Launch a fast, conversion-optimized clinic website",
          `Generate local citations for "${specialization} in ${city}"`,
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
