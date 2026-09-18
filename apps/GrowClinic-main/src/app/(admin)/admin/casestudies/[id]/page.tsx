import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { CaseStudyEditor } from "@/components/admin/CaseStudyEditor";
import { Button } from "@/components/ui/Button";
import Link from "next/link";

export default async function CaseStudyEditPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) redirect("/admin/login");

  const { id } = await params;
  const isNew = id === "new";
  let casestudy = null;

  if (!isNew) {
    casestudy = await prisma.caseStudy.findUnique({
      where: { id },
    });

    if (!casestudy) {
      redirect("/admin/casestudies");
    }
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-2xl font-bold text-[var(--a-bright)]">
            {isNew ? "New Case Study" : "Edit Case Study"}
          </h2>
          <p className="text-sm text-[var(--a-muted)] mt-1">
            {isNew ? "Create a new case study" : casestudy?.title}
          </p>
        </div>
        <div className="flex gap-4">
          <Link href="/admin/casestudies">
            <Button variant="outline">Cancel</Button>
          </Link>
        </div>
      </div>

      <CaseStudyEditor id={id} initialData={casestudy} />
    </div>
  );
}
