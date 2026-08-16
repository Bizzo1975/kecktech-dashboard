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

export async function GET(request: NextRequest) {
  if (!authorize(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const posts = await prisma.post.findMany({
      orderBy: { updatedAt: "desc" },
      take: 100,
    });
    return NextResponse.json({
      posts: posts.map(serializePost),
      source: "kecktech",
    });
  } catch (error) {
    console.error("me-manager posts list failed:", error);
    return NextResponse.json(
      { error: "Failed to list posts" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  if (!authorize(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const title = body.title as string;
    const slug =
      (body.slug as string) ||
      title?.toLowerCase().replace(/[^a-z0-9]+/g, "-");
    const content = (body.content as string) || "";
    const excerpt = (body.excerpt as string) || "";
    const tags = (body.tags as string[]) || ["me-manager"];
    const status = (body.status as string) || "draft";
    const published = Boolean(body.published);

    if (!title || !slug) {
      return NextResponse.json(
        { error: "title and slug required" },
        { status: 400 }
      );
    }

    const post = await prisma.post.create({
      data: {
        title,
        slug,
        content,
        excerpt,
        tags: JSON.stringify(tags),
        author: (body.author as string) || "Author",
        status,
        published,
        featuredImage: (body.featured_image as string) || null,
        publishedAt: published ? new Date() : null,
      },
    });

    return NextResponse.json({
      ok: true,
      post: serializePost(post),
      source: "kecktech",
    });
  } catch (error) {
    console.error("me-manager create post failed:", error);
    return NextResponse.json(
      {
        error: "Failed to create post",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
