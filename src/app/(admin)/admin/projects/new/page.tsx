import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { ProjectEditor } from "@/components/admin/ProjectEditor";
import Link from "next/link";
import { Button } from "@/components/ui/Button";

export default async function NewProjectPage() {
    const session = await auth();
    if (!session) redirect("/admin/login");

    return (
        <div className="max-w-6xl mx-auto">
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h2 className="text-2xl font-bold text-gray-900">Create New Project Case Study</h2>
                    <p className="text-gray-500 text-sm mt-1">
                        Fill in the details to add a new success story to your showcase.
                    </p>
                </div>
                <Link href="/admin/projects">
                    <Button variant="outline">Back to Projects</Button>
                </Link>
            </div>

            <ProjectEditor id="new" />
        </div>
    );
}
