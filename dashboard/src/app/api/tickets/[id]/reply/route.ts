import { NextRequest, NextResponse } from "next/server";
import { replyToTicket } from "@/lib/zammad";

type Params = { params: Promise<{ id: string }> };

export async function POST(req: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    const { body, internal } = await req.json();
    if (!body?.trim()) {
      return NextResponse.json({ error: "body is required" }, { status: 400 });
    }
    const { id: articleId, error } = await replyToTicket(Number(id), body, Boolean(internal));
    if (error) return NextResponse.json({ error }, { status: 502 });
    return NextResponse.json({ id: articleId });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
