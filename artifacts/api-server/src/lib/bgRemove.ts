import sharp from "sharp";
import {
  AutoModel,
  AutoProcessor,
  RawImage,
  type PreTrainedModel,
  type Processor,
} from "@huggingface/transformers";

const MODEL_ID = "briaai/RMBG-1.4";

let _loadPromise: Promise<{ model: PreTrainedModel; processor: Processor }> | null = null;

function load(): Promise<{ model: PreTrainedModel; processor: Processor }> {
  if (!_loadPromise) {
    _loadPromise = (async () => {
      const t0 = Date.now();
      const [model, processor] = await Promise.all([
        AutoModel.from_pretrained(MODEL_ID),
        AutoProcessor.from_pretrained(MODEL_ID),
      ]);
      console.info(`[bgRemove] model "${MODEL_ID}" loaded in ${Date.now() - t0}ms`);
      return { model, processor };
    })().catch((err) => {
      // Reset so a later request can retry if the first load failed.
      _loadPromise = null;
      throw err;
    });
  }
  return _loadPromise;
}

// Cap the resolution we composite at. The model itself downsamples internally,
// so a huge source image only inflates memory during mask resize + compositing
// without improving sticker quality. 1600px on the long edge is plenty for a card.
const MAX_DIMENSION = 1600;

// Serialize inference so a burst of simultaneous requests cannot spin up many
// concurrent ONNX runs and exhaust CPU/RAM. ONNX already uses multiple threads
// internally, so one job at a time keeps the box healthy under load.
let _chain: Promise<unknown> = Promise.resolve();
function runExclusive<T>(fn: () => Promise<T>): Promise<T> {
  const next = _chain.then(fn, fn);
  // Keep the chain alive regardless of individual success/failure.
  _chain = next.then(
    () => undefined,
    () => undefined,
  );
  return next;
}

/**
 * Remove the background from an image buffer.
 * Runs the RMBG-1.4 segmentation model locally (no external API) and
 * composites the predicted mask as the alpha channel of the original image.
 *
 * Runs in-process: ONNX inference happens on libuv worker threads (it does not
 * block the main event loop), and inference is serialized to bound memory/CPU.
 * NOTE: do NOT move this into a worker_thread — `onnxruntime-node` is a
 * non-context-aware native addon and fails with "Module did not self-register"
 * (ERR_DLOPEN_FAILED) when loaded into a second/respawned worker thread.
 *
 * @returns a transparent PNG buffer.
 */
export async function removeBackground(input: Buffer): Promise<Buffer> {
  const { model, processor } = await load();

  // Downscale very large uploads to bound memory during compositing.
  const normalized = await sharp(input)
    .rotate() // honour EXIF orientation
    .resize(MAX_DIMENSION, MAX_DIMENSION, {
      fit: "inside",
      withoutEnlargement: true,
    })
    .toBuffer();

  return runExclusive(async () => {
    const image = await RawImage.fromBlob(
      new Blob([new Uint8Array(normalized)]),
    );
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
  });
}
