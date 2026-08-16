import { NextRequest, NextResponse } from "next/server";
import { getLeadDetail, updateLeadStatus } from "@/lib/erpnext";

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  const { id } = await params;
  const { lead, error } = await getLeadDetail(id);
  if (error && !lead) return NextResponse.json({ error }, { status: 502 });
  return NextResponse.json({ lead });
}

export async function PATCH(req: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    const { status } = await req.json();
    if (!status) return NextResponse.json({ error: "status is required" }, { status: 400 });
    const { error } = await updateLeadStatus(id, status);
    if (error) return NextResponse.json({ error }, { status: 502 });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
