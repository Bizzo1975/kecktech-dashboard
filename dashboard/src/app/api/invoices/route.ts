import { NextRequest, NextResponse } from "next/server";
import { createInvoice } from "@/lib/erpnext";

export async function POST(req: NextRequest) {
  try {
    const { customer, items, due_date, project } = await req.json();
    if (!customer || !items?.length) {
      return NextResponse.json({ error: "customer and items are required" }, { status: 400 });
    }
    const { name, error } = await createInvoice({ customer, items, due_date, project });
    if (error) return NextResponse.json({ error }, { status: 502 });
    return NextResponse.json({ name });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
