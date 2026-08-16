import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

/** Public published page JSON for Astro marketing. */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    const page = await prisma.page.findFirst({
      where: { slug, published: true },
      select: {
        id: true,
        title: true,
        slug: true,
        content: true,
        metaTitle: true,
        metaDescription: true,
        updatedAt: true,
      },
    });
    if (!page) {
      return NextResponse.json({ error: "Page not found" }, { status: 404 });
    }

    let json: unknown = null;
    try {
      json = JSON.parse(page.content);
    } catch {
      json = null;
    }

    return NextResponse.json({
      page: {
        id: page.id,
        title: page.title,
        slug: page.slug,
        content: page.content,
        json,
        meta_title: page.metaTitle,
        meta_description: page.metaDescription,
        updated_at: page.updatedAt,
      },
    });
  } catch (error) {
    console.error("public page fetch failed:", error);
    return NextResponse.json({ error: "Failed to fetch page" }, { status: 500 });
  }
}
