"use client";

import { useState, useEffect } from "react";

interface ClinicAudit {
  id: string;
  fullName: string;
  clinicName: string;
  specialization: string;
  city: string;
  phone: string;
  website: string | null;
  status: string;
  clickId: string | null;
  utmSource: string | null;
  utmCampaign: string | null;
  referrer: string | null;
  webhookStatus: string;
  webhookCode: number | null;
  webhookAt: string | null;
  createdAt: string;
}

export default function AuditAdminPage() {
  const [audits, setAudits] = useState<ClinicAudit[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const limit = 10;

  // Debounce search input
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1); // Reset to page 1 on new search
    }, 500);
    return () => clearTimeout(handler);
  }, [search]);

  const fetchAudits = async () => {
    setLoading(true);
    try {
      const qp = new URLSearchParams();
      if (debouncedSearch) qp.append("search", debouncedSearch);
      if (startDate) qp.append("startDate", startDate);
      if (endDate) qp.append("endDate", endDate);
      qp.append("page", page.toString());
      qp.append("limit", limit.toString());
      const res = await fetch(`/api/audits/admin?${qp.toString()}`);
      if (!res.ok) throw new Error("Failed to fetch audits");
      const data = await res.json();
      if (data.audits) {
        setAudits(data.audits);
        setTotalPages(data.totalPages || 1);
      } else {
        setAudits(Array.isArray(data) ? data : []);
        setTotalPages(1);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAudits();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearch, startDate, endDate, page]);

  const clearFilters = () => { setSearch(""); setDebouncedSearch(""); setStartDate(""); setEndDate(""); setPage(1); };

  const handleDownloadCSV = () => {
    if (!audits.length) return;
    const headers = ["Clinic Name", "Doctor Name", "Specialization", "City", "Phone", "Website", "Source", "Campaign", "Click ID", "Webhook Status", "Webhook Code", "Lead Status", "Submitted Date"];
    const esc = (v: string | number | null | undefined) => `"${(v ?? "").toString().replace(/"/g, '""')}"`;
    const rows = audits.map((a) => [esc(a.clinicName), esc(a.fullName), esc(a.specialization), esc(a.city), esc(a.phone), esc(a.website), esc(a.utmSource), esc(a.utmCampaign), esc(a.clickId), esc(a.webhookStatus), esc(a.webhookCode), esc(a.status), esc(new Date(a.createdAt).toLocaleString())].join(","));
    const blob = new Blob([[headers.join(","), ...rows].join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `AuditSubmissions_${startDate || "All"}_to_${endDate || "All"}.csv`);
    document.body.appendChild(link); link.click(); document.body.removeChild(link);
  };

  const fmt = (d: string) => new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", hour: "numeric", minute: "numeric", hour12: true }).format(new Date(d));
  const waUrl = (phone: string, name: string) => `https://wa.me/${phone.replace(/\D/g, "")}?text=${encodeURIComponent(`Hi Dr. ${name}, this is the GrowClinic team. Your Clinic Growth Audit is ready — shall we review the results?`)}`;

  const hasFilters = debouncedSearch !== "" || startDate !== "" || endDate !== "";
  const delivered = audits.filter((a) => a.webhookStatus === "success").length;
  const failed = audits.filter((a) => a.webhookStatus === "failed").length;
  const pending = audits.length - delivered - failed;

  const input = "rounded-md border border-[var(--a-border)] bg-[var(--a-panel)] px-3 py-2 text-[13px] text-[var(--a-text)] placeholder-[var(--a-faint)] outline-none focus:border-emerald-500/40 transition-colors";

  const Webhook = ({ a }: { a: ClinicAudit }) => {
    const map: Record<string, [string, string]> = {
      success: ["delivered", "text-[var(--a-accent)] bg-emerald-400/10"],
      failed: [`failed${a.webhookCode ? "·" + a.webhookCode : ""}`, "text-rose-400 bg-rose-400/10"],
    };
    const [label, cls] = map[a.webhookStatus] || ["pending", "text-[var(--a-muted)] bg-[var(--a-hover)]"];
    return <span className={`font-mono text-[10px] uppercase px-1.5 py-0.5 rounded ${cls}`}>{label}</span>;
  };

  const stats = [
    { label: "total", value: audits.length, accent: "text-[var(--a-bright)]" },
    { label: "delivered", value: delivered, accent: "text-[var(--a-accent)]" },
    { label: "failed", value: failed, accent: "text-rose-400" },
    { label: "pending", value: pending, accent: "text-[var(--a-muted)]" },
  ];

  return (
    <div className="space-y-5">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-lg font-semibold text-[var(--a-bright)] tracking-tight">Audit Submissions</h1>
          <p className="font-mono text-xs text-[var(--a-muted)] mt-0.5">// form submissions + webhook delivery status</p>
        </div>
        <button onClick={handleDownloadCSV} disabled={!audits.length} className="font-mono text-[12px] text-[var(--a-text)] border border-[var(--a-border)] rounded-md px-3 py-2 hover:bg-[var(--a-hover)] disabled:opacity-40 transition-colors">
          export.csv ↓
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {stats.map((s) => (
          <div key={s.label} className="rounded-lg border border-[var(--a-border)] bg-[var(--a-panel)] px-4 py-3">
            <div className="font-mono text-[10px] uppercase tracking-widest text-[var(--a-muted)]">{s.label}</div>
            <div className={`mt-1 font-mono text-2xl font-bold tabular-nums ${s.accent}`}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-col xl:flex-row gap-2.5">
        <input className={`${input} flex-1`} placeholder="search clinic / doctor / city…" value={search} onChange={(e) => setSearch(e.target.value)} />
        <div className="flex items-center gap-2">
          <input type="date" className={`${input} w-36`} value={startDate} onChange={(e) => setStartDate(e.target.value)} />
          <span className="font-mono text-[var(--a-faint)] text-xs">→</span>
          <input type="date" className={`${input} w-36`} value={endDate} onChange={(e) => setEndDate(e.target.value)} />
          {hasFilters && <button onClick={clearFilters} className="font-mono text-[11px] text-[var(--a-muted)] hover:text-rose-400 px-2 transition-colors">clear</button>}
        </div>
      </div>

      {/* Table */}
      <div className="rounded-lg border border-[var(--a-border)] bg-[var(--a-panel)] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left min-w-[820px]">
            <thead>
              <tr className="border-b border-[var(--a-border)] font-mono text-[10px] uppercase tracking-widest text-[var(--a-muted)]">
                <th className="px-4 py-3 font-medium">clinic / doctor</th>
                <th className="px-4 py-3 font-medium">location</th>
                <th className="px-4 py-3 font-medium">source</th>
                <th className="px-4 py-3 font-medium">webhook</th>
                <th className="px-4 py-3 font-medium">submitted</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--a-border)]">
              {loading ? (
                <tr><td colSpan={5} className="px-4 py-12 text-center font-mono text-[12px] text-[var(--a-faint)]">loading…</td></tr>
              ) : !audits.length ? (
                <tr><td colSpan={5} className="px-4 py-12 text-center font-mono text-[12px] text-[var(--a-faint)]">no_submissions</td></tr>
              ) : (
                audits.map((a) => (
                  <tr key={a.id} className="align-top hover:bg-[var(--a-hover)] transition-colors">
                    <td className="px-4 py-3">
                      <div className="text-[13px] text-[var(--a-bright)]">{a.clinicName}</div>
                      <div className="font-mono text-[11px] text-[var(--a-muted)]">{a.fullName} · {a.specialization}</div>
                      <a href={waUrl(a.phone, a.fullName)} target="_blank" rel="noopener noreferrer" className="font-mono text-[11px] text-[var(--a-accent)]/80 hover:text-[var(--a-accent)] transition-colors">{a.phone}</a>
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-[13px] text-[var(--a-text)]">{a.city}</div>
                      {a.website && <div className="font-mono text-[11px] text-[var(--a-faint)] truncate max-w-[150px]">{a.website}</div>}
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-mono text-[12px] text-[var(--a-text)]">{a.utmSource || "—"}</div>
                      {a.utmCampaign && <div className="font-mono text-[10px] text-[var(--a-muted)]">{a.utmCampaign}</div>}
                      {a.clickId && <div className="font-mono text-[10px] text-[var(--a-faint)] truncate max-w-[150px]" title={a.clickId}>{a.clickId}</div>}
                    </td>
                    <td className="px-4 py-3">
                      <Webhook a={a} />
                      {a.webhookAt && <div className="font-mono text-[10px] text-[var(--a-faint)] mt-1">{fmt(a.webhookAt)}</div>}
                    </td>
                    <td className="px-4 py-3 font-mono text-[11px] text-[var(--a-muted)] whitespace-nowrap">{fmt(a.createdAt)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
      
      {totalPages > 1 && (
        <div className="flex items-center justify-between bg-[var(--a-panel)] p-4 rounded-xl shadow-sm border border-[var(--a-border)] mt-4">
          <div className="text-sm text-[var(--a-muted)]">
            Page <span className="font-bold text-[var(--a-text)]">{page}</span> of <span className="font-bold text-[var(--a-text)]">{totalPages}</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-3 py-1.5 text-sm font-medium border border-[var(--a-border)] rounded-md disabled:opacity-50 hover:bg-[var(--a-hover)]"
            >
              Previous
            </button>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="px-3 py-1.5 text-sm font-medium border border-[var(--a-border)] rounded-md disabled:opacity-50 hover:bg-[var(--a-hover)]"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
