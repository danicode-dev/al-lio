import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { RADAR_TIMESTAMP_TOLERANCE_MS } from "@/lib/radar/contract";

export type RadarWebhookAuthResult =
  | { ok: true; deliveryId: string; timestamp: string }
  | { ok: false; status: 400 | 401; error: string };

export function verifyRadarWebhook(request: Request, rawBody: string, now = new Date()): RadarWebhookAuthResult {
  const secret = process.env.AL_LIO_RADAR_WEBHOOK_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error("AL_LIO_RADAR_WEBHOOK_SECRET is not configured securely");
  }

  const deliveryId = request.headers.get("x-al-lio-delivery-id") ?? "";
  const timestamp = request.headers.get("x-al-lio-timestamp") ?? "";
  const signature = request.headers.get("x-al-lio-signature") ?? "";
  const schemaVersion = request.headers.get("x-al-lio-schema-version") ?? "";

  if (schemaVersion !== "2") return { ok: false, status: 400, error: "unsupported schema version" };
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(deliveryId)) {
    return { ok: false, status: 400, error: "invalid delivery id" };
  }

  const timestampMs = Date.parse(timestamp);
  if (!Number.isFinite(timestampMs) || Math.abs(now.getTime() - timestampMs) > RADAR_TIMESTAMP_TOLERANCE_MS) {
    return { ok: false, status: 401, error: "timestamp outside allowed window" };
  }

  const expected = `v1=${createHmac("sha256", secret)
    .update(`${timestamp}.${deliveryId}.${rawBody}`)
    .digest("hex")}`;
  const expectedBuffer = Buffer.from(expected);
  const actualBuffer = Buffer.from(signature);
  if (expectedBuffer.length !== actualBuffer.length || !timingSafeEqual(expectedBuffer, actualBuffer)) {
    return { ok: false, status: 401, error: "invalid signature" };
  }

  return { ok: true, deliveryId, timestamp };
}
