"use client";

import { useEffect } from "react";

// How the tour opens things it does not own.
//
// The + dialog's `open` state lives in StudentHeaderActions and the mobile
// menu's in MobileHeaderNavigation. Rather than lifting that state (a large,
// risky refactor) or synthesising clicks (fragile, and explicitly ruled out),
// each component subscribes here with the setter it already has. The tour
// publishes an intent; the component performs it with the exact same call a
// real click performs. One implementation, no DOM synthesis.
export type TourUiCommand =
  | { type: "quick-add:open"; prefill?: { title?: string; notes?: string } }
  | { type: "quick-add:close" }
  | { type: "mobile-menu:open" }
  | { type: "mobile-menu:close" }
  | { type: "bloc:create-note"; title: string; body: string; demoDatasetId: string };

type Handler = (command: TourUiCommand) => void;

const handlers = new Map<TourUiCommand["type"], Set<Handler>>();

export function publishTourUiCommand(command: TourUiCommand): boolean {
  const listeners = handlers.get(command.type);
  if (!listeners || listeners.size === 0) return false;
  for (const handler of listeners) handler(command);
  return true;
}

// Subscribing components stay in charge of their own state. `handler` is read
// through a ref-free re-subscribe on every render of the calling component,
// which is cheap here (a handful of subscribers) and avoids a stale closure
// over the setter.
export function useTourUiCommand(type: TourUiCommand["type"], handler: Handler): void {
  useEffect(() => {
    let listeners = handlers.get(type);
    if (!listeners) {
      listeners = new Set();
      handlers.set(type, listeners);
    }
    listeners.add(handler);
    return () => {
      listeners?.delete(handler);
      if (listeners && listeners.size === 0) handlers.delete(type);
    };
  }, [type, handler]);
}
