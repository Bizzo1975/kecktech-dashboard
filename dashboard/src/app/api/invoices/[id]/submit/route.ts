import { NextRequest, NextResponse } from "next/server";
import { submitDoc } from "@/lib/erpnext";

type Params = { params: Promise<{ id: string }> };

export async function POST(_req: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    const { error } = await submitDoc("Sales Invoice", id);
    if (error) return NextResponse.json({ error }, { status: 502 });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
