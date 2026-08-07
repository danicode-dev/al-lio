import { NextResponse } from "next/server";
import { getCurrentUserId } from "@/lib/auth/current-user";
import { getApplications, insertManualApplication } from "@/lib/job-radar/store";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  try {
    const userId = await getCurrentUserId();
    const applications = await getApplications(userId);
    return NextResponse.json({ applications });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const userId = await getCurrentUserId();
    const body = await req.json();
    const { company_name, company_url, job_title, job_url } = body as Record<string, string>;
    if (!company_name?.trim() || !company_url?.trim() || !job_title?.trim()) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const application = await insertManualApplication(userId, {
      company_name: company_name.trim(),
      company_url: company_url.trim(),
      job_title: job_title.trim(),
      job_url: job_url?.trim() || undefined,
    });
    return NextResponse.json({ application }, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
