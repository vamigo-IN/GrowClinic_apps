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

  const fetchBookings = async () => {
    setLoading(true);
    try {
      // We will reuse a generic fetching approach but hit a new API just for bookings
      const res = await fetch(`/api/bookings/admin?search=${search}`);
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
  }, [search]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Consultation Bookings</h2>
          <p className="text-gray-500 mt-1 text-sm">Review consultation requests from clinic owners.</p>
        </div>
      </div>

      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex flex-col sm:flex-row gap-4">
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
            No bookings found matching your search.
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
                        <a href={`mailto:${booking.email}`} className="text-xs text-primary hover:underline flex items-center gap-2">
                            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                            {booking.email}
                        </a>
                        <a href={`tel:${booking.phone}`} className="text-xs text-gray-500 hover:text-black flex items-center gap-2">
                            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" /></svg>
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
