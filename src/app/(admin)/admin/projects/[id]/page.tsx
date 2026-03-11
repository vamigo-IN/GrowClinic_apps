import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import { ProjectEditor } from "@/components/admin/ProjectEditor";
import Link from "next/link";
import { Button } from "@/components/ui/Button";

export default async function AdminProjectEditPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const session = await auth();
    if (!session) redirect("/admin/login");

    const isNew = id === "new";
    let project = null;

    if (!isNew) {
        project = await prisma.project.findUnique({
            where: { id: id }
        });
        if (!project) notFound();
    }

    return (
        <div className="max-w-6xl mx-auto">
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h2 className="text-2xl font-bold text-gray-900">
                        {isNew ? "Create New Project Case Study" : `Edit: ${project?.title}`}
                    </h2>
                    <p className="text-gray-500 text-sm mt-1">
                        {isNew ? "Fill in the details to add a new success story to your showcase." : "Update the project details, growth metrics, and case study content."}
                    </p>
                </div>
                <Link href="/admin/projects">
                    <Button variant="outline">Back to Projects</Button>
                </Link>
            </div>

            <ProjectEditor id={id} initialData={project} />
        </div>
    );
}
