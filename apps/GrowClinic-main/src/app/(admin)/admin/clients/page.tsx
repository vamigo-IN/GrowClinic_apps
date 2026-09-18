import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { DeleteButton } from "@/components/admin/DeleteButton";
import { deleteClientLogo } from "../actions";

export default async function AdminClientsPage() {
  const session = await auth();
  if (!session) redirect("/admin/login");

  const clients = await prisma.clientLogo.findMany({
    orderBy: [{ order: "asc" }, { createdAt: "asc" }],
  });

  return (
    <div>
      <div className="flex justify-between items-center mb-8">
        <div>
          <h2 className="text-2xl font-bold text-[var(--a-bright)]">Healthcare Clients</h2>
          <p className="text-[var(--a-muted)] mt-1">
            Manage the client logos shown in the scrolling marquee on the homepage.
          </p>
        </div>
        <Link href="/admin/clients/new">
          <Button variant="primary">Add Client</Button>
        </Link>
      </div>

      <div className="bg-[var(--a-panel)] rounded-xl shadow-sm border border-[var(--a-border)] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-[var(--a-border)]">
            <thead className="bg-[var(--a-bg)] text-[var(--a-muted)] text-xs font-semibold uppercase tracking-wider text-left">
              <tr>
                <th className="px-6 py-4">Logo</th>
                <th className="px-6 py-4">Client Name</th>
                <th className="px-6 py-4">Website</th>
                <th className="px-6 py-4">Order</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-[var(--a-panel)] divide-y divide-[var(--a-border)] text-sm text-[var(--a-text)]">
              {clients.map((client) => (
                <tr key={client.id} className="hover:bg-[var(--a-hover)] transition-colors">
                  <td className="px-6 py-4">
                    <div className="w-16 h-12 rounded-lg border border-[var(--a-border)] bg-[var(--a-bg)] flex items-center justify-center overflow-hidden">
                      {client.logoUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={client.logoUrl}
                          alt={client.name}
                          className="max-h-10 max-w-[56px] object-contain"
                        />
                      ) : (
                        <span className="text-[var(--a-faint)] text-xs font-bold uppercase tracking-wide">No logo</span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <p className="font-semibold text-[var(--a-bright)]">{client.name}</p>
                  </td>
                  <td className="px-6 py-4">
                    {client.website ? (
                      <a
                        href={client.website}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary hover:underline text-xs truncate max-w-[180px] block"
                      >
                        {client.website.replace(/^https?:\/\//, "")}
                      </a>
                    ) : (
                      <span className="text-[var(--a-faint)] text-xs">—</span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-[var(--a-muted)] font-mono text-xs">{client.order}</span>
                  </td>
                  <td className="px-6 py-4">
                    {client.published ? (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                        Published
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-[var(--a-hover)] text-[var(--a-muted)]">
                        Hidden
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex items-center justify-end gap-3">
                      <Link
                        href={`/admin/clients/${client.id}`}
                        className="text-primary hover:text-primary/80 transition-colors"
                      >
                        Edit
                      </Link>
                      <DeleteButton id={client.id} onDelete={deleteClientLogo} itemName="client" />
                    </div>
                  </td>
                </tr>
              ))}
              {clients.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-16 text-center text-[var(--a-muted)]">
                    No clients added yet.{" "}
                    <Link href="/admin/clients/new" className="text-primary hover:underline font-semibold">
                      Add your first client →
                    </Link>
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
