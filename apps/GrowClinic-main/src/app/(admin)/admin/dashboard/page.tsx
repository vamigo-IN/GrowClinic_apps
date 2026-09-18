import { prisma } from "@/lib/prisma";
import Link from "next/link";

export default async function AdminDashboard() {
  const totalInquiries = await prisma.contactMessage.count();
  const totalAudits = await prisma.clinicAudit.count();

  const recentInquiries = await prisma.contactMessage.findMany({ take: 5, orderBy: { createdAt: "desc" } });
  const recentAudits = await prisma.clinicAudit.findMany({ take: 5, orderBy: { createdAt: "desc" } });

  const fmt = (date: Date) =>
    new Intl.DateTimeFormat("en-IN", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }).format(new Date(date));

  const stats = [
    { label: "audit_requests", value: totalAudits, href: "/admin/audits", accent: "text-[var(--a-accent)]" },
    { label: "contact_inquiries", value: totalInquiries, href: "/admin/inquiries", accent: "text-sky-400" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-lg font-semibold text-[var(--a-bright)] tracking-tight">Dashboard</h1>
          <p className="font-mono text-xs text-[var(--a-muted)] mt-0.5">// real-time acquisition pipeline</p>
        </div>
        <span className="font-mono text-[11px] text-[var(--a-accent)]/80 flex items-center gap-1.5">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" /> operational
        </span>
      </div>

      {/* Metric cards */}
      <div className="grid grid-cols-2 gap-4">
        {stats.map((s) => (
          <Link
            key={s.label}
            href={s.href}
            className="group rounded-lg border border-[var(--a-border)] bg-[var(--a-panel)] p-5 hover:border-[var(--a-border)] transition-colors"
          >
            <div className="font-mono text-[11px] uppercase tracking-widest text-[var(--a-muted)]">{s.label}</div>
            <div className={`mt-2 font-mono text-4xl font-bold tabular-nums ${s.accent}`}>{String(s.value).padStart(2, "0")}</div>
            <div className="mt-3 font-mono text-[11px] text-[var(--a-faint)] group-hover:text-[var(--a-muted)] transition-colors">view →</div>
          </Link>
        ))}
      </div>

      {/* Recent activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Panel title="recent_audits" href="/admin/audits" accent="text-[var(--a-accent)]" empty="no_audits">
          {recentAudits.map((a) => (
            <Row key={a.id} href="/admin/audits" left={a.clinicName} sub={a.fullName} meta={fmt(a.createdAt)}
              chip={a.status} chipClass={a.status === "pending" ? "text-amber-400 bg-amber-400/10" : "text-[var(--a-accent)] bg-emerald-400/10"} />
          ))}
        </Panel>

        <Panel title="recent_inquiries" href="/admin/inquiries" accent="text-sky-400" empty="no_inquiries">
          {recentInquiries.map((q) => (
            <Row key={q.id} href="/admin/inquiries" left={q.name} sub={q.email} meta={fmt(q.createdAt)}
              chip={q.source} chipClass="text-[var(--a-muted)] bg-[var(--a-hover)]" />
          ))}
        </Panel>
      </div>
    </div>
  );
}

function Panel({ title, href, accent, empty, children }: {
  title: string; href: string; accent: string; empty: string; children: React.ReactNode;
}) {
  const hasRows = Array.isArray(children) ? children.length > 0 : !!children;
  return (
    <div className="rounded-lg border border-[var(--a-border)] bg-[var(--a-panel)] overflow-hidden">
      <div className="flex items-center justify-between px-4 h-10 border-b border-[var(--a-border)]">
        <span className={`font-mono text-[11px] uppercase tracking-widest ${accent}`}>{title}</span>
        <Link href={href} className="font-mono text-[10px] text-[var(--a-muted)] hover:text-[var(--a-text)] transition-colors">view_all</Link>
      </div>
      <div className="divide-y divide-[var(--a-border)]">
        {hasRows ? children : (
          <div className="px-4 py-10 text-center font-mono text-[11px] text-[var(--a-faint)]">{empty}</div>
        )}
      </div>
    </div>
  );
}

function Row({ href, left, sub, meta, chip, chipClass }: {
  href: string; left: string; sub: string; meta: string; chip: string; chipClass: string;
}) {
  return (
    <Link href={href} className="flex items-center gap-3 px-4 py-2.5 hover:bg-[var(--a-hover)] transition-colors">
      <div className="min-w-0 flex-1">
        <div className="text-[13px] text-[var(--a-text)] truncate">{left}</div>
        <div className="font-mono text-[11px] text-[var(--a-muted)] truncate">{sub}</div>
      </div>
      <span className={`shrink-0 font-mono text-[10px] uppercase px-1.5 py-0.5 rounded ${chipClass}`}>{chip}</span>
      <span className="shrink-0 font-mono text-[10px] text-[var(--a-faint)] w-20 text-right">{meta}</span>
    </Link>
  );
}
