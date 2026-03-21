import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import Link from "next/link";

export default async function AdminDashboard() {
  const session = await auth();
  
  // Data Fetching: Counts
  const totalInquiries = await prisma.contactMessage.count();
  const totalConsultations = await prisma.consultationBooking.count();
  const totalAudits = await prisma.clinicAudit.count();
  
  // Data Fetching: Recents
  const recentInquiries = await prisma.contactMessage.findMany({ take: 3, orderBy: { createdAt: "desc" } });
  const recentConsultations = await prisma.consultationBooking.findMany({ take: 3, orderBy: { createdAt: "desc" } });
  const recentAudits = await prisma.clinicAudit.findMany({ take: 3, orderBy: { createdAt: "desc" } });

  // Helper date formatter
  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('en-IN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }).format(new Date(date));
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-700">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-black text-slate-900 tracking-tight">Growth Command Center</h2>
          <p className="text-sm text-slate-500 font-medium tracking-wide mt-1">Real-time patient acquisition pipeline data.</p>
        </div>
        <div className="px-4 py-2 bg-white/80 border border-slate-200/60 rounded-full shadow-sm text-xs font-bold text-slate-600 flex items-center justify-center gap-2 backdrop-blur-sm uppercase tracking-widest">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
          </span>
          All Systems Online
        </div>
      </div>
      
      {/* Metric Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Contact Inquiries Metric Card */}
        <Link href="/admin/inquiries" className="group relative bg-white rounded-3xl p-6 border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] hover:-translate-y-1 transition-all duration-300 overflow-hidden flex flex-col justify-between h-40">
          <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/5 rounded-bl-full -mr-8 -mt-8 transition-transform group-hover:scale-110"></div>
          <div>
            <span className="text-slate-400 text-sm font-bold uppercase tracking-widest block mb-1">Total Inquiries</span>
            <span className="text-5xl font-black text-slate-800 tracking-tighter">{totalInquiries}</span>
          </div>
          <div className="text-xs text-amber-600 font-bold flex items-center gap-1 group-hover:gap-2 transition-all">
            Manage Contacts <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"></path></svg>
          </div>
        </Link>

        {/* Consultations Metric Card */}
        <Link href="/admin/bookings" className="group relative bg-white rounded-3xl p-6 border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] hover:-translate-y-1 transition-all duration-300 overflow-hidden flex flex-col justify-between h-40">
          <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 rounded-bl-full -mr-8 -mt-8 transition-transform group-hover:scale-110"></div>
          <div>
            <span className="text-slate-400 text-sm font-bold uppercase tracking-widest block mb-1">Consultation Bookings</span>
            <span className="text-5xl font-black text-slate-800 tracking-tighter">{totalConsultations}</span>
          </div>
          <div className="text-xs text-blue-600 font-bold flex items-center gap-1 group-hover:gap-2 transition-all">
            Review Schedule <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"></path></svg>
          </div>
        </Link>

        {/* Audits Metric Card */}
        <Link href="/admin/audits" className="group relative bg-gradient-to-br from-primary to-primary-focus rounded-3xl p-6 shadow-xl shadow-primary/20 hover:shadow-primary/30 hover:-translate-y-1 transition-all duration-300 overflow-hidden flex flex-col justify-between h-40 text-white">
          <div className="absolute top-0 right-0 w-40 h-40 bg-white/10 rounded-full blur-2xl -mr-10 -mt-10 transition-transform group-hover:scale-110"></div>
          <div className="relative z-10">
            <span className="text-white/80 text-sm font-bold uppercase tracking-widest block mb-1">Audit Requests</span>
            <span className="text-5xl font-black tracking-tighter">{totalAudits}</span>
          </div>
          <div className="relative z-10 text-xs font-bold text-white/90 flex items-center gap-1 group-hover:gap-2 transition-all">
            Explore Growth Data <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"></path></svg>
          </div>
        </Link>

      </div>

      {/* Recent Activity Multi-Column Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Inquiries Panel */}
        <div className="bg-white rounded-3xl border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.03)] flex flex-col overflow-hidden">
          <div className="px-6 py-5 border-b border-slate-100/60 flex justify-between items-center bg-slate-50/30">
            <h3 className="text-base font-black text-slate-800 tracking-tight flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-amber-500"></span> Recent Inquiries
            </h3>
            <Link href="/admin/inquiries" className="text-xs text-slate-400 hover:text-amber-500 font-bold uppercase tracking-widest transition-colors">
              View All
            </Link>
          </div>
          <div className="flex-1 p-2">
            {recentInquiries.length > 0 ? (
              <div className="flex flex-col gap-1">
                {recentInquiries.map((inq) => (
                  <Link href="/admin/inquiries" key={inq.id} className="group p-4 rounded-2xl hover:bg-slate-50 transition-colors flex flex-col gap-1">
                    <div className="flex justify-between items-start">
                      <p className="font-bold text-slate-800 text-sm truncate pr-2 group-hover:text-amber-600 transition-colors">{inq.name}</p>
                      <span className="text-[10px] text-slate-400 font-bold whitespace-nowrap bg-slate-100 px-2 py-0.5 rounded-full">{inq.source}</span>
                    </div>
                    <p className="text-xs text-slate-500 truncate">{inq.email}</p>
                    <p className="text-[10px] text-slate-400 font-medium uppercase tracking-widest mt-1">{formatDate(inq.createdAt)}</p>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="p-8 text-center flex flex-col items-center justify-center h-full">
                <span className="text-slate-300 mb-2">
                  <svg className="w-8 h-8 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"></path></svg>
                </span>
                <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">No Inquiries</p>
              </div>
            )}
          </div>
        </div>

        {/* Consultations Panel */}
        <div className="bg-white rounded-3xl border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.03)] flex flex-col overflow-hidden">
          <div className="px-6 py-5 border-b border-slate-100/60 flex justify-between items-center bg-slate-50/30">
            <h3 className="text-base font-black text-slate-800 tracking-tight flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-blue-500"></span> Recent Consults
            </h3>
            <Link href="/admin/bookings" className="text-xs text-slate-400 hover:text-blue-500 font-bold uppercase tracking-widest transition-colors">
              View All
            </Link>
          </div>
          <div className="flex-1 p-2">
            {recentConsultations.length > 0 ? (
              <div className="flex flex-col gap-1">
                {recentConsultations.map((consult) => (
                  <Link href="/admin/bookings" key={consult.id} className="group p-4 rounded-2xl hover:bg-slate-50 transition-colors flex flex-col gap-1">
                    <div className="flex justify-between items-start">
                      <p className="font-bold text-slate-800 text-sm truncate pr-2 group-hover:text-blue-600 transition-colors">{consult.name}</p>
                      <span className="text-[10px] text-blue-600 font-bold whitespace-nowrap bg-blue-50 px-2 py-0.5 rounded-full ring-1 ring-blue-100">{consult.clinicType}</span>
                    </div>
                    <p className="text-xs text-slate-500 font-medium truncate">{consult.clinicName}</p>
                    <p className="text-[10px] text-slate-400 font-medium uppercase tracking-widest mt-1">{formatDate(consult.createdAt)}</p>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="p-8 text-center flex flex-col items-center justify-center h-full">
                <span className="text-slate-300 mb-2">
                  <svg className="w-8 h-8 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>
                </span>
                <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">No Bookings</p>
              </div>
            )}
          </div>
        </div>

        {/* Audits Panel */}
        <div className="bg-white rounded-3xl border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.03)] flex flex-col overflow-hidden">
          <div className="px-6 py-5 border-b border-slate-100/60 flex justify-between items-center bg-slate-50/30">
            <h3 className="text-base font-black text-slate-800 tracking-tight flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-primary"></span> Recent Audits
            </h3>
            <Link href="/admin/audits" className="text-xs text-slate-400 hover:text-primary-focus font-bold uppercase tracking-widest transition-colors">
              View All
            </Link>
          </div>
          <div className="flex-1 p-2">
            {recentAudits.length > 0 ? (
              <div className="flex flex-col gap-1">
                {recentAudits.map((audit) => (
                  <Link href="/admin/audits" key={audit.id} className="group p-4 rounded-2xl hover:bg-slate-50 transition-colors flex flex-col gap-1">
                    <div className="flex justify-between items-start">
                      <p className="font-bold text-slate-800 text-sm truncate pr-2 group-hover:text-primary transition-colors">{audit.clinicName}</p>
                      <span className={`text-[9px] font-black uppercase tracking-widest whitespace-nowrap px-2 py-0.5 rounded-full ring-1 ${audit.status === "pending" ? "bg-amber-50 text-amber-700 ring-amber-200/50" : "bg-green-50 text-green-700 ring-green-200/50"}`}>
                        {audit.status}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 font-medium truncate">{audit.fullName}</p>
                    <p className="text-[10px] text-slate-400 font-medium uppercase tracking-widest mt-1">{formatDate(audit.createdAt)}</p>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="p-8 text-center flex flex-col items-center justify-center h-full">
                <span className="text-slate-300 mb-2">
                  <svg className="w-8 h-8 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"></path></svg>
                </span>
                <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">No Audits</p>
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
