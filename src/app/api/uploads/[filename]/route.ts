import { NextRequest, NextResponse } from "next/server";
import { readFile } from "fs/promises";
import { join } from "path";
import { existsSync } from "fs";

export async function GET(request: NextRequest, { params }: { params: Promise<{ filename: string }> }) {
  try {
    const { filename } = await params;

    if (!filename) {
      return new NextResponse("Filename snippet missing", { status: 400 });
    }

    // Look up file in the configured upload directory (supports external path via UPLOAD_DIR)
    const uploadDir = process.env.UPLOAD_DIR || join(process.cwd(), "public", "uploads");
    const filePath = join(uploadDir, filename);

    if (!existsSync(filePath)) {
      return new NextResponse("Requested asset not found in backend storage", { status: 404 });
    }

    const fileBuffer = await readFile(filePath);
    
    // Explicitly classify standard image streams
    const ext = filename.split('.').pop()?.toLowerCase();
    let contentType = 'application/octet-stream';
    if (ext === 'jpg' || ext === 'jpeg') contentType = 'image/jpeg';
    else if (ext === 'png') contentType = 'image/png';
    else if (ext === 'webp') contentType = 'image/webp';
    else if (ext === 'gif') contentType = 'image/gif';
    else if (ext === 'svg') contentType = 'image/svg+xml';

    return new NextResponse(fileBuffer, {
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch (error) {
    console.error("Asset serving failure:", error);
    return new NextResponse("Internal Server Error retrieving file buffer", { status: 500 });
  }
}
