import { NextRequest, NextResponse } from "next/server";
import { createPaymentEntry } from "@/lib/erpnext";

type Params = { params: Promise<{ id: string }> };

export async function POST(req: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    const { amount, mode, customer, referenceDate } = await req.json();
    if (!amount || !customer) {
      return NextResponse.json({ error: "amount and customer are required" }, { status: 400 });
    }
    const { name, error } = await createPaymentEntry({
      invoiceName: id,
      amount: Number(amount),
      paymentType: "Receive",
      partyType: "Customer",
      party: customer,
      mode,
      referenceDate,
    });
    if (error) return NextResponse.json({ error }, { status: 502 });
    return NextResponse.json({ name });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
