"use client";

import React from "react";
import { usePathname } from "next/navigation";
import { Navbar } from "./Navbar";
import { Footer } from "./Footer";

// Routes that render WITHOUT the public navbar/footer — focused, high-conversion
// landing pages (e.g. the clinic audit) and the admin panel, which has its own
// chrome. Otherwise the public header/footer would wrap the admin too.
const BARE_ROUTES = ["/audit", "/admin", "/preview"];

export function PathnameShell({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
    const isBare = BARE_ROUTES.some(
        (r) => pathname === r || pathname.startsWith(`${r}/`)
    );

    if (isBare) {
        return <main className="min-h-screen">{children}</main>;
    }

    return (
        <>
            <Navbar />
            <main className="min-h-screen pt-20">{children}</main>
            <Footer />
        </>
    );
}
