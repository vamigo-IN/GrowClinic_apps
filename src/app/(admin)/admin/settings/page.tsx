import React from "react";
import { prisma } from "@/lib/prisma";
import { saveSiteSettings } from "./actions";

export const metadata = {
  title: "Settings & Tracking | Admin",
};

export default async function SettingsPage() {
  const settings = await prisma.siteSettings.findUnique({
    where: { id: "global" },
  });

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-black text-slate-900 tracking-tight">Settings & Tracking</h1>
        <p className="text-slate-500 mt-2 font-medium">Inject global HTML verification codes, Google Analytics, and Tag Managers seamlessly.</p>
      </div>

      <div className="bg-white rounded-[2rem] border border-slate-200/60 p-8 shadow-sm">
        <form action={saveSiteSettings} className="space-y-8">
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-amber-800 text-sm font-medium flex items-start gap-3">
            <svg className="w-5 h-5 shrink-0 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
            </svg>
            <p>
              Warning: Modifying these scripts affects the live website. Ensure your HTML markup is valid before saving. Invalid scripts can break the site layout.
            </p>
          </div>

          <div>
            <label htmlFor="headerScripts" className="block text-sm font-bold text-slate-900 mb-2 flex items-center gap-2">
              Header Scripts
              <span className="px-2 py-0.5 rounded-md bg-slate-100 text-[10px] text-slate-500 font-bold tracking-widest uppercase">{"<head>"}</span>
            </label>
            <p className="text-sm text-slate-500 mb-4 font-medium">
              Useful for Google Analytics, Meta Pixel, Google Console Verification.
            </p>
            <textarea
              id="headerScripts"
              name="headerScripts"
              defaultValue={settings?.headerScripts || ""}
              rows={12}
              className="w-full rounded-2xl border-slate-200 bg-slate-50 font-mono text-xs text-slate-700 shadow-inner focus:border-primary focus:ring-primary p-4 transition-all"
              placeholder="<!-- Paste your `<script>` or `<meta>` tags here -->"
            />
          </div>

          <div className="border-t border-slate-100 pt-8 mt-8">
            <label htmlFor="footerScripts" className="block text-sm font-bold text-slate-900 mb-2 flex items-center gap-2">
              Footer Scripts
              <span className="px-2 py-0.5 rounded-md bg-slate-100 text-[10px] text-slate-500 font-bold tracking-widest uppercase">{"<body>"}</span>
            </label>
            <p className="text-sm text-slate-500 mb-4 font-medium">
              Useful for Google Tag Manager (noscript) or deferred chat widgets.
            </p>
            <textarea
              id="footerScripts"
              name="footerScripts"
              defaultValue={settings?.footerScripts || ""}
              rows={12}
              className="w-full rounded-2xl border-slate-200 bg-slate-50 font-mono text-xs text-slate-700 shadow-inner focus:border-primary focus:ring-primary p-4 transition-all"
              placeholder="<!-- Paste your scripts to be appended before the `</body>` tag -->"
            />
          </div>

          <div className="flex justify-end pt-4 border-t border-slate-100 mt-8">
            <button 
              type="submit"
              className="px-8 py-4 bg-primary text-white font-bold rounded-xl hover:bg-primary-focus transition-all shadow-md shadow-primary/20 hover:shadow-xl hover:shadow-primary/30"
            >
              Save Scripts
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
