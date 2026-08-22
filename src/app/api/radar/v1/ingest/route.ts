import { NextResponse } from "next/server";
import { ingestRadarDelivery, RadarDeliveryConflictError } from "@/lib/db/repositories/radar";
import { RADAR_MAX_BODY_BYTES, radarDeliverySchema } from "@/lib/radar/contract";
import { verifyRadarWebhook } from "@/lib/radar/webhook-auth";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: Request) {
  if (!(request.headers.get("content-type") ?? "").toLowerCase().startsWith("application/json")) {
    return jsonError("content type must be application/json", 415);
  }
  const declaredLength = Number(request.headers.get("content-length") ?? 0);
  if (Number.isFinite(declaredLength) && declaredLength > RADAR_MAX_BODY_BYTES) {
    return jsonError("request body too large", 413);
  }

  const rawBody = await request.text();
  if (Buffer.byteLength(rawBody, "utf8") > RADAR_MAX_BODY_BYTES) {
    return jsonError("request body too large", 413);
  }

  let auth;
  try {
    auth = verifyRadarWebhook(request, rawBody);
  } catch {
    console.error("Radar webhook secret is not configured securely");
    return jsonError("webhook unavailable", 503);
  }
  if (!auth.ok) return jsonError(auth.error, auth.status);

  let unknownPayload: unknown;
  try {
    unknownPayload = JSON.parse(rawBody);
  } catch {
    return jsonError("invalid json", 400);
  }
  if (!isVersionedPayload(unknownPayload) || unknownPayload.schemaVersion !== auth.schemaVersion) {
    return jsonError("schema version mismatch", 400);
  }
  const parsed = radarDeliverySchema.safeParse(unknownPayload);
  if (!parsed.success) return jsonError("invalid radar payload", 400);
  if (parsed.data.deliveryId !== auth.deliveryId) return jsonError("delivery id mismatch", 400);

  try {
    const result = await ingestRadarDelivery(parsed.data, rawBody);
    return NextResponse.json(
      { ok: true, duplicate: result.duplicate, deliveryId: parsed.data.deliveryId, itemCount: result.itemCount },
      { status: result.duplicate ? 200 : 201, headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    if (error instanceof RadarDeliveryConflictError) return jsonError(error.message, 409);
    console.error("Radar delivery ingestion failed", { deliveryId: parsed.data.deliveryId });
    return jsonError("radar ingestion failed", 500);
  }
}

function jsonError(error: string, status: number) {
  return NextResponse.json({ ok: false, error }, { status, headers: { "Cache-Control": "no-store" } });
}

function isVersionedPayload(value: unknown): value is { schemaVersion: number } {
  return typeof value === "object" && value !== null && typeof (value as { schemaVersion?: unknown }).schemaVersion === "number";
}
