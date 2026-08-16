import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

/** Public active slideshow slides (optional Astro consumer). */
export async function GET() {
  try {
    const slides = await prisma.slideshowSlide.findMany({
      where: { active: true },
      orderBy: [{ order: "asc" }, { createdAt: "asc" }],
    });
    return NextResponse.json({ slides });
  } catch (error) {
    console.error("public slideshow failed:", error);
    return NextResponse.json({ error: "Failed to list slides" }, { status: 500 });
  }
}
