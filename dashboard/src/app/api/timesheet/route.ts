import { NextRequest, NextResponse } from "next/server";
import { createTimesheet } from "@/lib/erpnext";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { customer, hours, description, date } = body;
    if (!customer || !hours || !date) {
      return NextResponse.json({ error: "customer, hours, and date are required" }, { status: 400 });
    }
    const result = await createTimesheet({ customer, hours: Number(hours), description: description || "", date });
    if (result.error) return NextResponse.json({ error: result.error }, { status: 500 });
    return NextResponse.json({ name: result.name });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
