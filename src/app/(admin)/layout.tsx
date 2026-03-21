import { ReactNode } from "react";
import Link from "next/link";
import { auth, signOut } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const session = await auth();

  // If not logged in and not on the login page, we should ideally handle this in middleware, 
  // but for simplicity we can just check if we're on login page in the children. 
  // Actually, we'll put login in `(admin)/admin/login/page.tsx` and dashboard in `(admin)/admin/dashboard/...`
  // To avoid circular redirects, let's just render children if no session and let individual pages handle it, 
  // OR we can make a specific layout for just the authenticated parts.
  // Let's make this the authenticated layout. If no session, render the children (which might be the login page).

  if (!session) {
    redirect("/admin/login");
  }

  return (
    <div className="min-h-screen bg-slate-50/50 flex font-sans selection:bg-primary/20">
      {/* Sidebar with Glassmorphism */}
      <aside className="w-[280px] bg-white/70 backdrop-blur-xl border-r border-slate-200/60 flex flex-col shadow-[4px_0_24px_-12px_rgba(0,0,0,0.08)] z-20">
        <div className="h-20 border-b border-slate-200/60 flex items-center px-8">
          <Link href="/admin/dashboard" className="text-2xl font-black text-slate-900 tracking-tighter hover:opacity-80 transition-opacity">
            Grow<span className="text-primary">Clinic</span>
            <span className="ml-2 px-2 py-0.5 rounded-md bg-slate-100/80 text-[10px] text-slate-500 font-bold uppercase tracking-widest align-middle">OS</span>
          </Link>
        </div>

        <nav className="flex-1 p-5 space-y-1.5 overflow-y-auto">
          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3 mt-2 px-4">Overview</div>
          
          <Link href="/admin/dashboard" className="group flex items-center gap-3 px-4 py-3 text-slate-600 rounded-xl hover:bg-white hover:text-primary hover:shadow-sm hover:ring-1 hover:ring-slate-100 transition-all duration-200 font-medium">
            <svg className="w-5 h-5 text-slate-400 group-hover:text-primary transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"></path></svg>
            Dashboard
          </Link>

          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3 mt-6 px-4">Workspace & Operations</div>

          <Link href="/admin/inquiries" className="group flex items-center gap-3 px-4 py-3 text-slate-600 rounded-xl hover:bg-white hover:text-primary hover:shadow-sm hover:ring-1 hover:ring-slate-100 transition-all duration-200 font-medium">
            <svg className="w-5 h-5 text-slate-400 group-hover:text-primary transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"></path></svg>
            Contact Inquiries
          </Link>
          <Link href="/admin/bookings" className="group flex items-center gap-3 px-4 py-3 text-slate-600 rounded-xl hover:bg-white hover:text-primary hover:shadow-sm hover:ring-1 hover:ring-slate-100 transition-all duration-200 font-medium">
            <svg className="w-5 h-5 text-slate-400 group-hover:text-primary transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>
            Consultations
          </Link>
          <Link href="/admin/audits" className="group flex items-center gap-3 px-4 py-3 text-slate-600 rounded-xl hover:bg-white hover:text-primary hover:shadow-sm hover:ring-1 hover:ring-slate-100 transition-all duration-200 font-medium">
            <svg className="w-5 h-5 text-slate-400 group-hover:text-primary transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"></path></svg>
            Clinic Audits
          </Link>

          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3 mt-6 px-4">Content & Media</div>

          <Link href="/admin/posts" className="group flex items-center gap-3 px-4 py-3 text-slate-600 rounded-xl hover:bg-white hover:text-primary hover:shadow-sm hover:ring-1 hover:ring-slate-100 transition-all duration-200 font-medium">
            <svg className="w-5 h-5 text-slate-400 group-hover:text-primary transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z"></path></svg>
            Blog Articles
          </Link>
          <Link href="/admin/projects" className="group flex items-center gap-3 px-4 py-3 text-slate-600 rounded-xl hover:bg-white hover:text-primary hover:shadow-sm hover:ring-1 hover:ring-slate-100 transition-all duration-200 font-medium">
            <svg className="w-5 h-5 text-slate-400 group-hover:text-primary transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"></path></svg>
            Project Showcase
          </Link>
          <Link href="/admin/testimonials" className="group flex items-center gap-3 px-4 py-3 text-slate-600 rounded-xl hover:bg-white hover:text-primary hover:shadow-sm hover:ring-1 hover:ring-slate-100 transition-all duration-200 font-medium">
            <svg className="w-5 h-5 text-slate-400 group-hover:text-primary transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"></path></svg>
            Testimonials
          </Link>

          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3 mt-6 px-4">Account</div>

          <Link href="/admin/profile" className="group flex items-center gap-3 px-4 py-3 text-slate-600 rounded-xl hover:bg-white hover:text-primary hover:shadow-sm hover:ring-1 hover:ring-slate-100 transition-all duration-200 font-medium">
            <svg className="w-5 h-5 text-slate-400 group-hover:text-primary transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path></svg>
            Profile Settings
          </Link>
        </nav>

        <div className="p-5 border-t border-slate-200/60 bg-slate-50/30">
          <form
            action={async () => {
              "use server";
              await signOut({ redirectTo: "/admin/login" });
            }}
          >
            <button type="submit" className="group flex items-center gap-3 px-4 py-3 w-full text-left text-red-600 rounded-xl hover:bg-red-50 hover:ring-1 hover:ring-red-100 transition-all font-medium">
              <svg className="w-5 h-5 text-red-400 group-hover:text-red-600 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"></path></svg>
              Sign Out
            </button>
          </form>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
        {/* Decorative Background Blob */}
        <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-primary/5 rounded-full blur-3xl pointer-events-none -translate-y-1/2 translate-x-1/3"></div>
        
        {/* Top Header */}
        <header className="bg-white/40 backdrop-blur-md border-b border-slate-200/50 h-20 flex items-center justify-between px-10 shrink-0 z-10 sticky top-0">
          <div>
            <h1 className="text-xl font-bold text-slate-800 tracking-tight">Welcome back, {session.user?.name?.split(' ')[0] || 'Admin'}</h1>
            <p className="text-sm text-slate-500 font-medium">Manage your clinical growth operations.</p>
          </div>
          <div className="flex items-center gap-4">
            <Link href="/admin/profile" className="relative group cursor-pointer block" title="Profile Settings">
              <div className="w-10 h-10 bg-gradient-to-tr from-primary to-primary-focus rounded-xl flex items-center justify-center text-white font-bold text-sm shadow-md shadow-primary/20 ring-2 ring-white transition-transform group-hover:scale-105">
                {session.user?.name?.charAt(0) || "A"}
              </div>
              <div className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 border-2 border-white rounded-full"></div>
            </Link>
          </div>
        </header>

        {/* Page Content */}
        <div className="flex-1 overflow-auto p-10 z-10">
          <div className="max-w-[1200px] mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500 fill-mode-both">
            {children}
          </div>
        </div>
      </main>
    </div>
  );
}
