import { NextRequest, NextResponse } from "next/server";
import { createPurchaseInvoice } from "@/lib/erpnext";

export async function POST(req: NextRequest) {
  try {
    const { supplier, items, due_date } = await req.json();
    if (!supplier || !items?.length) {
      return NextResponse.json({ error: "supplier and items are required" }, { status: 400 });
    }
    const { name, error } = await createPurchaseInvoice({ supplier, items, due_date });
    if (error) return NextResponse.json({ error }, { status: 502 });
    return NextResponse.json({ name });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
