import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { DeleteButton } from "@/components/admin/DeleteButton";
import { deleteCaseStudy } from "../actions";

export default async function AdminCaseStudies() {
  const session = await auth();
  if (!session) redirect("/admin/login");

  const casestudies = await prisma.caseStudy.findMany({
    orderBy: { createdAt: "desc" },
  });

  return (
    <div>
      <div className="flex justify-between items-center mb-8">
        <h2 className="text-2xl font-bold text-[var(--a-bright)]">Case Studies</h2>
        <Link href="/admin/casestudies/new">
          <Button variant="primary">Add New Case Study</Button>
        </Link>
      </div>

      <div className="bg-[var(--a-panel)] rounded-xl shadow-sm border border-[var(--a-border)] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-[var(--a-bg)] text-[var(--a-muted)] text-xs font-semibold uppercase tracking-wider text-left">
              <tr>
                <th className="px-6 py-4">Title</th>
                <th className="px-6 py-4">Client</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-[var(--a-panel)] divide-y divide-gray-200 text-sm text-[var(--a-text)]">
              {casestudies.map((casestudy) => (
                <tr key={casestudy.id} className="hover:bg-[var(--a-hover)] transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      {casestudy.imageUrl && (
                        <img src={casestudy.imageUrl} alt="" className="w-8 h-8 rounded-full border bg-[var(--a-bg)]" />
                      )}
                      <div>
                        <p className="font-semibold text-[var(--a-bright)]">{casestudy.title}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {casestudy.clientName}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {casestudy.published ? (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                        Published
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                        Draft
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex items-center justify-end gap-3">
                      <Link href={`/admin/casestudies/${casestudy.id}`} className="text-primary hover:text-primary-light transition-colors">
                        Edit
                      </Link>
                      <DeleteButton id={casestudy.id} onDelete={deleteCaseStudy} itemName="case study" />
                    </div>
                  </td>
                </tr>
              ))}
              {casestudies.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center text-[var(--a-muted)]">
                    No case studies found. Add your first success story!
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
