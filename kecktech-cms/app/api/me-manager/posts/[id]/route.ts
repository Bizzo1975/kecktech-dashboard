import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

function authorize(request: NextRequest): boolean {
  const key = process.env.ME_MANAGER_API_KEY;
  if (!key) return false;
  const header = request.headers.get("authorization") || "";
  return header === `Bearer ${key}`;
}

function serializePost(p: {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  content: string;
  tags: string;
  author: string;
  status: string;
  published: boolean;
  featuredImage: string | null;
  scheduledPublishAt: Date | null;
  publishedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}) {
  let tags: string[] = [];
  try {
    tags = JSON.parse(p.tags || "[]");
  } catch {
    tags = [];
  }
  return {
    id: p.id,
    title: p.title,
    slug: p.slug,
    excerpt: p.excerpt,
    content: p.content,
    tags,
    author: p.author,
    status: p.status,
    published: p.published,
    featured_image: p.featuredImage,
    scheduled_publish_at: p.scheduledPublishAt,
    published_at: p.publishedAt,
    created_at: p.createdAt,
    updated_at: p.updatedAt,
  };
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!authorize(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  try {
    const post = await prisma.post.findUnique({ where: { id } });
    if (!post) {
      return NextResponse.json({ error: "Post not found" }, { status: 404 });
    }
    return NextResponse.json({
      ok: true,
      post: serializePost(post),
      source: "kecktech",
    });
  } catch (error) {
    console.error("me-manager get post failed:", error);
    return NextResponse.json(
      { error: "Failed to get post" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!authorize(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const body = await request.json();

  try {
    const existing = await prisma.post.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Post not found" }, { status: 404 });
    }

    const post = await prisma.post.update({
      where: { id },
      data: {
        ...(body.title != null ? { title: body.title } : {}),
        ...(body.slug != null ? { slug: body.slug } : {}),
        ...(body.content != null ? { content: body.content } : {}),
        ...(body.excerpt != null ? { excerpt: body.excerpt } : {}),
        ...(body.status != null ? { status: body.status } : {}),
        ...(typeof body.published === "boolean"
          ? { published: body.published }
          : {}),
        ...(body.tags != null
          ? { tags: JSON.stringify(body.tags as string[]) }
          : {}),
      },
    });

    return NextResponse.json({
      ok: true,
      post: {
        id: post.id,
        title: post.title,
        slug: post.slug,
        status: post.status,
        published: post.published,
        excerpt: post.excerpt,
        updated_at: post.updatedAt,
      },
    });
  } catch (error) {
    console.error("me-manager patch failed:", error);
    return NextResponse.json(
      { error: "Failed to update post" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!authorize(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  try {
    const existing = await prisma.post.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Post not found" }, { status: 404 });
    }
    await prisma.post.delete({ where: { id } });
    return NextResponse.json({
      ok: true,
      deleted: { id: existing.id, title: existing.title, slug: existing.slug },
    });
  } catch (error) {
    console.error("me-manager delete failed:", error);
    return NextResponse.json(
      { error: "Failed to delete post" },
      { status: 500 }
    );
  }
}
