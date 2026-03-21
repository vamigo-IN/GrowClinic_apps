import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { ProfileForm } from "./ProfileForm";

export default async function AdminProfilePage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/admin/login");
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { name: true, email: true }
  });

  if (!user) {
    redirect("/admin/login");
  }

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-3xl font-black text-gray-900 tracking-tight">Profile Settings</h2>
        <p className="text-gray-500 mt-2">Manage your account identity and security credentials.</p>
      </div>

      <ProfileForm user={user} />
    </div>
  );
}
