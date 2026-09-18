import { NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import { join } from "path";
import { apiGuard } from "@/lib/guards";

// Editors upload images for posts, testimonials, case studies and logos only.
const ALLOWED_EXTENSIONS = new Set(["jpg", "jpeg", "png", "webp", "gif", "avif", "svg"]);
const MAX_BYTES = 10 * 1024 * 1024;

export async function POST(req: Request) {
  try {
    const session = await apiGuard("editor");
    if (session instanceof NextResponse) return session;

    const formData = await req.formData();
    const file = formData.get("file");

    if (!file || typeof file === "string") {
      return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
    }
    if (file.size > MAX_BYTES) {
      return NextResponse.json({ error: "File is too large (max 10 MB)" }, { status: 413 });
    }

    // The client controls file.name — only a known image extension is kept, so
    // the stored name can never contain a path separator or an active type.
    const extension = (file.name.split(".").pop() || "").toLowerCase();
    if (!ALLOWED_EXTENSIONS.has(extension)) {
      return NextResponse.json({ error: "Only image files (jpg, png, webp, gif, avif, svg) can be uploaded" }, { status: 415 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const fileName = `${crypto.randomUUID()}.${extension}`;

    // Support configurable upload directory for Hostinger persistence
    const uploadDir = process.env.UPLOAD_DIR || join(process.cwd(), "public", "uploads");
    await mkdir(uploadDir, { recursive: true });

    await writeFile(join(uploadDir, fileName), buffer);
    const url = `/api/uploads/${fileName}`;

    return NextResponse.json({ url });
  } catch (error) {
    console.error("Upload error:", error);
    return NextResponse.json({ error: "Failed to upload file" }, { status: 500 });
  }
}
