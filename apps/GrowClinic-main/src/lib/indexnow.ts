// IndexNow — instantly notify Bing (and partner engines) when URLs change.
// The key is public by design (hosted at /<key>.txt to prove domain ownership).
const INDEXNOW_KEY = "570c6679af9b442ca1b8dd5a3873225a";
const HOST = "www.growclinic.io";

/**
 * Submit one or more URLs to IndexNow. Fire-and-forget, fails silently so it
 * never breaks a save/publish flow.
 */
export async function submitToIndexNow(urls: string[]): Promise<void> {
  // INDEXNOW_ENABLED=false turns submissions off (local/staging stacks must not
  // announce production URLs to search engines). Unset = enabled.
  if (process.env.INDEXNOW_ENABLED === "false") return;
  const urlList = Array.from(new Set(urls.filter(Boolean)));
  if (!urlList.length) return;
  try {
    await fetch("https://api.indexnow.org/IndexNow", {
      method: "POST",
      headers: { "Content-Type": "application/json; charset=utf-8" },
      body: JSON.stringify({
        host: HOST,
        key: INDEXNOW_KEY,
        keyLocation: `https://${HOST}/${INDEXNOW_KEY}.txt`,
        urlList,
      }),
    });
  } catch (e) {
    console.warn("IndexNow submit failed (non-critical):", e);
  }
}

export function blogUrl(slug: string): string {
  return `https://${HOST}/blog/${slug}`;
}
