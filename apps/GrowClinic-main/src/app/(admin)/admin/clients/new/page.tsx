import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { ClientEditor } from "@/components/admin/ClientEditor";

export default async function AdminNewClientPage() {
  const session = await auth();
  if (!session) redirect("/admin/login");

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h2 className="text-2xl font-bold text-[var(--a-bright)]">Add Client</h2>
          <p className="text-[var(--a-muted)] text-sm mt-1">
            Upload a logo and name — it will appear in the homepage client marquee.
          </p>
        </div>
        <Link href="/admin/clients">
          <Button variant="outline">Back to Clients</Button>
        </Link>
      </div>
      <ClientEditor id="new" />
    </div>
  );
}
