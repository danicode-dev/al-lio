import "server-only";

export function isDemoAccessEnabled(): boolean {
  const configured = process.env.AL_LIO_DEMO_ACCESS_ENABLED?.trim().toLowerCase();
  if (!configured) return process.env.NODE_ENV !== "production";
  return configured === "true";
}
