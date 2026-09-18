import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { ClientEditor } from "@/components/admin/ClientEditor";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function AdminEditClientPage({ params }: PageProps) {
  const { id } = await params;
  const session = await auth();
  if (!session) redirect("/admin/login");

  const client = await prisma.clientLogo.findUnique({ where: { id } });
  if (!client) notFound();

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h2 className="text-2xl font-bold text-[var(--a-bright)]">Edit Client</h2>
          <p className="text-[var(--a-muted)] text-sm mt-1">Updating {client.name}.</p>
        </div>
        <Link href="/admin/clients">
          <Button variant="outline">Back to Clients</Button>
        </Link>
      </div>
      <ClientEditor id={id} initialData={client} />
    </div>
  );
}
