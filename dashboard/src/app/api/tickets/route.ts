import { NextRequest, NextResponse } from "next/server";
import { getOpenTickets, createTicket } from "@/lib/zammad";

export async function GET() {
  const { tickets, error } = await getOpenTickets();
  if (error) return NextResponse.json({ error }, { status: 502 });
  return NextResponse.json({ tickets });
}

export async function POST(req: NextRequest) {
  try {
    const { title, body, groupName, customerEmail, priority } = await req.json();
    if (!title || !body || !groupName || !customerEmail) {
      return NextResponse.json(
        { error: "title, body, groupName, and customerEmail are required" },
        { status: 400 }
      );
    }
    const { id, error } = await createTicket({ title, body, groupName, customerEmail, priority });
    if (error) return NextResponse.json({ error }, { status: 502 });
    return NextResponse.json({ id });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
