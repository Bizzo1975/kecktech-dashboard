import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * Thin ME Manager bridge for Kecktech services catalog.
 * Auth: Authorization: Bearer <ME_MANAGER_API_KEY>
 */
function authorize(request: NextRequest): boolean {
  const key = process.env.ME_MANAGER_API_KEY;
  if (!key) return false;
  const header = request.headers.get("authorization") || "";
  return header === `Bearer ${key}`;
}

export async function GET(request: NextRequest) {
  if (!authorize(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const services = await prisma.service.findMany({
      include: { category: true },
      orderBy: { order: "asc" },
    });
    return NextResponse.json({
      content: services,
      source: "kecktech",
    });
  } catch (error) {
    console.error("me-manager content list failed:", error);
    return NextResponse.json(
      { error: "Failed to list content" },
      { status: 500 }
    );
  }
}
