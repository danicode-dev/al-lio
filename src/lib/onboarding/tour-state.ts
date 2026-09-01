// Pure product-tour state rules. No React, no database, no "server-only" -
// the client provider, the server actions and the tests all import from here
// so "should this student see the tour" has exactly one definition.

const PRODUCT_TOUR_STATUSES = ["not_started", "in_progress", "completed", "skipped"] as const;

export type ProductTourStatus = (typeof PRODUCT_TOUR_STATUSES)[number];

// Bump when the tour changes enough that everyone should be offered it again.
// A student who finished version N is not re-prompted until this passes N.
// Version 2 is the four-step recorrido: it points at the interface and creates
// nothing, so anyone who saw version 1 is offered this one.
export const PRODUCT_TOUR_VERSION = 2;

export type ProductTourState = {
  status: ProductTourStatus;
  version: number;
  step: string | null;
};

function isProductTourStatus(value: unknown): value is ProductTourStatus {
  return typeof value === "string" && (PRODUCT_TOUR_STATUSES as readonly string[]).includes(value);
}

export function normalizeProductTourState(raw: {
  product_tour_status?: unknown;
  product_tour_version?: unknown;
  product_tour_step?: unknown;
} | null | undefined): ProductTourState {
  const status = isProductTourStatus(raw?.product_tour_status) ? raw.product_tour_status : "not_started";
  const version = typeof raw?.product_tour_version === "number" && Number.isFinite(raw.product_tour_version)
    ? raw.product_tour_version
    : 0;
  const step = typeof raw?.product_tour_step === "string" && raw.product_tour_step.trim() ? raw.product_tour_step : null;
  return { status, version, step };
}

// A student is offered the tour when they have not been through this version
// of it yet.
//
// The version is only a tie-breaker for the terminal states. A run that is
// still `in_progress` already carries the current version (start writes it),
// so checking the version first would make a reload mid-tour look like a
// finished one and lose the tour for good - it has to resume instead.
// `skipped` is a decision and is respected until the tour itself moves on.
export function shouldOfferProductTour(state: ProductTourState, currentVersion = PRODUCT_TOUR_VERSION): boolean {
  if (state.status === "in_progress") return state.version <= currentVersion;
  if (state.status === "not_started") return true;
  return state.version < currentVersion;
}

// Resuming only makes sense from a run that was actually interrupted.
export function resumeStepFor(state: ProductTourState, currentVersion = PRODUCT_TOUR_VERSION): string | null {
  if (state.status !== "in_progress") return null;
  if (state.version > currentVersion) return null;
  return state.step;
}
