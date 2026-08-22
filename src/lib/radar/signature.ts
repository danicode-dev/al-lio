import { createHmac, timingSafeEqual } from "node:crypto";

export function createRadarSignature(
  secret: string,
  timestamp: string,
  deliveryId: string,
  rawBody: string,
): string {
  return `v1=${createHmac("sha256", secret)
    .update(`${timestamp}.${deliveryId}.${rawBody}`)
    .digest("hex")}`;
}

export function radarSignaturesMatch(expected: string, actual: string): boolean {
  const expectedBuffer = Buffer.from(expected);
  const actualBuffer = Buffer.from(actual);
  return expectedBuffer.length === actualBuffer.length && timingSafeEqual(expectedBuffer, actualBuffer);
}
