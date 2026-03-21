"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/Button";

interface ClinicAudit {
  id: string;
  fullName: string;
  clinicName: string;
  specialization: string;
  city: string;
  phone: string;
  status: string;
  seoScore: number | null;
  competitorRank: number | null;
  estimatedLeads: number | null;
  createdAt: string;
}

export default function AuditAdminPage() {
  const [audits, setAudits] = useState<ClinicAudit[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [search, setSearch] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const fetchAudits = async () => {
    setLoading(true);
    try {
      const queryParams = new URLSearchParams();
      if (search) queryParams.append("search", search);
      if (startDate) queryParams.append("startDate", startDate);
      if (endDate) queryParams.append("endDate", endDate);

      const res = await fetch(`/api/audits/admin?${queryParams.toString()}`);
      if (!res.ok) throw new Error("Failed to fetch audits");
      const data = await res.json();
      setAudits(data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAudits();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, startDate, endDate]);

  const clearFilters = () => {
    setSearch("");
    setStartDate("");
    setEndDate("");
  };

  const handleDownloadCSV = () => {
    if (audits.length === 0) return;

    const headers = ["Clinic Name", "Doctor Name", "Specialization", "City", "Phone", "Status", "SEO Score", "Competitor Rank", "Est. Leads", "Submitted Date"];
    
    const csvRows = audits.map(audit => {
      return [
        `"${audit.clinicName.replace(/"/g, '""')}"`,
        `"${audit.fullName.replace(/"/g, '""')}"`,
        `"${audit.specialization.replace(/"/g, '""')}"`,
        `"${audit.city.replace(/"/g, '""')}"`,
        `"${audit.phone.replace(/"/g, '""')}"`,
        `"${audit.status.replace(/"/g, '""')}"`,
        `"${audit.seoScore || ""}"`,
        `"${audit.competitorRank || ""}"`,
        `"${audit.estimatedLeads || ""}"`,
        `"${new Date(audit.createdAt).toLocaleString()}"`,
      ].join(",");
    });

    const csvContent = [headers.join(","), ...csvRows].join("\n");
    
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `AuditRequests_Export_${startDate || 'All'}_to_${endDate || 'All'}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const formatDate = (date: string) => {
    return new Intl.DateTimeFormat('en-IN', {
      day: 'numeric',
      month: 'short',
      hour: 'numeric',
      minute: 'numeric',
      hour12: true
    }).format(new Date(date));
  };

  const getWhatsAppUrl = (phone: string, name: string) => {
    const cleanPhone = phone.replace(/\D/g, "");
    const text = encodeURIComponent(
      `Hi Dr. ${name}, this is the GrowClinic team. We have finished compiling your free Clinic Growth Audit! Are you available to review the results?`
    );
    return `https://wa.me/${cleanPhone}?text=${text}`;
  };

  const hasActiveFilters = search !== "" || startDate !== "" || endDate !== "";

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 border-b-4 border-primary pb-2 inline-block">Clinic Growth Audits</h2>
          <p className="text-gray-500 mt-2 text-sm">Review full audit requests from prospective clinics.</p>
        </div>
        <div className="flex items-center gap-4 border-t sm:border-t-0 pt-4 sm:pt-0 w-full sm:w-auto">
            <div className="px-4 py-2 bg-primary/10 text-primary rounded-full text-sm font-bold flex-1 sm:flex-none text-center">
                {audits.length} Requests Found
            </div>
            <Button onClick={handleDownloadCSV} disabled={audits.length === 0} variant="outline" className="flex items-center gap-2 flex-1 sm:flex-none justify-center">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>
                Export Filtered to CSV
            </Button>
        </div>
      </div>

      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex flex-col xl:flex-row gap-4">
        <div className="flex-1 relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <svg className="h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          <input
            type="text"
            className="block w-full pl-10 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-primary focus:border-primary transition-colors"
            placeholder="Search by clinic, doctor name or city..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        
        <div className="flex flex-col sm:flex-row gap-4 xl:w-auto">
          <div className="flex items-center gap-2">
            <input 
              type="date"
              className="block w-full sm:w-36 py-2 px-3 border border-gray-200 bg-white rounded-lg text-sm focus:ring-primary focus:border-primary transition-colors text-gray-600"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              title="Start Date"
            />
            <span className="text-gray-400 text-sm font-medium">to</span>
            <input 
              type="date"
              className="block w-full sm:w-36 py-2 px-3 border border-gray-200 bg-white rounded-lg text-sm focus:ring-primary focus:border-primary transition-colors text-gray-600"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              title="End Date"
            />
          </div>

          {hasActiveFilters && (
            <button onClick={clearFilters} className="text-sm font-bold text-gray-500 hover:text-red-500 transition-colors whitespace-nowrap flex items-center gap-1 px-2">
               Clear
            </button>
          )}
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[800px]">
                <thead>
                    <tr className="bg-gray-50 border-b border-gray-200">
                        <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-widest whitespace-nowrap">Clinic / Doctor</th>
                        <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-widest whitespace-nowrap">Location</th>
                        <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-widest whitespace-nowrap">Diagnostic Data</th>
                        <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-widest whitespace-nowrap">Submitted</th>
                        <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-widest whitespace-nowrap">Status</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 bg-white">
                    {loading ? (
                        <tr>
                            <td colSpan={5} className="px-6 py-12 text-center text-sm text-gray-500">
                                <div className="flex flex-col items-center justify-center space-y-3">
                                  <svg className="animate-spin h-6 w-6 text-primary" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                  </svg>
                                  <p>Loading audit requests...</p>
                                </div>
                            </td>
                        </tr>
                    ) : audits.length === 0 ? (
                        <tr>
                            <td colSpan={5} className="px-6 py-12 text-center text-sm text-gray-400 italic">
                                No audit requests found matching your filter criteria.
                            </td>
                        </tr>
                    ) : (
                        audits.map((audit) => (
                            <tr key={audit.id} className="hover:bg-slate-50 transition-colors">
                                <td className="px-6 py-4">
                                    <div className="font-bold text-gray-900">{audit.clinicName}</div>
                                    <div className="text-sm text-gray-500">{audit.fullName} • {audit.specialization}</div>
                                    <a 
                                        href={getWhatsAppUrl(audit.phone, audit.fullName)} 
                                        target="_blank" 
                                        rel="noopener noreferrer"
                                        className="text-xs text-green-600 hover:text-green-700 hover:underline font-bold mt-1 flex items-center gap-1 group w-max"
                                        title="Send Audit Results on WhatsApp"
                                    >
                                        <svg className="w-3.5 h-3.5 opacity-70 group-hover:opacity-100" fill="currentColor" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/></svg>
                                        {audit.phone}
                                    </a>
                                </td>
                                <td className="px-6 py-4">
                                    <div className="text-sm text-gray-700">{audit.city}</div>
                                </td>
                                <td className="px-6 py-4">
                                    <div className="flex gap-4">
                                        <div className="text-center">
                                            <div className="text-[10px] text-gray-400 uppercase font-black">SEO</div>
                                            <div className="font-black text-primary">{audit.seoScore || '-'}{audit.seoScore ? '%' : ''}</div>
                                        </div>
                                        <div className="text-center">
                                            <div className="text-[10px] text-gray-400 uppercase font-black">Rank</div>
                                            <div className="font-black text-slate-900">{audit.competitorRank ? `#${audit.competitorRank}` : '-'}</div>
                                        </div>
                                        <div className="text-center">
                                            <div className="text-[10px] text-gray-400 uppercase font-black">Leads</div>
                                            <div className="font-black text-green-600">{audit.estimatedLeads ? `+${audit.estimatedLeads}` : '-'}</div>
                                        </div>
                                    </div>
                                </td>
                                <td className="px-6 py-4">
                                    <div className="text-sm text-gray-500 whitespace-nowrap">{formatDate(audit.createdAt)}</div>
                                </td>
                                <td className="px-6 py-4">
                                    <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest whitespace-nowrap ${
                                        audit.status === "pending" ? "bg-amber-100 text-amber-700" : "bg-green-100 text-green-700"
                                    }`}>
                                        {audit.status}
                                    </span>
                                </td>
                            </tr>
                        ))
                    )}
                </tbody>
            </table>
        </div>
      </div>
    </div>
  );
}
