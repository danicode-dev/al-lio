import type { FieldListboxOption } from "@/components/ui/field-listbox";

/**
 * Framework-free state for the account surfaces (issue #372): the profile
 * form's error copy, identity derivation, cycle/year options, the
 * submit-enabled rule and the explicit save state. Self-contained (only
 * `import type`), so tests/unit/account/account-model.test.mjs runs it
 * directly. The Saved hub stays a projection of the live feature store and its
 * verbatim contract is pinned by tests/integration/profile/saved-hub.test.mjs.
 */

const PROFILE_ERROR_COPY: Record<string, string> = {
  onboarding_invalid: "Revisa los datos e inténtalo de nuevo.",
  onboarding_save_failed: "No se pudo guardar tu perfil. Inténtalo de nuevo.",
};

const PROFILE_ERROR_FALLBACK = "No se pudo guardar. Inténtalo de nuevo.";

export function resolveProfileErrorCopy(errorKey: string | null | undefined): string {
  if (!errorKey) return PROFILE_ERROR_FALLBACK;
  return PROFILE_ERROR_COPY[errorKey] ?? PROFILE_ERROR_FALLBACK;
}

/** The name shown in the identity card: the account display name, else the email local-part, else a generic label. */
export function resolveAccountDisplayName(account: { email: string; displayName: string | null }): string {
  return account.displayName?.trim() || account.email.split("@")[0] || "Estudiante";
}

/** Up to two uppercase initials from a display name. */
export function deriveInitials(displayName: string): string {
  return displayName
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("");
}

export const ACADEMIC_YEAR_OPTIONS: FieldListboxOption[] = [
  { value: "1", label: "1º curso" },
  { value: "2", label: "2º curso" },
];

export function buildCycleOptions(cycles: readonly { code: string; name: string }[]): FieldListboxOption[] {
  return cycles.map((cycle) => ({ value: cycle.code, label: cycle.name }));
}

/** The Guardar button is live only with both fields chosen and no save in flight. */
export function canSubmitProfileChanges(input: { cycleCode: string; academicYear: string; isPending: boolean }): boolean {
  return !input.isPending && input.cycleCode.length > 0 && input.academicYear.length > 0;
}

export type ProfileSaveState = "idle" | "pending" | "saved" | "error";

/** The single visible state of the profile save: the pending spinner, the "Guardado" badge, the error box, or nothing. */
export function describeProfileSaveState(
  state: { error: string | null; savedAt: number | null },
  isPending: boolean,
): ProfileSaveState {
  if (isPending) return "pending";
  if (state.error) return "error";
  if (state.savedAt) return "saved";
  return "idle";
}
