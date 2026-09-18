"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createUser, updateUserRole, deleteUser, resetPassword } from "./actions";

interface AdminUser {
  id: string;
  name: string | null;
  email: string | null;
  role: string;
  createdAt: string;
}

const ROLES = ["admin", "manager", "viewer"];
const roleClass = (r: string) =>
  r === "admin" ? "text-[var(--a-accent)] bg-emerald-400/10"
    : r === "manager" ? "text-sky-400 bg-sky-400/10"
    : "text-[var(--a-muted)] bg-[var(--a-hover)]";

const input = "rounded-md border border-[var(--a-border)] bg-[var(--a-panel)] px-3 py-2 text-[13px] text-[var(--a-text)] placeholder-[var(--a-faint)] outline-none focus:border-emerald-500/40 transition-colors";

export function UsersManager({ users, currentUserId }: { users: AdminUser[]; currentUserId: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const [form, setForm] = useState({ name: "", email: "", password: "", role: "viewer" });

  const flash = (ok: boolean, text: string) => {
    setMsg({ ok, text });
    setTimeout(() => setMsg(null), 4000);
  };

  const run = (
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    fn: (prev: any, fd: FormData) => Promise<{ ok: boolean; error?: string }>,
    fd: FormData,
    okText: string,
  ) =>
    startTransition(async () => {
      const r = await fn(undefined, fd);
      if (r.ok) { flash(true, okText); router.refresh(); }
      else flash(false, r.error || "Action failed");
    });

  const submitCreate = (e: React.FormEvent) => {
    e.preventDefault();
    const fd = new FormData();
    Object.entries(form).forEach(([k, v]) => fd.set(k, v));
    run(createUser, fd, "user created");
    setForm({ name: "", email: "", password: "", role: "viewer" });
  };

  const changeRole = (id: string, role: string) => {
    const fd = new FormData(); fd.set("id", id); fd.set("role", role);
    run(updateUserRole, fd, "role updated");
  };

  const remove = (id: string) => {
    if (!confirm("Delete this user? Their posts will be reassigned to you.")) return;
    const fd = new FormData(); fd.set("id", id);
    run(deleteUser, fd, "user deleted");
  };

  const reset = (id: string) => {
    const pw = prompt("New password (min 8 chars):");
    if (!pw) return;
    const fd = new FormData(); fd.set("id", id); fd.set("password", pw);
    run(resetPassword, fd, "password reset");
  };

  return (
    <div className="space-y-5">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-lg font-semibold text-[var(--a-bright)] tracking-tight">Users & Access</h1>
          <p className="font-mono text-xs text-[var(--a-muted)] mt-0.5">// admin-only · role-based access control</p>
        </div>
        <span className="font-mono text-[11px] text-[var(--a-muted)]">{users.length} user{users.length === 1 ? "" : "s"}</span>
      </div>

      {msg && (
        <div className={`rounded-md border px-3 py-2 font-mono text-[12px] ${msg.ok ? "border-emerald-500/20 bg-emerald-500/10 text-[var(--a-accent)]" : "border-rose-500/20 bg-rose-500/10 text-rose-400"}`}>
          {msg.ok ? "ok: " : "error: "}{msg.text}
        </div>
      )}

      {/* Add user */}
      <form onSubmit={submitCreate} className="rounded-lg border border-[var(--a-border)] bg-[var(--a-panel)] p-4">
        <div className="font-mono text-[10px] uppercase tracking-widest text-[var(--a-muted)] mb-3">add_user</div>
        <div className="grid grid-cols-1 md:grid-cols-5 gap-2.5">
          <input className={input} placeholder="name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <input className={input} type="email" placeholder="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          <input className={input} type="password" placeholder="password (min 8)" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
          <select className={input} value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
            {ROLES.map((r) => <option key={r} value={r} className="bg-[var(--a-panel)] text-[var(--a-text)]">{r}</option>)}
          </select>
          <button type="submit" disabled={pending} className="rounded-md bg-emerald-500 text-[#04241a] text-[13px] font-semibold py-2 hover:bg-emerald-400 disabled:opacity-50 transition-colors">
            {pending ? "…" : "create"}
          </button>
        </div>
      </form>

      {/* Users table */}
      <div className="rounded-lg border border-[var(--a-border)] bg-[var(--a-panel)] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left min-w-[640px]">
            <thead>
              <tr className="border-b border-[var(--a-border)] font-mono text-[10px] uppercase tracking-widest text-[var(--a-muted)]">
                <th className="px-4 py-3 font-medium">user</th>
                <th className="px-4 py-3 font-medium">role</th>
                <th className="px-4 py-3 font-medium">created</th>
                <th className="px-4 py-3 font-medium text-right">actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--a-border)]">
              {users.map((u) => (
                <tr key={u.id} className="hover:bg-[var(--a-hover)] transition-colors">
                  <td className="px-4 py-3">
                    <div className="text-[13px] text-[var(--a-text)]">
                      {u.name || "—"}{u.id === currentUserId && <span className="ml-2 font-mono text-[10px] text-[var(--a-faint)]">(you)</span>}
                    </div>
                    <div className="font-mono text-[11px] text-[var(--a-muted)]">{u.email}</div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <span className={`font-mono text-[10px] uppercase px-1.5 py-0.5 rounded ${roleClass(u.role)}`}>{u.role}</span>
                      <select
                        defaultValue={u.role}
                        disabled={pending || u.id === currentUserId}
                        onChange={(e) => changeRole(u.id, e.target.value)}
                        className="rounded-md border border-[var(--a-border)] bg-[var(--a-panel)] px-1.5 py-1 text-[11px] text-[var(--a-text)] outline-none focus:border-emerald-500/40 disabled:opacity-40"
                        title={u.id === currentUserId ? "You can't change your own role" : "Change role"}
                      >
                        {ROLES.map((r) => <option key={r} value={r} className="bg-[var(--a-panel)] text-[var(--a-text)]">{r}</option>)}
                      </select>
                    </div>
                  </td>
                  <td className="px-4 py-3 font-mono text-[11px] text-[var(--a-muted)] whitespace-nowrap">
                    {new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", year: "2-digit" }).format(new Date(u.createdAt))}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-2 font-mono text-[11px]">
                      <button onClick={() => reset(u.id)} disabled={pending} className="text-[var(--a-muted)] hover:text-[var(--a-accent)] transition-colors disabled:opacity-40">reset_pw</button>
                      <button onClick={() => remove(u.id)} disabled={pending || u.id === currentUserId} className="text-[var(--a-muted)] hover:text-rose-400 transition-colors disabled:opacity-30">delete</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
