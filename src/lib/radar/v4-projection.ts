import type { RadarV4Destination } from "./contract";

export type RadarV4ObservationState =
  | "verified"
  | "not_stated"
  | "extraction_failed"
  | "source_unavailable"
  | "verified_removed";

export type FactResolution = {
  value: unknown;
  authorityRank: number | null;
  applyIncoming: boolean;
  conflict: boolean;
  resolution: "unchanged" | "accepted" | "accepted_higher_authority" | "kept_last_known_good";
};

/**
 * Last-known-good merge policy shared by the projector and contract tests.
 * Missing extraction states never erase verified data. Equal or weaker
 * conflicting authority is quarantined instead of becoming a last-write win.
 */
export function resolveRadarV4Fact(input: {
  currentValue: unknown;
  currentAuthorityRank: number | null;
  incomingValue: unknown;
  incomingAuthorityRank: number | null;
  observationState: RadarV4ObservationState | undefined;
}): FactResolution {
  const { currentValue, currentAuthorityRank, incomingValue, incomingAuthorityRank, observationState } = input;
  if (!observationState || ["not_stated", "extraction_failed", "source_unavailable"].includes(observationState)) {
    return {
      value: currentValue,
      authorityRank: currentAuthorityRank,
      applyIncoming: false,
      conflict: false,
      resolution: "unchanged",
    };
  }

  if (incomingAuthorityRank === null) {
    return {
      value: currentValue,
      authorityRank: currentAuthorityRank,
      applyIncoming: false,
      conflict: true,
      resolution: "kept_last_known_good",
    };
  }

  const normalizedIncoming = observationState === "verified_removed" ? null : incomingValue;
  if (currentAuthorityRank === null || valuesMatch(currentValue, normalizedIncoming)) {
    return {
      value: normalizedIncoming,
      authorityRank: Math.max(currentAuthorityRank ?? 0, incomingAuthorityRank),
      applyIncoming: true,
      conflict: false,
      resolution: "accepted",
    };
  }
  if (incomingAuthorityRank > currentAuthorityRank) {
    return {
      value: normalizedIncoming,
      authorityRank: incomingAuthorityRank,
      applyIncoming: true,
      conflict: true,
      resolution: "accepted_higher_authority",
    };
  }
  return {
    value: currentValue,
    authorityRank: currentAuthorityRank,
    applyIncoming: false,
    conflict: true,
    resolution: "kept_last_known_good",
  };
}

export function radarV4ProjectionDestinations(raw = process.env.AL_LIO_RADAR_V4_PROJECT_DESTINATIONS ?? "") {
  const allowed = new Set<RadarV4Destination>(["news", "course", "event", "job"]);
  const destinations = new Set<RadarV4Destination>();
  for (const token of raw.split(",").map((value) => value.trim()).filter(Boolean)) {
    if (!allowed.has(token as RadarV4Destination)) {
      throw new Error(`Unsupported AL_LIO_RADAR_V4_PROJECT_DESTINATIONS value: ${token}`);
    }
    destinations.add(token as RadarV4Destination);
  }
  return destinations;
}

export function legacyLifecycleStatus(
  value: string | null,
): "abierto" | "activo" | "historico_util" | "pendiente_convocatoria" | null {
  if (value === "registration_open") return "abierto";
  if (value === "ongoing" || value === "evergreen") return "activo";
  if (value === "completed") return "historico_util";
  if (value === "announced") return "pendiente_convocatoria";
  return null;
}

export function legacyRanking(priority: number): { priority: "Alta" | "Media" | "Baja"; fitScore: number } {
  if (priority >= 75) return { priority: "Alta", fitScore: 5 };
  if (priority >= 40) return { priority: "Media", fitScore: 4 };
  return { priority: "Baja", fitScore: 3 };
}

function valuesMatch(left: unknown, right: unknown): boolean {
  return JSON.stringify(left) === JSON.stringify(right);
}
