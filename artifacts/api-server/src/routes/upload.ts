import { Router, type Request, type Response } from "express";
import { randomUUID } from "crypto";
import multer from "multer";
import { Client } from "@replit/object-storage";

const router = Router();

let _storage: Client | null = null;
function getStorage(): Client {
  if (!_storage) {
    const bucketId = process.env.DEFAULT_OBJECT_STORAGE_BUCKET_ID;
    _storage = bucketId ? new Client({ bucketId }) : new Client();
  }
  return _storage;
}

const ALLOWED_IMAGE_MIME: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/jpg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

const ALLOWED_AUDIO_MIME: Record<string, string> = {
  "audio/webm": "webm",
  "audio/ogg": "ogg",
  "audio/mpeg": "mp3",
  "audio/mp4": "mp4",
  "audio/wav": "wav",
  "audio/x-wav": "wav",
};

const photoUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter(_req, file, cb) {
    if (file.mimetype in ALLOWED_IMAGE_MIME) {
      cb(null, true);
    } else {
      cb(new Error("Only JPEG, PNG, and WebP images are allowed."));
    }
  },
});

const audioUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter(_req, file, cb) {
    if (file.mimetype in ALLOWED_AUDIO_MIME) {
      cb(null, true);
    } else {
      cb(new Error("Only audio files (webm, mp3, ogg, wav) are allowed."));
    }
  },
});

/**
 * POST /api/upload/photo
 * Multipart form-data with field name "photo".
 * Returns { url: string }
 */
router.post(
  "/upload/photo",
  photoUpload.single("photo"),
  async (req: Request, res: Response) => {
    try {
      const file = req.file;
      if (!file) {
        res.status(400).json({ error: "No file uploaded." });
        return;
      }

      const ext = ALLOWED_IMAGE_MIME[file.mimetype] ?? "jpg";
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
 * POST /api/upload/audio
 * Multipart form-data with field name "audio".
 * Returns { url: string }
 */
router.post(
  "/upload/audio",
  audioUpload.single("audio"),
  async (req: Request, res: Response) => {
    try {
      const file = req.file;
      if (!file) {
        res.status(400).json({ error: "No audio file uploaded." });
        return;
      }

      const ext = ALLOWED_AUDIO_MIME[file.mimetype] ?? "webm";
      const key = `audio/${randomUUID()}.${ext}`;

      const result = await getStorage().uploadFromBytes(key, file.buffer, {
        contentType: file.mimetype,
      });

      if (!result.ok) {
        console.error("[upload] Audio upload failed", result.error);
        res.status(500).json({ error: "Upload failed. Please try again." });
        return;
      }

      const origin = `${req.protocol}://${req.get("host")}`;
      const url = `${origin}/api/audio/${key}`;

      res.json({ url });
    } catch (err) {
      console.error("[upload] POST /upload/audio error", err);
      res.status(500).json({ error: "internal_error" });
    }
  },
);

/**
 * GET /api/photos/*
 * Streams a photo from Object Storage.
 */
router.get(/^\/photos\/(.+)$/, async (req: Request, res: Response) => {
  try {
    const key = (req.params as Record<string, string>)["0"];
    if (!key) { res.status(400).json({ error: "Missing key" }); return; }
    if (!key.startsWith("photo/")) { res.status(403).json({ error: "Forbidden" }); return; }

    const ext = key.split(".").pop()?.toLowerCase() ?? "jpg";
    const mimeMap: Record<string, string> = { jpg: "image/jpeg", jpeg: "image/jpeg", png: "image/png", webp: "image/webp" };

    res.setHeader("Content-Type", mimeMap[ext] ?? "image/jpeg");
    res.setHeader("Cache-Control", "public, max-age=31536000, immutable");

    const stream = getStorage().downloadAsStream(key);
    stream.pipe(res);
    stream.on("error", (err: NodeJS.ErrnoException) => {
      console.error("[upload] Stream error", err);
      if (!res.headersSent) res.status(err.code === "ENOENT" ? 404 : 500).end();
    });
  } catch (err) {
    console.error("[upload] GET /photos/* error", err);
    if (!res.headersSent) res.status(500).json({ error: "internal_error" });
  }
});

/**
 * GET /api/audio/*
 * Streams an audio file from Object Storage.
 */
router.get(/^\/audio\/(.+)$/, async (req: Request, res: Response) => {
  try {
    const key = (req.params as Record<string, string>)["0"];
    if (!key) { res.status(400).json({ error: "Missing key" }); return; }
    if (!key.startsWith("audio/")) { res.status(403).json({ error: "Forbidden" }); return; }

    const ext = key.split(".").pop()?.toLowerCase() ?? "webm";
    const mimeMap: Record<string, string> = {
      webm: "audio/webm", ogg: "audio/ogg", mp3: "audio/mpeg",
      mp4: "audio/mp4", wav: "audio/wav",
    };

    res.setHeader("Content-Type", mimeMap[ext] ?? "audio/webm");
    res.setHeader("Cache-Control", "public, max-age=31536000, immutable");

    const stream = getStorage().downloadAsStream(key);
    stream.pipe(res);
    stream.on("error", (err: NodeJS.ErrnoException) => {
      console.error("[upload] Audio stream error", err);
      if (!res.headersSent) res.status(err.code === "ENOENT" ? 404 : 500).end();
    });
  } catch (err) {
    console.error("[upload] GET /audio/* error", err);
    if (!res.headersSent) res.status(500).json({ error: "internal_error" });
  }
});

export default router;
