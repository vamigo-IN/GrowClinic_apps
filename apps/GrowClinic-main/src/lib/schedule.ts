import { prisma } from "@/lib/prisma";
import { submitToIndexNow, blogUrl } from "@/lib/indexnow";

// Cron-free scheduled publishing.
//
// This host has no background jobs, so instead of a scheduler we flip any
// "due" scheduled posts to published the next time a public blog page is
// requested. Cheap and idempotent: when nothing is due it's a single
// indexed lookup that returns zero rows. Newly-published URLs are pushed to
// IndexNow so Bing picks them up quickly.
export async function publishDueScheduled(): Promise<number> {
  try {
    const now = new Date();
    const due = await prisma.post.findMany({
      where: { published: false, scheduledFor: { not: null, lte: now } },
      select: { id: true, slug: true, scheduledFor: true, publishedAt: true },
    });
    if (due.length === 0) return 0;

    // Flip each due post live and stamp publishedAt with its intended schedule
    // time (falling back to now), so blog date + ordering are correct.
    for (const p of due) {
      await prisma.post.update({
        where: { id: p.id },
        data: { published: true, publishedAt: p.publishedAt ?? p.scheduledFor ?? now },
      });
    }

    const urls = due.map((p) => blogUrl(p.slug));
    urls.push("https://www.growclinic.io/blog");
    await submitToIndexNow(urls);
    return due.length;
  } catch (e) {
    // Never let scheduling break page rendering.
    console.warn("publishDueScheduled failed (non-critical):", e);
    return 0;
  }
}
