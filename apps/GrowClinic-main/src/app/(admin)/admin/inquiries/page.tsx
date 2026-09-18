"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/Button";

interface Inquiry {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  source: string;
  message: string;
  createdAt: string;
}

export default function InquiriesDashboard() {
  const [inquiries, setInquiries] = useState<Inquiry[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [sourceFilter, setSourceFilter] = useState("");
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

  const fetchInquiries = async () => {
    setLoading(true);
    try {
      const queryParams = new URLSearchParams();
      if (debouncedSearch) queryParams.append("search", debouncedSearch);
      if (sourceFilter) queryParams.append("source", sourceFilter);
      if (startDate) queryParams.append("startDate", startDate);
      if (endDate) queryParams.append("endDate", endDate);
      queryParams.append("page", page.toString());
      queryParams.append("limit", limit.toString());

      const res = await fetch(`/api/inquiries?${queryParams.toString()}`);
      if (!res.ok) throw new Error("Failed to fetch inquiries");
      const data = await res.json();
      // Data is now { inquiries, totalPages, currentPage, totalItems }
      if (data.inquiries) {
        setInquiries(data.inquiries);
        setTotalPages(data.totalPages || 1);
      } else {
        // Fallback in case old API format returns array
        setInquiries(Array.isArray(data) ? data : []);
        setTotalPages(1);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInquiries();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearch, sourceFilter, startDate, endDate, page]);

  const clearFilters = () => {
    setSearch("");
    setDebouncedSearch("");
    setSourceFilter("");
    setStartDate("");
    setEndDate("");
    setPage(1);
  };

  const handleDownloadCSV = () => {
    if (inquiries.length === 0) return;

    // Define columns
    const headers = ["Name", "Email", "Phone", "Source", "Message", "Date Submitted"];
    
    // Create rows and escape quotes/commas
    const csvRows = inquiries.map(inq => {
      return [
        `"${inq.name.replace(/"/g, '""')}"`,
        `"${inq.email.replace(/"/g, '""')}"`,
        `"${inq.phone ? inq.phone.replace(/"/g, '""') : ""}"`,
        `"${inq.source.replace(/"/g, '""')}"`,
        `"${inq.message.replace(/"/g, '""')}"`,
        `"${new Date(inq.createdAt).toLocaleString()}"`,
      ].join(",");
    });

    const csvContent = [headers.join(","), ...csvRows].join("\n");
    
    // Trigger download trigger
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `Inquiries_Export_${startDate || 'All'}_to_${endDate || 'All'}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getMailtoUrl = (email: string, name: string) => {
    const subject = encodeURIComponent("Re: Your inquiry with GrowClinic");
    const body = encodeURIComponent(`Hi ${name},\n\nThank you for reaching out to GrowClinic. We received your inquiry and would love to help you.\n\nBest regards,\nThe GrowClinic Team`);
    return `mailto:${email}?subject=${subject}&body=${body}`;
  };

  const getWhatsAppUrl = (phone: string, name: string) => {
    const cleanPhone = phone.replace(/\D/g, "");
    const text = encodeURIComponent(`Hi ${name}, this is the GrowClinic team. We received your inquiry and would love to assist you!`);
    return `https://wa.me/${cleanPhone}?text=${text}`;
  };

  const hasActiveFilters = debouncedSearch !== "" || sourceFilter !== "" || startDate !== "" || endDate !== "";

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-[var(--a-bright)]">Contact Inquiries</h2>
          <p className="text-[var(--a-muted)] mt-1 text-sm">Review submissions from the Contact Us page.</p>
        </div>
        <Button onClick={handleDownloadCSV} disabled={inquiries.length === 0} variant="outline" className="flex items-center gap-2">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>
          Export Filtered to CSV
        </Button>
      </div>

      <div className="bg-[var(--a-panel)] p-4 rounded-xl shadow-sm border border-[var(--a-border)] flex flex-col xl:flex-row gap-4">
        <div className="flex-1 relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <svg className="h-4 w-4 text-[var(--a-muted)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          <input
            type="text"
            className="block w-full pl-10 pr-3 py-2 border border-[var(--a-border)] rounded-lg text-sm focus:ring-primary focus:border-primary transition-colors"
            placeholder="Search by name or email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        
        <div className="flex flex-col sm:flex-row gap-4 xl:w-auto">
          <select
            className="block w-full sm:w-40 py-2 px-3 border border-[var(--a-border)] bg-[var(--a-panel)] rounded-lg text-sm focus:ring-primary focus:border-primary transition-colors"
            value={sourceFilter}
            onChange={(e) => setSourceFilter(e.target.value)}
          >
            <option value="">All Sources</option>
            <option value="Google">Google Search</option>
            <option value="Social Media">Social Media</option>
            <option value="Referral">Friend/Colleague</option>
            <option value="Advertisement">Advertisement</option>
            <option value="Other">Other</option>
          </select>

          <div className="flex items-center gap-2">
            <input 
              type="date"
              className="block w-full sm:w-36 py-2 px-3 border border-[var(--a-border)] bg-[var(--a-panel)] rounded-lg text-sm focus:ring-primary focus:border-primary transition-colors text-[var(--a-text)]"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              title="Start Date"
            />
            <span className="text-[var(--a-muted)] text-sm font-medium">to</span>
            <input 
              type="date"
              className="block w-full sm:w-36 py-2 px-3 border border-[var(--a-border)] bg-[var(--a-panel)] rounded-lg text-sm focus:ring-primary focus:border-primary transition-colors text-[var(--a-text)]"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              title="End Date"
            />
          </div>

          {hasActiveFilters && (
            <button onClick={clearFilters} className="text-sm font-bold text-[var(--a-muted)] hover:text-red-500 transition-colors whitespace-nowrap flex items-center gap-1 px-2">
               Clear
            </button>
          )}
        </div>
      </div>

      <div className="bg-[var(--a-panel)] rounded-xl shadow-sm border border-[var(--a-border)] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-[var(--a-bg)]">
              <tr>
                <th scope="col" className="px-6 py-4 text-left text-xs font-semibold text-[var(--a-muted)] uppercase tracking-wider">Contact</th>
                <th scope="col" className="px-6 py-4 text-left text-xs font-semibold text-[var(--a-muted)] uppercase tracking-wider">Source</th>
                <th scope="col" className="px-6 py-4 text-left text-xs font-semibold text-[var(--a-muted)] uppercase tracking-wider">Message Extract</th>
                <th scope="col" className="px-6 py-4 text-left text-xs font-semibold text-[var(--a-muted)] uppercase tracking-wider">Date</th>
              </tr>
            </thead>
            <tbody className="bg-[var(--a-panel)] divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center text-sm text-[var(--a-muted)]">
                    <div className="flex flex-col items-center justify-center space-y-3">
                      <svg className="animate-spin h-6 w-6 text-primary" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      <p>Loading inquiries...</p>
                    </div>
                  </td>
                </tr>
              ) : inquiries.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center text-sm text-[var(--a-muted)]">
                    No inquiries found matching your filter criteria.
                  </td>
                </tr>
              ) : (
                inquiries.map((inq) => (
                  <tr key={inq.id} className="hover:bg-[var(--a-hover)] transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex flex-col">
                        <span className="text-sm font-bold text-[var(--a-bright)] mb-1">{inq.name}</span>
                        <a 
                          href={getMailtoUrl(inq.email, inq.name)} 
                          className="text-sm font-medium text-primary hover:text-primary-focus hover:underline flex items-center gap-1 group"
                          title="Send Email"
                        >
                          <svg className="w-3.5 h-3.5 opacity-70 group-hover:opacity-100" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"></path></svg>
                          {inq.email}
                        </a>
                        {inq.phone && (
                          <a 
                            href={getWhatsAppUrl(inq.phone, inq.name)} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-xs font-bold text-green-600 hover:text-green-700 hover:underline mt-1 flex items-center gap-1 group"
                            title="Message on WhatsApp"
                          >
                            <svg className="w-3.5 h-3.5 opacity-70 group-hover:opacity-100" fill="currentColor" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/></svg>
                            {inq.phone}
                          </a>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        {inq.source}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-sm text-[var(--a-text)] line-clamp-2 max-w-sm" title={inq.message}>
                        {inq.message}
                      </p>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-[var(--a-muted)]">
                      {new Date(inq.createdAt).toLocaleDateString()}
                    </td>
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
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
