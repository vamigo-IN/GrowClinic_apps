// Client-side image compression.
//
// Blog images are delivered small (ImageKit resizes/optimizes on the fly), so
// there's no reason to ship a multi-MB original over the wire — the reverse
// proxy (nginx client_max_body_size) rejects large bodies with a 413 anyway.
// We downscale to a sane max dimension and re-encode to WebP/JPEG, stepping
// quality down until the result fits under `maxBytes`. Runs entirely in the
// browser before the upload request is made.

export interface CompressOptions {
  maxBytes?: number;     // target ceiling for the output file
  maxDimension?: number; // longest edge, in px
  mimeType?: string;     // output encoding
}

const DEFAULTS: Required<CompressOptions> = {
  maxBytes: 1.8 * 1024 * 1024, // stay comfortably under the proxy limit
  maxDimension: 2000,
  mimeType: "image/webp",
};

// Formats we leave untouched: SVG is vector, GIF may be animated (canvas
// re-encoding would flatten it to a single frame).
const SKIP = ["image/svg+xml", "image/gif"];

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new window.Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Could not read the image file."));
    };
    img.src = url;
  });
}

function canvasToBlob(canvas: HTMLCanvasElement, type: string, quality: number): Promise<Blob | null> {
  return new Promise((resolve) => canvas.toBlob((b) => resolve(b), type, quality));
}

/**
 * Returns a compressed File if the input is a raster image over the target
 * size, otherwise returns the original file unchanged. Never throws for a
 * normal image — on any failure it falls back to the original file so the
 * upload can still proceed.
 */
export async function compressImage(file: File, options: CompressOptions = {}): Promise<File> {
  const opts = { ...DEFAULTS, ...options };

  if (!file.type.startsWith("image/") || SKIP.includes(file.type)) return file;
  if (file.size <= opts.maxBytes) return file; // already small enough

  try {
    const img = await loadImage(file);

    // Scale the longest edge down to maxDimension (never upscale).
    const scale = Math.min(1, opts.maxDimension / Math.max(img.width, img.height));
    const w = Math.round(img.width * scale);
    const h = Math.round(img.height * scale);

    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) return file;
    ctx.drawImage(img, 0, 0, w, h);

    // Step quality down until we're under the ceiling (or hit the floor).
    let quality = 0.9;
    let blob = await canvasToBlob(canvas, opts.mimeType, quality);
    while (blob && blob.size > opts.maxBytes && quality > 0.4) {
      quality -= 0.1;
      blob = await canvasToBlob(canvas, opts.mimeType, quality);
    }

    if (!blob || blob.size >= file.size) return file; // no win — keep original

    const ext = opts.mimeType === "image/webp" ? "webp" : "jpg";
    const base = file.name.replace(/\.[^.]+$/, "") || "image";
    return new File([blob], `${base}.${ext}`, { type: opts.mimeType, lastModified: Date.now() });
  } catch {
    return file; // fail open — let the server/proxy decide
  }
}
