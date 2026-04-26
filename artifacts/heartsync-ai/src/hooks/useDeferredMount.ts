import { useEffect, useState } from "react";

/**
 * Defers mounting non-critical UI until the browser has finished its initial
 * critical work (paint, layout, hydration). Mounts as soon as
 * `requestIdleCallback` fires, with a hard timeout fallback so the content
 * always appears even on busy main threads or browsers without rIC.
 *
 * Usage:
 *   const ready = useDeferredMount();
 *   return ready ? <BelowTheFold /> : null;
 *
 * Or to render a placeholder of equivalent height to avoid CLS:
 *   const ready = useDeferredMount();
 *   return <section style={{ minHeight: 320 }}>{ready && <Heavy />}</section>;
 */
export function useDeferredMount(timeoutMs = 1500): boolean {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const reveal = () => {
      if (!cancelled) setReady(true);
    };

    const w = window as unknown as {
      requestIdleCallback?: (cb: () => void, opts?: { timeout?: number }) => number;
      cancelIdleCallback?: (id: number) => void;
    };

    let idleId: number | undefined;
    let timerId: number | undefined;

    if (typeof w.requestIdleCallback === "function") {
      idleId = w.requestIdleCallback(reveal, { timeout: timeoutMs });
    } else {
      timerId = window.setTimeout(reveal, Math.min(timeoutMs, 600));
    }

    return () => {
      cancelled = true;
      if (idleId !== undefined && typeof w.cancelIdleCallback === "function") {
        w.cancelIdleCallback(idleId);
      }
      if (timerId !== undefined) window.clearTimeout(timerId);
    };
  }, [timeoutMs]);

  return ready;
}
