import { NextResponse } from "next/server";
import { readdir, stat } from "fs/promises";
import { join } from "path";
import { existsSync } from "fs";
import { auth } from "@/lib/auth";

// GET /api/uploads — list all uploaded images for the image library
export async function GET() {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const uploadsDir = join(process.cwd(), "public", "uploads");

    if (!existsSync(uploadsDir)) {
      return NextResponse.json([]);
    }

    const files = await readdir(uploadsDir);
    const imageExtensions = [".jpg", ".jpeg", ".png", ".webp", ".gif", ".svg"];

    const images = await Promise.all(
      files
        .filter((f) => imageExtensions.some((ext) => f.toLowerCase().endsWith(ext)))
        .map(async (filename) => {
          const filePath = join(uploadsDir, filename);
          const fileStat = await stat(filePath);
          return {
            filename,
            url: `/api/uploads/${filename}`,
            size: fileStat.size,
            modified: fileStat.mtime.toISOString(),
          };
        })
    );

    // Most recent first
    images.sort((a, b) => new Date(b.modified).getTime() - new Date(a.modified).getTime());

    return NextResponse.json(images);
  } catch (error) {
    console.error("Error listing uploads:", error);
    return NextResponse.json({ error: "Failed to list uploads" }, { status: 500 });
  }
}
