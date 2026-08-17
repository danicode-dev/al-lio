const POSTGRES_BIGINT_MAX = "9223372036854775807";

export function isValidRadarItemId(value: string) {
  if (!/^\d{1,19}$/.test(value)) return false;
  const normalized = value.replace(/^0+(?=\d)/, "");
  return normalized.length < POSTGRES_BIGINT_MAX.length || normalized <= POSTGRES_BIGINT_MAX;
}
