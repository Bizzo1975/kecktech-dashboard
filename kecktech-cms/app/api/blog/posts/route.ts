import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

/** Public published posts for the marketing site blog. */
export async function GET() {
  try {
    const posts = await prisma.post.findMany({
      where: { published: true, status: "published" },
      orderBy: { publishedAt: "desc" },
      select: {
        id: true,
        title: true,
        slug: true,
        excerpt: true,
        publishedAt: true,
      },
    });
    return NextResponse.json({
      posts: posts.map((p) => ({
        id: p.id,
        title: p.title,
        slug: p.slug,
        excerpt: p.excerpt,
        published_at: p.publishedAt,
      })),
    });
  } catch (error) {
    console.error("public blog list failed:", error);
    return NextResponse.json({ error: "Failed to list posts" }, { status: 500 });
  }
}
