import { NextResponse } from "next/server";
import { getAllTechOpportunities } from "@/lib/db/repositories/tech_opportunities";

export async function GET() {
  const data = await getAllTechOpportunities();
  return NextResponse.json(data);
}
