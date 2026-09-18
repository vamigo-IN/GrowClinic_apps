"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";

export async function updateAdminProfile(formData: FormData) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, error: "Unauthorized access detected." };
    }

    const name = formData.get("name") as string;
    const newPassword = formData.get("newPassword") as string;

    if (!name || name.trim().length === 0) {
      return { success: false, error: "Name cannot be empty." };
    }

    const updateData: { name: string; password?: string } = {
      name: name.trim(),
    };

    if (newPassword && newPassword.length > 0) {
      if (newPassword.length < 8) {
        return { success: false, error: "Password must be at least 8 characters long." };
      }
      // A stolen session alone must not be enough to take over the account.
      const currentPassword = (formData.get("currentPassword") as string) || "";
      const existing = await prisma.user.findUnique({ where: { id: session.user.id }, select: { password: true } });
      if (!existing?.password || !(await bcrypt.compare(currentPassword, existing.password))) {
        return { success: false, error: "Current password is incorrect." };
      }
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(newPassword, salt);
      updateData.password = hashedPassword;
    }

    await prisma.user.update({
      where: { id: session.user.id },
      data: updateData,
    });

    revalidatePath("/admin/profile");
    return { success: true, message: "Profile updated successfully!" };
  } catch (error) {
    console.error("Profile update error:", error);
    return { success: false, error: "Failed to update profile. Please try again." };
  }
}
