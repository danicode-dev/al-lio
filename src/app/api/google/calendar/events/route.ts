import { NextResponse } from "next/server";
import { z } from "zod";
import { getValidatedSession } from "@/lib/auth/session";
import { getGoogleCalendarClient } from "@/lib/google/calendar";

export const dynamic = "force-dynamic";

const eventSchema = z.object({
  title: z.string().trim().min(1).max(160),
  start: z.string().datetime(),
  end: z.string().datetime(),
  notes: z.string().trim().max(1000).optional(),
});

function unauthorized() {
  return NextResponse.json({ connected: false, events: [] }, { status: 401 });
}

function friendlyGoogleError(error: unknown): string {
  const message = (error as Error)?.message ?? String(error);
  if (message.includes("has not been used in project") || message.includes("is disabled")) {
    return "La API de Google Calendar no está habilitada en tu proyecto de Google Cloud. Entra en console.cloud.google.com, busca \"Google Calendar API\" y actívala. Tarda unos minutos en propagarse.";
  }
  if (message.includes("invalid_grant") || message.includes("Token has been expired")) {
    return "La conexión con Google ha caducado. Desconecta y vuelve a conectar Google Calendar.";
  }
  // Never surface the raw provider message - it can carry request URLs or
  // internal detail (issue #280).
  return "No se pudo completar la operación con Google Calendar. Inténtalo de nuevo.";
}

export async function GET(req: Request) {
  const session = await getValidatedSession();
  if (!session) return unauthorized();

  const calendar = await getGoogleCalendarClient(session.uid);
  if (!calendar) return NextResponse.json({ connected: false, events: [] });

  const url = new URL(req.url);
  const timeMin = url.searchParams.get("timeMin") ?? new Date().toISOString();
  const timeMax =
    url.searchParams.get("timeMax") ??
    new Date(Date.now() + 1000 * 60 * 60 * 24 * 35).toISOString();

  try {
    const response = await calendar.events.list({
      calendarId: "primary",
      timeMin,
      timeMax,
      singleEvents: true,
      orderBy: "startTime",
      maxResults: 80,
    });

    return NextResponse.json({
      connected: true,
      events: (response.data.items ?? []).map((event) => ({
        id: event.id,
        title: event.summary ?? "Sin titulo",
        description: event.description ?? "",
        start: event.start?.dateTime ?? event.start?.date ?? "",
        end: event.end?.dateTime ?? event.end?.date ?? "",
        htmlLink: event.htmlLink ?? "",
        status: event.status ?? "",
      })),
    });
  } catch (error) {
    return NextResponse.json({ connected: true, events: [], error: friendlyGoogleError(error) }, { status: 502 });
  }
}

export async function POST(req: Request) {
  const session = await getValidatedSession();
  if (!session) return unauthorized();

  const calendar = await getGoogleCalendarClient(session.uid);
  if (!calendar) return unauthorized();

  const parsed = eventSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Datos de evento invalidos" }, { status: 400 });
  }

  const { title, start, end, notes } = parsed.data;
  try {
    const response = await calendar.events.insert({
      calendarId: "primary",
      requestBody: {
        summary: title,
        description: notes,
        start: { dateTime: start, timeZone: "Europe/Madrid" },
        end: { dateTime: end, timeZone: "Europe/Madrid" },
      },
    });

    return NextResponse.json({
      event: {
        id: response.data.id,
        title: response.data.summary,
        description: response.data.description,
        start: response.data.start?.dateTime ?? response.data.start?.date,
        end: response.data.end?.dateTime ?? response.data.end?.date,
        htmlLink: response.data.htmlLink,
      },
    });
  } catch (error) {
    return NextResponse.json({ error: friendlyGoogleError(error) }, { status: 502 });
  }
}

export async function DELETE(req: Request) {
  const session = await getValidatedSession();
  if (!session) return unauthorized();

  const calendar = await getGoogleCalendarClient(session.uid);
  if (!calendar) return unauthorized();

  const url = new URL(req.url);
  const id = url.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Falta id" }, { status: 400 });

  try {
    await calendar.events.delete({ calendarId: "primary", eventId: id });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ error: friendlyGoogleError(error) }, { status: 502 });
  }
}
