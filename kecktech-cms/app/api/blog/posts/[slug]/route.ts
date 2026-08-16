import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  context: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await context.params;
    const post = await prisma.post.findFirst({
      where: { slug, published: true, status: "published" },
      select: {
        id: true,
        title: true,
        slug: true,
        excerpt: true,
        content: true,
        publishedAt: true,
      },
    });
    if (!post) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    return NextResponse.json({
      post: {
        id: post.id,
        title: post.title,
        slug: post.slug,
        excerpt: post.excerpt,
        content: post.content,
        published_at: post.publishedAt,
      },
    });
  } catch (error) {
    console.error("public blog get failed:", error);
    return NextResponse.json({ error: "Failed to load post" }, { status: 500 });
  }
}
