import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/**
 * Public newsletter stub — Listmonk / Graph wiring comes later.
 * Keeps Traefik PathPrefix(`/api/newsletter`) honest without 404 noise.
 */
export async function GET() {
  return NextResponse.json({
    ok: true,
    status: "stub",
    message:
      "Newsletter API stub. Admin hub at /admin/newsletter; delivery via Listmonk/Graph TBD.",
  });
}

export async function POST() {
  return NextResponse.json(
    {
      ok: false,
      error:
        "Newsletter signup not wired yet. Models exist; connect Listmonk or Graph next.",
    },
    { status: 501 }
  );
}
