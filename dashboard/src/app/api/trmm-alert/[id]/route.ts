import { NextRequest, NextResponse } from "next/server";
import { acknowledgeAlert } from "@/lib/trmm";

export async function PATCH(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const result = await acknowledgeAlert(Number(id));
    if (result.error) return NextResponse.json({ error: result.error }, { status: 500 });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
