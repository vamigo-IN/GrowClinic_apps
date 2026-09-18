import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/guards";
import { UsersManager } from "./UsersManager";

export const dynamic = "force-dynamic";

export default async function UsersPage() {
  const session = await requireAdmin();

  const rows = await prisma.user.findMany({
    orderBy: { createdAt: "asc" },
    select: { id: true, name: true, email: true, role: true, createdAt: true },
  });

  const users = rows.map((u) => ({
    id: u.id,
    name: u.name,
    email: u.email,
    role: (u as { role?: string }).role ?? "viewer",
    createdAt: u.createdAt.toISOString(),
  }));

  return <UsersManager users={users} currentUserId={session.user.id} />;
}
