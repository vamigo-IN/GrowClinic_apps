"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/Button";

interface Booking {
  id: string;
  name: string;
  email: string;
  phone: string;
  clinicName: string;
  clinicType: string;
  challenge: string;
  preferredDate: string;
  preferredTime: string;
  createdAt: string;
}

export default function BookingsDashboard() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const fetchBookings = async () => {
    setLoading(true);
    try {
      const queryParams = new URLSearchParams();
      if (search) queryParams.append("search", search);
      if (startDate) queryParams.append("startDate", startDate);
      if (endDate) queryParams.append("endDate", endDate);

      const res = await fetch(`/api/bookings/admin?${queryParams.toString()}`);
      if (!res.ok) throw new Error("Failed to fetch bookings");
      const data = await res.json();
      setBookings(data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBookings();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, startDate, endDate]);

  const clearFilters = () => {
    setSearch("");
    setStartDate("");
    setEndDate("");
  };

  const handleDownloadCSV = () => {
    if (bookings.length === 0) return;

    const headers = ["Clinic Name", "Clinic Type", "Contact Name", "Email", "Phone", "Growth Challenge", "Preferred Date", "Preferred Time", "Created At"];
    
    const csvRows = bookings.map(b => {
      return [
        `"${b.clinicName.replace(/"/g, '""')}"`,
        `"${b.clinicType.replace(/"/g, '""')}"`,
        `"${b.name.replace(/"/g, '""')}"`,
        `"${b.email.replace(/"/g, '""')}"`,
        `"${b.phone.replace(/"/g, '""')}"`,
        `"${b.challenge.replace(/"/g, '""')}"`,
        `"${b.preferredDate || ""}"`,
        `"${b.preferredTime || ""}"`,
        `"${new Date(b.createdAt).toLocaleString()}"`,
      ].join(",");
    });

    const csvContent = [headers.join(","), ...csvRows].join("\n");
    
    // Trigger download trigger
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `Consultations_Export_${startDate || 'All'}_to_${endDate || 'All'}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getMailtoUrl = (email: string, name: string, challenge: string) => {
    const subject = encodeURIComponent("Your Strategic Consultation with GrowClinic");
    const body = encodeURIComponent(
      `Hi ${name},\n\nThank you for booking a consultation with GrowClinic!\n\nI reviewed your request and noticed your primary growth focus is: "${challenge}". We have some excellent strategies we can discuss to tackle this effectively.\n\nLooking forward to speaking with you,\nThe GrowClinic Team`
    );
    return `mailto:${email}?subject=${subject}&body=${body}`;
  };

  const getWhatsAppUrl = (phone: string, name: string) => {
    const cleanPhone = phone.replace(/\D/g, "");
    const text = encodeURIComponent(
      `Hi ${name}, this is the GrowClinic team confirming your upcoming consultation! We are looking forward to speaking with you.`
    );
    return `https://wa.me/${cleanPhone}?text=${text}`;
  };

  const hasActiveFilters = search !== "" || startDate !== "" || endDate !== "";

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Consultation Bookings</h2>
          <p className="text-gray-500 mt-1 text-sm">Review consultation requests from clinic owners.</p>
        </div>
        <Button onClick={handleDownloadCSV} disabled={bookings.length === 0} variant="outline" className="flex items-center gap-2">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>
          Export Filtered to CSV
        </Button>
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
            placeholder="Search by lead name or clinic name..."
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

      <div className="grid gap-6 grid-cols-1 xl:grid-cols-2">
        {loading ? (
             <div className="col-span-full py-12 text-center text-sm text-gray-500 flex flex-col items-center justify-center space-y-3 bg-white rounded-xl shadow-sm border border-gray-100">
             <svg className="animate-spin h-6 w-6 text-primary" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
               <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
               <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
             </svg>
             <p>Loading bookings...</p>
           </div>
        ) : bookings.length === 0 ? (
          <div className="col-span-full py-12 text-center text-sm text-gray-500 bg-white rounded-xl shadow-sm border border-gray-100">
            No bookings found matching your filter criteria.
          </div>
        ) : (
          bookings.map((booking) => (
            <div key={booking.id} className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow relative overflow-hidden flex flex-col group">
              <div className="absolute top-0 right-0 p-4">
                <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-primary/10 text-primary">
                  {booking.clinicType}
                </span>
              </div>
              
              <div className="mb-6 pr-32">
                <h3 className="text-lg font-black text-gray-900 group-hover:text-primary transition-colors">{booking.clinicName}</h3>
                <p className="text-xs text-gray-400 mt-1 font-medium flex items-center gap-1">
                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                  Requested on {new Date(booking.createdAt).toLocaleDateString()}
                </p>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <div className="space-y-3">
                  <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Lead Contact</p>
                  <div className="bg-gray-50/50 p-3 rounded-xl border border-gray-100">
                    <p className="text-sm font-bold text-gray-900">{booking.name}</p>
                    <div className="mt-1 space-y-1">
                        <a href={getMailtoUrl(booking.email, booking.name, booking.challenge)} className="text-xs font-medium text-primary hover:text-primary-focus hover:underline flex items-center gap-2 group mb-2" title="Send Email Response">
                            <svg className="w-3.5 h-3.5 opacity-70 group-hover:opacity-100" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                            {booking.email}
                        </a>
                        <a href={getWhatsAppUrl(booking.phone, booking.name)} target="_blank" rel="noopener noreferrer" className="text-xs font-bold text-green-600 hover:text-green-700 hover:underline flex items-center gap-2 group" title="Message on WhatsApp">
                            <svg className="w-3.5 h-3.5 opacity-70 group-hover:opacity-100" fill="currentColor" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/></svg>
                            {booking.phone}
                        </a>
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Appointment Detail</p>
                    <div className="bg-primary/5 p-3 rounded-xl border border-primary/10">
                        <div className="flex items-center gap-3 mb-2">
                            <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center text-primary shadow-sm">
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                            </div>
                            <div>
                                <p className="text-[10px] text-primary/60 font-bold uppercase">Preferred Date</p>
                                <p className="text-sm font-black text-primary">{booking.preferredDate ? new Date(booking.preferredDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : "Not Set"}</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center text-primary shadow-sm">
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                            </div>
                            <div>
                                <p className="text-[10px] text-primary/60 font-bold uppercase">Preferred Time</p>
                                <p className="text-sm font-black text-primary">{booking.preferredTime || "Anytime"}</p>
                            </div>
                        </div>
                    </div>
                </div>
              </div>
              
              <div className="bg-gray-50/80 p-5 rounded-[1.5rem] border border-gray-100 flex-1">
                 <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mb-3 flex items-center gap-2">
                    <span className="w-4 h-px bg-gray-300"></span>
                    Primary Growth Goal
                 </p>
                 <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed italic">
                   "{booking.challenge}"
                 </p>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
