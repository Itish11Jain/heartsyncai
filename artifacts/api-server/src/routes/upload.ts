import { Router, type Request, type Response } from "express";
import { randomUUID } from "crypto";
import multer from "multer";
import { Client } from "@replit/object-storage";
import { removeBackground } from "../lib/bgRemove.js";

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

      // compress:false — JPEG/PNG/WebP are already compressed, so gzip wastes
      // CPU per upload for ~no size win and slows the request.
      const result = await getStorage().uploadFromBytes(key, file.buffer, {
        compress: false,
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

      // compress:false — audio (webm/ogg/mp3/mp4) is already compressed.
      const result = await getStorage().uploadFromBytes(key, file.buffer, {
        compress: false,
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

/**
 * POST /api/upload/sticker
 * Multipart "photo" field → background removal → transparent PNG URL.
 *
 * Background removal runs locally via the RMBG-1.4 segmentation model
 * (@huggingface/transformers). No external API or paid credits required.
 */
router.post(
  "/upload/sticker",
  photoUpload.single("photo"),
  async (req: Request, res: Response) => {
    try {
      const file = req.file;
      if (!file) { res.status(400).json({ error: "No file uploaded." }); return; }

      let pngBuffer: Buffer;
      try {
        const t0 = Date.now();
        pngBuffer = await removeBackground(file.buffer);
        console.info(`[sticker] background removed locally in ${Date.now() - t0}ms`);
      } catch (err) {
        console.error("[sticker] local background removal failed", err);
        res.status(502).json({ error: "Background removal failed. Please try again." });
        return;
      }

      // The client may supply a stable id so it can predict the sticker URL
      // before background removal finishes — the birthday card then swaps the
      // cutout in the moment it's ready instead of being stuck on the full photo.
      // We only honour a client-supplied id when nothing is stored there yet, so
      // an attacker who learns a card's sticker URL can't overwrite/deface it.
      const rawId = typeof req.body?.stickerId === "string" ? req.body.stickerId.trim() : "";
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(rawId);
      let key = `sticker/${randomUUID()}.png`;
      if (isUuid) {
        const candidate = `sticker/${rawId}.png`;
        const existsRes = await getStorage().exists(candidate);
        if (existsRes.ok && existsRes.value === false) {
          key = candidate;
        }
      }

      const result = await getStorage().uploadFromBytes(key, pngBuffer, { compress: false });
      if (!result.ok) {
        console.error("[sticker] Object Storage upload failed", result.error);
        res.status(500).json({ error: "Upload failed. Please try again." });
        return;
      }

      const origin = `${req.protocol}://${req.get("host")}`;
      res.json({ url: `${origin}/api/stickers/${key}` });
    } catch (err) {
      console.error("[sticker] POST /upload/sticker error", err);
      res.status(500).json({ error: "internal_error" });
    }
  },
);

/**
 * GET /api/stickers/*
 * Streams a transparent PNG sticker from Object Storage.
 */
router.get(/^\/stickers\/(.+)$/, async (req: Request, res: Response) => {
  try {
    const key = (req.params as Record<string, string>)["0"];
    if (!key) { res.status(400).json({ error: "Missing key" }); return; }
    if (!key.startsWith("sticker/")) { res.status(403).json({ error: "Forbidden" }); return; }

    res.setHeader("Content-Type", "image/png");
    res.setHeader("Cache-Control", "public, max-age=31536000, immutable");

    const stream = getStorage().downloadAsStream(key);
    stream.pipe(res);
    stream.on("error", (err: NodeJS.ErrnoException) => {
      console.error("[sticker] Stream error", err);
      if (!res.headersSent) res.status(err.code === "ENOENT" ? 404 : 500).end();
    });
  } catch (err) {
    console.error("[sticker] GET /stickers/* error", err);
    if (!res.headersSent) res.status(500).json({ error: "internal_error" });
  }
});

export default router;
