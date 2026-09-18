"use server";

import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { assertAdmin } from "@/lib/guards";
import { revalidatePath } from "next/cache";

const ROLES = ["admin", "manager", "viewer"] as const;
type ActionResult = { ok: boolean; error?: string };

function cleanRole(v: unknown): (typeof ROLES)[number] {
  const r = String(v || "").toLowerCase();
  return (ROLES as readonly string[]).includes(r) ? (r as (typeof ROLES)[number]) : "viewer";
}

export async function createUser(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  try {
    await assertAdmin();
    const name = String(formData.get("name") || "").trim();
    const email = String(formData.get("email") || "").trim().toLowerCase();
    const password = String(formData.get("password") || "");
    const role = cleanRole(formData.get("role"));

    if (!name || !email || !password) return { ok: false, error: "Name, email and password are required." };
    if (password.length < 8) return { ok: false, error: "Password must be at least 8 characters." };

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) return { ok: false, error: "A user with that email already exists." };

    const hashed = await bcrypt.hash(password, 10);
    await prisma.user.create({ data: { name, email, password: hashed, role } });
    revalidatePath("/admin/users");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Failed to create user." };
  }
}

export async function updateUserRole(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  try {
    const session = await assertAdmin();
    const id = String(formData.get("id") || "");
    const role = cleanRole(formData.get("role"));
    if (!id) return { ok: false, error: "Missing user id." };

    // Never let the last admin be demoted (lock-out protection).
    if (role !== "admin") {
      const target = await prisma.user.findUnique({ where: { id } });
      if (target?.role === "admin") {
        const adminCount = await prisma.user.count({ where: { role: "admin" } });
        if (adminCount <= 1) return { ok: false, error: "Cannot demote the last remaining admin." };
      }
      if (id === session.user.id) return { ok: false, error: "You can't change your own role." };
    }

    await prisma.user.update({ where: { id }, data: { role } });
    revalidatePath("/admin/users");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Failed to update role." };
  }
}

export async function resetPassword(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  try {
    await assertAdmin();
    const id = String(formData.get("id") || "");
    const password = String(formData.get("password") || "");
    if (!id) return { ok: false, error: "Missing user id." };
    if (password.length < 8) return { ok: false, error: "Password must be at least 8 characters." };
    await prisma.user.update({ where: { id }, data: { password: await bcrypt.hash(password, 10) } });
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Failed to reset password." };
  }
}

export async function deleteUser(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  try {
    const session = await assertAdmin();
    const id = String(formData.get("id") || "");
    if (!id) return { ok: false, error: "Missing user id." };
    if (id === session.user.id) return { ok: false, error: "You can't delete your own account." };

    const target = await prisma.user.findUnique({ where: { id } });
    if (!target) return { ok: false, error: "User not found." };
    if (target.role === "admin") {
      const adminCount = await prisma.user.count({ where: { role: "admin" } });
      if (adminCount <= 1) return { ok: false, error: "Cannot delete the last remaining admin." };
    }

    // Reassign any authored posts to the acting admin so the FK stays valid.
    await prisma.post.updateMany({ where: { authorId: id }, data: { authorId: session.user.id } });
    await prisma.user.delete({ where: { id } });
    revalidatePath("/admin/users");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Failed to delete user." };
  }
}
