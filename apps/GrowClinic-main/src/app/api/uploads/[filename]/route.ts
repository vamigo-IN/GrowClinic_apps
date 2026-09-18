import { NextRequest, NextResponse } from "next/server";
import { readFile } from "fs/promises";
import { basename, join } from "path";
import { existsSync } from "fs";

const CONTENT_TYPES: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  gif: "image/gif",
  avif: "image/avif",
  svg: "image/svg+xml",
};

export async function GET(request: NextRequest, { params }: { params: Promise<{ filename: string }> }) {
  try {
    const { filename } = await params;

    if (!filename) {
      return new NextResponse("Filename snippet missing", { status: 400 });
    }

    // Plain file names only — reject path separators, "..", and dotfiles so a
    // request can never read outside the upload directory.
    if (filename !== basename(filename) || filename.includes("\\") || filename.startsWith(".")) {
      return new NextResponse("Requested asset not found in backend storage", { status: 404 });
    }

    // Look up file in the configured upload directory (supports external path via UPLOAD_DIR)
    const uploadDir = process.env.UPLOAD_DIR || join(process.cwd(), "public", "uploads");
    const filePath = join(uploadDir, filename);

    if (!existsSync(filePath)) {
      return new NextResponse("Requested asset not found in backend storage", { status: 404 });
    }

    const fileBuffer = await readFile(filePath);
    const ext = filename.split(".").pop()?.toLowerCase() || "";
    const contentType = CONTENT_TYPES[ext];

    return new NextResponse(fileBuffer, {
      headers: {
        // Anything that is not a known image is offered as a download, never rendered.
        "Content-Type": contentType || "application/octet-stream",
        ...(contentType ? {} : { "Content-Disposition": "attachment" }),
        "X-Content-Type-Options": "nosniff",
        // Uploaded SVGs opened directly must not run script on this origin.
        "Content-Security-Policy": "default-src 'none'; img-src 'self' data:; style-src 'unsafe-inline'; sandbox",
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch (error) {
    console.error("Asset serving failure:", error);
    return new NextResponse("Internal Server Error retrieving file buffer", { status: 500 });
  }
}
