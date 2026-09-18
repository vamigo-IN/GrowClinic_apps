import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { apiGuard } from "@/lib/guards";

export const dynamic = "force-dynamic";

// ImageKit config — set these in your environment (Hostinger → env vars):
//   IMAGEKIT_PRIVATE_KEY  (ImageKit dashboard → Developer options → API keys)
//   IMAGEKIT_FOLDER       (optional, defaults to "/growclinic/blog")
const IMAGEKIT_PRIVATE_KEY = process.env.IMAGEKIT_PRIVATE_KEY;
const IMAGEKIT_FOLDER = process.env.IMAGEKIT_FOLDER || "/growclinic/blog";

// POST — upload a file to ImageKit (server-side) and record it.
export async function POST(req: Request) {
  const session = await apiGuard("editor");
  if (session instanceof NextResponse) return session;
  if (!IMAGEKIT_PRIVATE_KEY) {
    return NextResponse.json(
      { error: "ImageKit is not configured. Set IMAGEKIT_PRIVATE_KEY." },
      { status: 500 },
    );
  }

  try {
    const form = await req.formData();
    const file = form.get("file") as File | null;
    if (!file) return NextResponse.json({ error: "No file uploaded" }, { status: 400 });

    const upload = new FormData();
    upload.append("file", file);
    upload.append("fileName", file.name || "upload");
    upload.append("folder", IMAGEKIT_FOLDER);
    upload.append("useUniqueFileName", "true");

    // Server-side auth: HTTP Basic with the private key as username, empty password.
    const authHeader = "Basic " + Buffer.from(IMAGEKIT_PRIVATE_KEY + ":").toString("base64");
    const res = await fetch("https://upload.imagekit.io/api/v1/files/upload", {
      method: "POST",
      headers: { Authorization: authHeader },
      body: upload,
    });
    const data = await res.json();
    if (!res.ok || !data.url) {
      console.error("ImageKit upload failed:", data);
      return NextResponse.json({ error: data?.message || "Upload failed" }, { status: 500 });
    }

    const media = await prisma.media.create({
      data: {
        filename: file.name || "upload",
        url: data.url as string,
        fileType: file.type || "application/octet-stream",
        size: file.size,
      },
    });

    return NextResponse.json({ ...media, url: data.url }, { status: 201 });
  } catch (e) {
    console.error("media upload error", e);
    return NextResponse.json({ error: e instanceof Error ? e.message : "Upload error" }, { status: 500 });
  }
}

// GET — media library (most recent first).
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const list = await prisma.media.findMany({ orderBy: { createdAt: "desc" }, take: 100 });
  return NextResponse.json(list);
}

// DELETE — remove a media record (?id=...). The ImageKit asset is left in place.
export async function DELETE(req: Request) {
  const session = await apiGuard("editor");
  if (session instanceof NextResponse) return session;
  const id = new URL(req.url).searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Media id required" }, { status: 400 });
  await prisma.media.delete({ where: { id } }).catch(() => {});
  return NextResponse.json({ success: true });
}
