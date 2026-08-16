import { NextRequest, NextResponse } from "next/server";
import { addLeadNote } from "@/lib/erpnext";

type Params = { params: Promise<{ id: string }> };

export async function POST(req: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    const { note } = await req.json();
    if (!note?.trim()) return NextResponse.json({ error: "note is required" }, { status: 400 });
    const { error } = await addLeadNote(id, note);
    if (error) return NextResponse.json({ error }, { status: 502 });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
