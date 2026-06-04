/**
 * Background-removal worker thread.
 *
 * This file runs in a dedicated worker thread (its own V8 isolate), spawned by
 * `bgRemove.ts`. Running the RMBG-1.4 model, ONNX inference and the heavy RGBA
 * compositing loop here keeps all of that work — and the model's memory — off
 * the main thread that serves photo/voice uploads. The parent terminates this
 * worker when idle, which fully reclaims the model's memory between cards.
 */
import { parentPort } from "node:worker_threads";
import sharp from "sharp";
import {
  AutoModel,
  AutoProcessor,
  RawImage,
  type PreTrainedModel,
  type Processor,
} from "@huggingface/transformers";

const MODEL_ID = "briaai/RMBG-1.4";

// Cap the resolution we composite at. The model itself downsamples internally,
// so a huge source image only inflates memory during mask resize + compositing
// without improving sticker quality. 1600px on the long edge is plenty.
const MAX_DIMENSION = 1600;

if (!parentPort) {
  throw new Error("bgRemoveWorker must be run as a worker thread");
}
const port = parentPort;

let _loadPromise: Promise<{ model: PreTrainedModel; processor: Processor }> | null =
  null;

function load(): Promise<{ model: PreTrainedModel; processor: Processor }> {
  if (!_loadPromise) {
    _loadPromise = (async () => {
      const t0 = Date.now();
      const [model, processor] = await Promise.all([
        AutoModel.from_pretrained(MODEL_ID),
        AutoProcessor.from_pretrained(MODEL_ID),
      ]);
      console.info(
        `[bgRemove:worker] model "${MODEL_ID}" loaded in ${Date.now() - t0}ms`,
      );
      return { model, processor };
    })().catch((err) => {
      // Reset so a later request can retry if the first load failed.
      _loadPromise = null;
      throw err;
    });
  }
  return _loadPromise;
}

async function removeBackground(input: Buffer): Promise<Buffer> {
  const { model, processor } = await load();

  // Downscale very large uploads to bound memory during compositing.
  const normalized = await sharp(input)
    .rotate() // honour EXIF orientation
    .resize(MAX_DIMENSION, MAX_DIMENSION, {
      fit: "inside",
      withoutEnlargement: true,
    })
    .toBuffer();

  const image = await RawImage.fromBlob(new Blob([new Uint8Array(normalized)]));
  const { pixel_values } = await processor(image);
  const { output } = await model({ input: pixel_values });

  // output: [1, 1, H, W] foreground probability in 0..1
  const maskImg = await RawImage.fromTensor(
    output[0].mul(255).to("uint8"),
  ).resize(image.width, image.height);
  const mask = Buffer.from(maskImg.data);

  const { data: rgba, info } = await sharp(normalized)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const pixels = info.width * info.height;
  for (let i = 0; i < pixels; i++) {
    rgba[i * 4 + 3] = mask[i];
  }

  return sharp(rgba, {
    raw: { width: info.width, height: info.height, channels: 4 },
  })
    .png()
    .toBuffer();
}

interface JobRequest {
  id: number;
  input: Uint8Array;
}

// Process one job at a time. ONNX already uses multiple threads internally, so
// serialising keeps peak memory/CPU bounded under a burst of requests.
let chain: Promise<unknown> = Promise.resolve();

port.on("message", (msg: JobRequest) => {
  const { id, input } = msg;
  chain = chain.then(async () => {
    try {
      const out = await removeBackground(Buffer.from(input));
      const ab = out.buffer.slice(
        out.byteOffset,
        out.byteOffset + out.byteLength,
      ) as ArrayBuffer;
      port.postMessage({ id, ok: true, output: new Uint8Array(ab) }, [ab]);
    } catch (err) {
      port.postMessage({
        id,
        ok: false,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  });
});
