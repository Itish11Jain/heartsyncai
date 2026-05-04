import { Router, type Request, type Response } from "express";
import { randomUUID } from "crypto";
import multer from "multer";
import { Client } from "@replit/object-storage";

const router = Router();

// Lazily-initialized client — avoids crash at startup if bucket env var isn't set yet.
// Passes the bucket ID explicitly since the Replit sidecar may return an empty bucketId.
let _storage: Client | null = null;
function getStorage(): Client {
  if (!_storage) {
    const bucketId = process.env.DEFAULT_OBJECT_STORAGE_BUCKET_ID;
    _storage = bucketId ? new Client({ bucketId }) : new Client();
  }
  return _storage;
}

const ALLOWED_MIME: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/jpg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter(_req, file, cb) {
    if (file.mimetype in ALLOWED_MIME) {
      cb(null, true);
    } else {
      cb(new Error("Only JPEG, PNG, and WebP images are allowed."));
    }
  },
});

/**
 * POST /api/upload/photo
 * Multipart form-data with field name "photo".
 * Returns { url: string } — a path the browser can load directly.
 * Auth is optional (upload before sign-in is intentional).
 */
router.post(
  "/upload/photo",
  upload.single("photo"),
  async (req: Request, res: Response) => {
    try {
      const file = req.file;
      if (!file) {
        res.status(400).json({ error: "No file uploaded." });
        return;
      }

      const ext = ALLOWED_MIME[file.mimetype] ?? "jpg";
      const key = `photo/${randomUUID()}.${ext}`;

      const result = await getStorage().uploadFromBytes(key, file.buffer, {
        contentType: file.mimetype,
      });

      if (!result.ok) {
        console.error("[upload] Object Storage upload failed", result.error);
        res.status(500).json({ error: "Upload failed. Please try again." });
        return;
      }

      const origin = `${req.protocol}://${req.get("host")}`;
      const url = `${origin}/api/photos/${key}`;

      res.json({ url });
    } catch (err) {
      console.error("[upload] POST /upload/photo error", err);
      res.status(500).json({ error: "internal_error" });
    }
  },
);

/**
 * GET /api/photos/*  (served via a regex route for path-to-regexp v8 compat)
 * Streams a photo from Object Storage back to the browser.
 * Public — no auth needed (photos are already shared via card URLs).
 */
router.get(/^\/photos\/(.+)$/, async (req: Request, res: Response) => {
  try {
    const key = (req.params as Record<string, string>)["0"];
    if (!key) {
      res.status(400).json({ error: "Missing key" });
      return;
    }

    const existsResult = await getStorage().exists(key);
    if (!existsResult.ok || !existsResult.value) {
      res.status(404).json({ error: "Not found" });
      return;
    }

    const ext = key.split(".").pop()?.toLowerCase() ?? "jpg";
    const mimeMap: Record<string, string> = { jpg: "image/jpeg", jpeg: "image/jpeg", png: "image/png", webp: "image/webp" };
    const contentType = mimeMap[ext] ?? "image/jpeg";

    res.setHeader("Content-Type", contentType);
    res.setHeader("Cache-Control", "public, max-age=31536000, immutable");

    const stream = getStorage().downloadAsStream(key);
    stream.pipe(res);
    stream.on("error", (err) => {
      console.error("[upload] Stream error", err);
      if (!res.headersSent) res.status(500).end();
    });
  } catch (err) {
    console.error("[upload] GET /photos/* error", err);
    if (!res.headersSent) res.status(500).json({ error: "internal_error" });
  }
});

export default router;
