import type { Session } from "next-auth";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { NextResponse } from "next/server";

export type Role = "admin" | "manager" | "viewer";

/** Roles allowed to create, edit or delete site content. `viewer` is read-only. */
export const EDITOR_ROLES: readonly string[] = ["admin", "manager"];

/** Returns the current session or redirects to login if there is none. */
export async function requireSession() {
  const session = await auth();
  if (!session?.user) redirect("/admin/login");
  return session;
}

/**
 * Admin-only guard. Redirects non-admins away from privileged pages.
 * Use at the top of any admin-only server component (e.g. user management).
 */
export async function requireAdmin() {
  const session = await requireSession();
  if (session.user.role !== "admin") {
    redirect("/admin/dashboard?denied=1");
  }
  return session;
}

/**
 * Throwing variant for server actions that any signed-in user may call.
 * Server actions are public POST endpoints — page-level guards don't protect them.
 */
export async function assertSession() {
  const session = await auth();
  if (!session?.user) throw new Error("Not authenticated");
  return session;
}

/** Throwing variant for server actions that change content (admin or manager). */
export async function assertEditor() {
  const session = await assertSession();
  if (!EDITOR_ROLES.includes(session.user.role)) throw new Error("Forbidden: read-only account");
  return session;
}

/** Throwing variant for server actions — never let a non-admin mutate. */
export async function assertAdmin() {
  const session = await auth();
  if (!session?.user) throw new Error("Not authenticated");
  if (session.user.role !== "admin") throw new Error("Forbidden: admin only");
  return session;
}

/**
 * Route-handler guard. Returns the session, or a 401/403 response to return as-is:
 *   const guard = await apiGuard("editor"); if (guard instanceof NextResponse) return guard;
 */
export async function apiGuard(level: "session" | "editor" | "admin" = "session"): Promise<Session | NextResponse> {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const role = session.user.role;
  if ((level === "editor" && !EDITOR_ROLES.includes(role)) || (level === "admin" && role !== "admin")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  return session;
}
