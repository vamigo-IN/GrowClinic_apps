import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/Button";

export default async function AdminProjects() {
  const session = await auth();
  if (!session) redirect("/admin/login");

  const projects = await prisma.project.findMany({
    orderBy: { createdAt: "desc" },
  });

  return (
    <div>
      <div className="flex justify-between items-center mb-8">
        <h2 className="text-2xl font-bold text-gray-900">Project Showcase</h2>
        <Link href="/admin/projects/new">
          <Button variant="primary">Add New Project</Button>
        </Link>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50 text-gray-500 text-xs font-semibold uppercase tracking-wider text-left">
              <tr>
                <th className="px-6 py-4">Title</th>
                <th className="px-6 py-4">Doctor</th>
                <th className="px-6 py-4">Growth</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200 text-sm text-gray-700">
              {projects.map((project) => (
                <tr key={project.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      {project.logoUrl && (
                        <img src={project.logoUrl} alt="" className="w-8 h-8 rounded-full border bg-gray-50" />
                      )}
                      <div>
                        <p className="font-semibold text-gray-900">{project.title}</p>
                        <p className="text-xs text-gray-500">{project.specialty || "General"}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {project.doctorName}
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-primary font-bold">{project.growth}</span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {project.published ? (
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
                    <Link href={`/admin/projects/${project.id}`} className="text-primary hover:text-primary-light">
                      Edit Case Study
                    </Link>
                  </td>
                </tr>
              ))}
              {projects.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-gray-500">
                    No projects found. Add your first success story!
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
