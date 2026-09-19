import { NextRequest, NextResponse } from "next/server";
import { SERVICES } from "@/lib/services";
import { readOverrides, writeOverrides, TileOverrides } from "@/lib/tileOverrides";

export const dynamic = "force-dynamic";

export async function GET() {
  const overrides = readOverrides();
  const base = SERVICES.map((s) => ({
    name: s.name,
    description: s.description,
    icon: s.icon,
    hidden: false,
  }));
  return NextResponse.json({ base, overrides });
}

export async function POST(req: NextRequest) {
  const body = (await req.json()) as { overrides: TileOverrides };
  if (!body || typeof body.overrides !== "object") {
    return NextResponse.json({ error: "invalid body" }, { status: 400 });
  }
  writeOverrides(body.overrides);
  return NextResponse.json({ ok: true });
}
