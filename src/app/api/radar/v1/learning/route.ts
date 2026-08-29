import { NextResponse } from "next/server";
import {
  ingestRadarLearningDelivery,
  RadarLearningDeliveryConflictError,
} from "@/lib/db/repositories/preparation-resources";
import { RADAR_MAX_BODY_BYTES } from "@/lib/radar/contract";
import {
  RADAR_LEARNING_SCHEMA_VERSION,
  radarLearningDeliverySchema,
} from "@/lib/radar/learning-contract";
import { verifyRadarWebhook } from "@/lib/radar/webhook-auth";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: Request) {
  if (process.env.AL_LIO_RADAR_LEARNING_INGEST_ENABLED?.trim().toLowerCase() !== "true") {
    return jsonError("learning ingest is disabled", 503);
  }
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
    auth = verifyRadarWebhook(request, rawBody, new Date(), [RADAR_LEARNING_SCHEMA_VERSION]);
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
  const parsed = radarLearningDeliverySchema.safeParse(unknownPayload);
  if (!parsed.success) return jsonError("invalid learning payload", 400);
  if (parsed.data.schemaVersion !== auth.schemaVersion) return jsonError("schema version mismatch", 400);
  if (parsed.data.deliveryId !== auth.deliveryId) return jsonError("delivery id mismatch", 400);

  try {
    const result = await ingestRadarLearningDelivery(parsed.data, rawBody);
    return NextResponse.json(
      { ok: true, deliveryId: parsed.data.deliveryId, ...result },
      { status: result.duplicate ? 200 : 201, headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    if (error instanceof RadarLearningDeliveryConflictError) {
      return jsonError(error.message, 409);
    }
    console.error("Radar learning delivery ingestion failed", { deliveryId: parsed.data.deliveryId });
    return jsonError("learning ingestion failed", 500);
  }
}

function jsonError(error: string, status: number) {
  return NextResponse.json({ ok: false, error }, { status, headers: { "Cache-Control": "no-store" } });
}
