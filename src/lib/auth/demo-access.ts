import "server-only";

export function isDemoAccessEnabled(): boolean {
  return process.env.AL_LIO_DEMO_ACCESS_ENABLED?.trim().toLowerCase() !== "false";
}
