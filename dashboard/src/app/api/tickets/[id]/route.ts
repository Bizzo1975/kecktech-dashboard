import { NextRequest, NextResponse } from "next/server";
import { getTicketDetail, updateTicket } from "@/lib/zammad";

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  const { id } = await params;
  const { ticket, error } = await getTicketDetail(Number(id));
  if (error && !ticket) return NextResponse.json({ error }, { status: 502 });
  return NextResponse.json({ ticket });
}

export async function PATCH(req: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    const patch = await req.json();
    const { error } = await updateTicket(Number(id), patch);
    if (error) return NextResponse.json({ error }, { status: 502 });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
