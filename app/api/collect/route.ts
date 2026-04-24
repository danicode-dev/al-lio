import { NextResponse } from "next/server";
import { collect as adzuna } from "@/lib/integrations/adzuna";
import { collect as infojobs } from "@/lib/integrations/infojobs";
import { collect as jooble } from "@/lib/integrations/jooble";
import { collect as remotive } from "@/lib/integrations/remotive";
import { collect as tecnoempleo } from "@/lib/integrations/tecnoempleo-rss";

export async function GET() {
  const results = await Promise.all([infojobs(), adzuna(), jooble(), remotive(), tecnoempleo()]);
  return NextResponse.json({ opportunities: results.flat() });
}
