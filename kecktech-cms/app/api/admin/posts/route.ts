import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { normalizeStringArray } from "@/lib/cms";
import { z } from "zod";

const postSchema = z.object({
  title: z.string().min(1, "Title is required"),
  slug: z.string().min(1, "Slug is required"),
  excerpt: z.string().optional().nullable(),
  content: z.string().min(1, "Content is required"),
  tags: z.union([z.string(), z.array(z.string())]).optional(),
  author: z.string().optional(),
  status: z.enum(["draft", "scheduled", "published"]).default("draft"),
  featuredImage: z.string().optional().nullable(),
  scheduledPublishAt: z.string().optional().nullable(),
  publishedAt: z.string().optional().nullable(),
});

function resolvePublishFlags(
  status: "draft" | "scheduled" | "published",
  scheduledPublishAt?: string | null,
  publishedAt?: string | null
) {
  if (status === "published") {
    return {
      published: true,
      publishedAt: publishedAt ? new Date(publishedAt) : new Date(),
      scheduledPublishAt: scheduledPublishAt
        ? new Date(scheduledPublishAt)
        : null,
    };
  }
  if (status === "scheduled") {
    return {
      published: false,
      publishedAt: null,
      scheduledPublishAt: scheduledPublishAt
        ? new Date(scheduledPublishAt)
        : null,
    };
  }
  return {
    published: false,
    publishedAt: null,
    scheduledPublishAt: null,
  };
}

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const posts = await prisma.post.findMany({
      orderBy: { updatedAt: "desc" },
    });

    return NextResponse.json(posts);
  } catch (error) {
    console.error("Error fetching posts:", error);
    return NextResponse.json(
      { error: "Failed to fetch posts" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (
      !session ||
      (session.user.role !== "admin" && session.user.role !== "editor")
    ) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const data = postSchema.parse(body);

    const existing = await prisma.post.findUnique({
      where: { slug: data.slug },
    });
    if (existing) {
      return NextResponse.json(
        { error: "A post with this slug already exists" },
        { status: 400 }
      );
    }

    if (data.status === "scheduled" && !data.scheduledPublishAt) {
      return NextResponse.json(
        { error: "scheduledPublishAt is required when status is scheduled" },
        { status: 400 }
      );
    }

    const flags = resolvePublishFlags(
      data.status,
      data.scheduledPublishAt,
      data.publishedAt
    );

    const post = await prisma.post.create({
      data: {
        title: data.title,
        slug: data.slug,
        excerpt: data.excerpt || null,
        content: data.content,
        tags: normalizeStringArray(data.tags),
        author: data.author || "Kecktech",
        status: data.status,
        featuredImage: data.featuredImage || null,
        ...flags,
      },
    });

    return NextResponse.json(post, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation error", details: error.issues },
        { status: 400 }
      );
    }
    console.error("Error creating post:", error);
    return NextResponse.json(
      { error: "Failed to create post" },
      { status: 500 }
    );
  }
}
