import { NextRequest, NextResponse } from "next/server";
import { createLead } from "@/lib/erpnext";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { lead_name, company_name, phone, email_id, notes } = body;
    // Support both `source` and `utm_source` field names from the form
    const source: string | undefined = body.source || body.utm_source;
    if (!lead_name) {
      return NextResponse.json({ error: "lead_name is required" }, { status: 400 });
    }
    const result = await createLead({ lead_name, company_name, phone, email_id, source, notes });
    if (result.error) return NextResponse.json({ error: result.error }, { status: 500 });
    return NextResponse.json({ name: result.name });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
