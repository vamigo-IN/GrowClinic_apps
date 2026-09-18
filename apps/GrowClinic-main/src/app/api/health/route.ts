import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { publishDueScheduled } from "@/lib/schedule";

// Lightweight keep-warm / health endpoint.
//  - force-dynamic + no-store so the CDN never caches it, meaning an external
//    pinger (cron-job.org / UptimeRobot) actually reaches the Node origin and
//    keeps the on-demand app from idling (prevents cold-start 503/504s).
//  - Doubles as the scheduled-publish trigger: since the blog pages are now
//    ISR-cached (no per-request render), we flip any "due" scheduled posts live
//    here instead, on the pinger's minute cadence. publishDueScheduled swallows
//    its own errors and this route always returns 200, so a DB blip never marks
//    the app unhealthy (which is what was tripping restarts before).
export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

export async function GET() {
    let published = 0;
    try {
        published = await publishDueScheduled();
        if (published > 0) {
            // Newly-live posts should appear immediately, not at the next
            // revalidate window.
            revalidatePath("/blog");
            revalidatePath("/");
        }
    } catch {
        // Never let scheduling failures affect the health signal.
    }

    return new NextResponse(JSON.stringify({ ok: true, ts: Date.now(), published }), {
        status: 200,
        headers: {
            "Content-Type": "application/json",
            "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
        },
    });
}
