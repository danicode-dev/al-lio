"use client";

// Synchronisation primitives for the tour.
//
// Nothing here uses a delay as the mechanism: each helper resolves on a real
// condition (the node exists, the predicate holds) observed through the
// platform. `timeoutMs` is a recovery ceiling only - when it fires the step is
// abandoned and the tour moves on, which is what keeps a missing element from
// stranding the student behind an overlay.

export class TourAbortError extends Error {
  constructor() {
    super("tour-aborted");
    this.name = "TourAbortError";
  }
}

const DEFAULT_TIMEOUT_MS = 8_000;

function throwIfAborted(signal?: AbortSignal): void {
  if (signal?.aborted) throw new TourAbortError();
}

// Resolves with the element, or null when the ceiling is reached. Uses a
// MutationObserver rather than polling so a node that appears after a
// navigation or a dialog opening is picked up on the same frame it lands.
export function waitForElement(
  selector: string,
  { signal, timeoutMs = DEFAULT_TIMEOUT_MS }: { signal?: AbortSignal; timeoutMs?: number } = {},
): Promise<HTMLElement | null> {
  throwIfAborted(signal);

  const existing = document.querySelector<HTMLElement>(selector);
  if (existing) return Promise.resolve(existing);

  return new Promise((resolve, reject) => {
    let settled = false;

    const finish = (value: HTMLElement | null) => {
      if (settled) return;
      settled = true;
      observer.disconnect();
      window.clearTimeout(timer);
      signal?.removeEventListener("abort", onAbort);
      resolve(value);
    };

    const onAbort = () => {
      if (settled) return;
      settled = true;
      observer.disconnect();
      window.clearTimeout(timer);
      reject(new TourAbortError());
    };

    const observer = new MutationObserver(() => {
      const found = document.querySelector<HTMLElement>(selector);
      if (found) finish(found);
    });

    const timer = window.setTimeout(() => finish(null), timeoutMs);

    observer.observe(document.body, { childList: true, subtree: true, attributes: true });
    signal?.addEventListener("abort", onAbort, { once: true });
  });
}

// For conditions the DOM cannot express - "the store now contains this task",
// "the router committed this route". Re-checked on animation frames so it
// settles as soon as React has painted the change, and never busy-loops
// beyond the ceiling.
export function waitForCondition(
  predicate: () => boolean,
  { signal, timeoutMs = DEFAULT_TIMEOUT_MS }: { signal?: AbortSignal; timeoutMs?: number } = {},
): Promise<boolean> {
  throwIfAborted(signal);
  if (predicate()) return Promise.resolve(true);

  return new Promise((resolve, reject) => {
    let settled = false;
    let frame = 0;

    const finish = (value: boolean) => {
      if (settled) return;
      settled = true;
      window.cancelAnimationFrame(frame);
      window.clearTimeout(timer);
      signal?.removeEventListener("abort", onAbort);
      resolve(value);
    };

    const onAbort = () => {
      if (settled) return;
      settled = true;
      window.cancelAnimationFrame(frame);
      window.clearTimeout(timer);
      reject(new TourAbortError());
    };

    const tick = () => {
      if (settled) return;
      if (predicate()) {
        finish(true);
        return;
      }
      frame = window.requestAnimationFrame(tick);
    };

    const timer = window.setTimeout(() => finish(false), timeoutMs);
    signal?.addEventListener("abort", onAbort, { once: true });
    frame = window.requestAnimationFrame(tick);
  });
}

// A deliberate, bounded pause used only where the point IS the pacing - the
// beat between filling a field and submitting, so the student can read what
// happened. Never used to guess that something finished.
export function pause(ms: number, signal?: AbortSignal): Promise<void> {
  throwIfAborted(signal);
  return new Promise((resolve, reject) => {
    const timer = window.setTimeout(() => {
      signal?.removeEventListener("abort", onAbort);
      resolve();
    }, ms);
    function onAbort() {
      window.clearTimeout(timer);
      reject(new TourAbortError());
    }
    signal?.addEventListener("abort", onAbort, { once: true });
  });
}

export function prefersReducedMotion(): boolean {
  return typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}
