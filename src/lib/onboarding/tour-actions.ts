"use server";

import { getValidatedSession } from "@/lib/auth/session";
import { getProductTourState, setProductTourState, setProductTourStep } from "@/lib/db/repositories/product_tour";
import { PRODUCT_TOUR_VERSION, type ProductTourState } from "@/lib/onboarding/tour-state";

// The user is always resolved from the signed session here. No action in this
// file accepts a user id, so a crafted request can only ever move the caller's
// own tour - the same rule the rest of the server actions follow.
async function currentUserId(): Promise<string | null> {
  const session = await getValidatedSession();
  return session?.uid ?? null;
}

export async function readProductTourStateAction(): Promise<ProductTourState | null> {
  const userId = await currentUserId();
  if (!userId) return null;
  return getProductTourState(userId);
}

export async function startProductTourAction(step: string): Promise<void> {
  const userId = await currentUserId();
  if (!userId) return;
  await setProductTourState(userId, { status: "in_progress", version: PRODUCT_TOUR_VERSION, step });
}

// Fire-and-forget from the provider as the student advances: a reload mid-tour
// resumes here instead of restarting. Deliberately a no-op unless the tour is
// actually running, so a late call cannot resurrect a finished run.
export async function advanceProductTourAction(step: string): Promise<void> {
  const userId = await currentUserId();
  if (!userId) return;
  await setProductTourStep(userId, step);
}

export async function completeProductTourAction(): Promise<void> {
  const userId = await currentUserId();
  if (!userId) return;
  await setProductTourState(userId, { status: "completed", version: PRODUCT_TOUR_VERSION, step: null });
}

export async function skipProductTourAction(): Promise<void> {
  const userId = await currentUserId();
  if (!userId) return;
  await setProductTourState(userId, { status: "skipped", version: PRODUCT_TOUR_VERSION, step: null });
}

// Used by "repeat the tour" in the profile, and by the Product Lab (#195).
// Resetting only ever clears the caller's own state; it never deletes content.
export async function resetProductTourAction(): Promise<void> {
  const userId = await currentUserId();
  if (!userId) return;
  await setProductTourState(userId, { status: "not_started", version: 0, step: null });
}
