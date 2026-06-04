/**
 * Background-removal client.
 *
 * The actual model load, ONNX inference and RGBA compositing run in a dedicated
 * worker thread (`bgRemoveWorker.ts`) so none of that heavy CPU or the model's
 * memory ever touches the main thread that serves photo/voice uploads. The
 * worker is spawned lazily on first use and torn down after a period of
 * inactivity, which fully reclaims the model's memory between cards.
 */
import path from "node:path";
import { fileURLToPath } from "node:url";
import { Worker } from "node:worker_threads";

// Tear the worker (and the model it holds) down after this long with no jobs,
// returning the instance to its baseline memory footprint.
const IDLE_TIMEOUT_MS = 60_000;

interface WorkerResponse {
  id: number;
  ok: boolean;
  output?: Uint8Array;
  error?: string;
}

interface Pending {
  resolve: (buf: Buffer) => void;
  reject: (err: Error) => void;
}

let worker: Worker | null = null;
let nextId = 1;
let idleTimer: NodeJS.Timeout | null = null;
const pending = new Map<number, Pending>();

function workerPath(): string {
  // `bgRemove.ts` is bundled into dist/index.mjs and the worker is emitted as
  // dist/bgRemoveWorker.mjs (a sibling), so resolve relative to this module.
  const dir = path.dirname(fileURLToPath(import.meta.url));
  return path.join(dir, "bgRemoveWorker.mjs");
}

function clearIdleTimer(): void {
  if (idleTimer) {
    clearTimeout(idleTimer);
    idleTimer = null;
  }
}

function scheduleIdleShutdown(): void {
  clearIdleTimer();
  idleTimer = setTimeout(() => {
    idleTimer = null;
    if (worker && pending.size === 0) {
      const w = worker;
      worker = null;
      w.terminate().catch(() => {});
      console.info("[bgRemove] worker idle, terminated to free memory");
    }
  }, IDLE_TIMEOUT_MS);
  // Don't let the idle timer keep the process alive on its own.
  idleTimer.unref?.();
}

function failAllPending(err: Error): void {
  for (const { reject } of pending.values()) {
    reject(err);
  }
  pending.clear();
}

function getWorker(): Worker {
  if (worker) return worker;

  const w = new Worker(workerPath());

  w.on("message", (msg: WorkerResponse) => {
    const job = pending.get(msg.id);
    if (!job) return;
    pending.delete(msg.id);
    if (msg.ok && msg.output) {
      job.resolve(Buffer.from(msg.output));
    } else {
      job.reject(new Error(msg.error ?? "background removal failed"));
    }
    if (pending.size === 0) scheduleIdleShutdown();
  });

  w.on("error", (err) => {
    console.error("[bgRemove] worker error", err);
    // Only react if this is still the active worker. An old worker we
    // deliberately replaced/terminated must never touch the new worker's jobs.
    if (worker !== w) return;
    worker = null;
    failAllPending(err instanceof Error ? err : new Error(String(err)));
  });

  w.on("exit", (code) => {
    // Ignore exits from a worker we already swapped out (e.g. idle shutdown);
    // its jobs were settled when it stopped being the active worker.
    if (worker !== w) return;
    worker = null;
    if (pending.size > 0) {
      failAllPending(new Error(`bgRemove worker exited (code ${code})`));
    }
  });

  worker = w;
  return w;
}

/**
 * Remove the background from an image buffer.
 * Runs the RMBG-1.4 segmentation model in a worker thread (no external API)
 * and composites the predicted mask as the alpha channel of the original image.
 *
 * @returns a transparent PNG buffer.
 */
export function removeBackground(input: Buffer): Promise<Buffer> {
  const id = nextId++;
  const w = getWorker();
  clearIdleTimer();

  return new Promise<Buffer>((resolve, reject) => {
    pending.set(id, { resolve, reject });
    // Copy into a fresh, transferable ArrayBuffer so we hand ownership to the
    // worker without disturbing the caller's buffer.
    const copy = new Uint8Array(input.byteLength);
    copy.set(input);
    w.postMessage({ id, input: copy }, [copy.buffer]);
  });
}
