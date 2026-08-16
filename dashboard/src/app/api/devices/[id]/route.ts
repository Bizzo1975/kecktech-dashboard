import { NextRequest, NextResponse } from "next/server";
import { getAgentDetail } from "@/lib/trmm";

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  const { id } = await params;
  const { agent, error } = await getAgentDetail(Number(id));
  if (error && !agent) return NextResponse.json({ error }, { status: 502 });
  return NextResponse.json({ agent });
}
