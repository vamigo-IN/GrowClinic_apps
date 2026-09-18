import { ReactNode } from "react";
import Link from "next/link";
import { auth, signOut } from "@/lib/auth";
import { redirect } from "next/navigation";
import { ThemeToggle } from "@/components/admin/ThemeToggle";
import { ToastProvider } from "@/components/ui/ToastProvider";

export const dynamic = "force-dynamic";

const NAV = [
  {
    section: "overview",
    items: [
      { href: "/admin/dashboard", label: "Dashboard", icon: "M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" },
    ],
  },
  {
    section: "operations",
    items: [
      { href: "/admin/inquiries", label: "Inquiries", icon: "M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" },
      { href: "/admin/audits", label: "Audit Submissions", icon: "M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" },
    ],
  },
  {
    section: "content",
    items: [
      { href: "/admin/posts", label: "Blog Articles", icon: "M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" },
      { href: "/admin/casestudies", label: "Case Studies", icon: "M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" },
      { href: "/admin/testimonials", label: "Testimonials", icon: "M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" },
      { href: "/admin/clients", label: "Client Logos", icon: "M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" },
    ],
  },
  {
    section: "system",
    items: [
      { href: "/admin/users", label: "Users & Access", icon: "M17 20h5v-1a4 4 0 00-4-4h-1m-6 5H4v-1a4 4 0 014-4h3m6-4a3 3 0 11-6 0 3 3 0 016 0zm6 1a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0zM7 13a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z", adminOnly: true },
      { href: "/admin/profile", label: "Profile", icon: "M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" },
      { href: "/admin/settings", label: "Tracking & Code", icon: "M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z M15 12a3 3 0 11-6 0 3 3 0 016 0z", adminOnly: true },
      { href: "/admin/integrations", label: "Integrations", icon: "M13 10V3L4 14h7v7l9-11h-7z", adminOnly: true },
    ],
  },
];

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const session = await auth();
  if (!session) redirect("/admin/login");

  return (
    <ToastProvider>
      <div className="admin h-screen overflow-hidden flex bg-[var(--a-bg)] text-[var(--a-text)] font-sans antialiased selection:bg-[var(--a-accent-bg)]">
      {/* Apply the saved theme before paint (no flash) */}
      <script
        dangerouslySetInnerHTML={{
          __html:
            "(function(){try{if(localStorage.getItem('admin-theme')==='light'){document.currentScript.parentElement.classList.add('light');}}catch(e){}})();",
        }}
      />

      {/* ── Sidebar ── */}
      <aside className="admin-nav w-60 shrink-0 bg-[var(--a-sidebar)] border-r border-[var(--a-border)] flex flex-col">
        <div className="h-14 flex items-center px-5 border-b border-[var(--a-border)]">
          <Link href="/admin/dashboard" className="flex items-center gap-2">
            <span className="text-[15px] font-bold tracking-tight text-[var(--a-bright)]">
              Grow<span className="text-[var(--a-accent)]">Clinic</span>
            </span>
            <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-[var(--a-hover)] text-[var(--a-muted)] border border-[var(--a-border)]">admin</span>
          </Link>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 py-4">
          {NAV.map((group) => (
            <div key={group.section}>
              <div className="font-mono text-[10px] font-semibold text-[var(--a-faint)] uppercase tracking-[0.18em] px-3 mt-5 mb-1.5 first:mt-1">
                {group.section}
              </div>
              {group.items
                .filter((item) => !(item as { adminOnly?: boolean }).adminOnly || session.user.role === "admin")
                .map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="group flex items-center gap-2.5 px-3 py-2 rounded-md text-[13px] text-[var(--a-muted)] hover:bg-[var(--a-hover)] hover:text-[var(--a-accent)] transition-colors"
                >
                  <svg className="w-4 h-4 text-[var(--a-faint)] group-hover:text-[var(--a-accent)] transition-colors shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d={item.icon} />
                  </svg>
                  {item.label}
                </Link>
              ))}
            </div>
          ))}
        </nav>

        <div className="p-3 border-t border-[var(--a-border)]">
          <form
            action={async () => {
              "use server";
              await signOut({ redirectTo: "/admin/login" });
            }}
          >
            <button type="submit" className="group flex w-full items-center gap-2.5 px-3 py-2 rounded-md text-[13px] text-[var(--a-muted)] hover:bg-rose-500/10 hover:text-rose-400 transition-colors">
              <svg className="w-4 h-4 text-[var(--a-faint)] group-hover:text-rose-400 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
              Sign out
            </button>
          </form>
        </div>
      </aside>

      {/* ── Main ── */}
      <main className="flex-1 flex flex-col min-w-0">
        <header className="h-14 shrink-0 sticky top-0 z-10 flex items-center justify-between px-6 bg-[var(--a-bg)] backdrop-blur border-b border-[var(--a-border)]">
          <div className="flex items-center gap-2 font-mono text-[12px] text-[var(--a-muted)]">
            <span className="flex h-1.5 w-1.5 rounded-full bg-[var(--a-accent)]" />
            <span className="text-[var(--a-text)]">{session.user?.name?.split(" ")[0] || "admin"}</span>
            <span className="text-[var(--a-faint)]">@growclinic</span>
          </div>
          <div className="flex items-center gap-3">
            <ThemeToggle />
            <Link href="/admin/profile" className="group" title="Profile">
              <div className="w-8 h-8 rounded-md bg-[var(--a-accent-bg)] border border-[var(--a-accent)]/30 flex items-center justify-center text-[var(--a-accent)] font-mono text-xs font-bold transition-colors">
                {(session.user?.name?.charAt(0) || "A").toUpperCase()}
              </div>
            </Link>
          </div>
        </header>

        <div className="flex-1 overflow-auto p-6">
          <div className="max-w-[1200px] mx-auto">{children}</div>
        </div>
      </main>
    </div>
    </ToastProvider>
  );
}
