import "server-only";
import { query } from "@/lib/db/pool";
import { normalizeProductTourState, type ProductTourState, type ProductTourStatus } from "@/lib/onboarding/tour-state";

type ProductTourRow = {
  product_tour_status: string | null;
  product_tour_version: number | null;
  product_tour_step: string | null;
};

// Every function here takes the user id its caller resolved from the session
// (never from a request body) and scopes its statement to that row, matching
// how the rest of the repositories work - see getTasksByUser and friends.

export async function getProductTourState(userId: string): Promise<ProductTourState> {
  const res = await query<ProductTourRow>(
    `SELECT product_tour_status, product_tour_version, product_tour_step
       FROM public.profiles
      WHERE user_id = $1
      LIMIT 1`,
    [userId],
  );
  return normalizeProductTourState(res.rows[0]);
}

export async function setProductTourState(
  userId: string,
  state: { status: ProductTourStatus; version: number; step?: string | null },
): Promise<void> {
  await query(
    `UPDATE public.profiles
        SET product_tour_status = $2,
            product_tour_version = $3,
            product_tour_step = $4,
            product_tour_updated_at = now()
      WHERE user_id = $1`,
    [userId, state.status, state.version, state.step ?? null],
  );
}

// The resume point, written as the tour advances. Kept separate from
// setProductTourState so advancing never has to restate status/version and
// can never accidentally revive a tour the student already dismissed.
export async function setProductTourStep(userId: string, step: string): Promise<void> {
  await query(
    `UPDATE public.profiles
        SET product_tour_step = $2,
            product_tour_updated_at = now()
      WHERE user_id = $1
        AND product_tour_status = 'in_progress'`,
    [userId, step],
  );
}
