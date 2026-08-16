import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { normalizeStringArray } from "@/lib/cms";
import { z } from "zod";

const postSchema = z.object({
  title: z.string().min(1).optional(),
  slug: z.string().min(1).optional(),
  excerpt: z.string().optional().nullable(),
  content: z.string().optional(),
  tags: z.union([z.string(), z.array(z.string())]).optional(),
  author: z.string().optional(),
  status: z.enum(["draft", "scheduled", "published"]).optional(),
  featuredImage: z.string().optional().nullable(),
  scheduledPublishAt: z.string().optional().nullable(),
  publishedAt: z.string().optional().nullable(),
});

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const post = await prisma.post.findUnique({ where: { id } });
    if (!post) {
      return NextResponse.json({ error: "Post not found" }, { status: 404 });
    }
    return NextResponse.json(post);
  } catch (error) {
    console.error("Error fetching post:", error);
    return NextResponse.json(
      { error: "Failed to fetch post" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (
      !session ||
      (session.user.role !== "admin" && session.user.role !== "editor")
    ) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const data = postSchema.parse(body);

    if (data.slug) {
      const existing = await prisma.post.findFirst({
        where: { slug: data.slug, id: { not: id } },
      });
      if (existing) {
        return NextResponse.json(
          { error: "A post with this slug already exists" },
          { status: 400 }
        );
      }
    }

    const current = await prisma.post.findUnique({ where: { id } });
    if (!current) {
      return NextResponse.json({ error: "Post not found" }, { status: 404 });
    }

    const status = data.status ?? (current.status as "draft" | "scheduled" | "published");
    if (status === "scheduled") {
      const scheduleAt =
        data.scheduledPublishAt !== undefined
          ? data.scheduledPublishAt
          : current.scheduledPublishAt?.toISOString() ?? null;
      if (!scheduleAt) {
        return NextResponse.json(
          { error: "scheduledPublishAt is required when status is scheduled" },
          { status: 400 }
        );
      }
    }

    const updateData: Record<string, unknown> = {};
    if (data.title !== undefined) updateData.title = data.title;
    if (data.slug !== undefined) updateData.slug = data.slug;
    if (data.excerpt !== undefined) updateData.excerpt = data.excerpt;
    if (data.content !== undefined) updateData.content = data.content;
    if (data.tags !== undefined) updateData.tags = normalizeStringArray(data.tags);
    if (data.author !== undefined) updateData.author = data.author;
    if (data.featuredImage !== undefined) {
      updateData.featuredImage = data.featuredImage;
    }
    if (data.status !== undefined) updateData.status = data.status;

    if (data.status !== undefined || data.scheduledPublishAt !== undefined) {
      if (status === "published") {
        updateData.published = true;
        updateData.publishedAt =
          data.publishedAt !== undefined && data.publishedAt
            ? new Date(data.publishedAt)
            : current.publishedAt || new Date();
        if (data.scheduledPublishAt !== undefined) {
          updateData.scheduledPublishAt = data.scheduledPublishAt
            ? new Date(data.scheduledPublishAt)
            : null;
        }
      } else if (status === "scheduled") {
        updateData.published = false;
        updateData.publishedAt = null;
        const scheduleAt =
          data.scheduledPublishAt !== undefined
            ? data.scheduledPublishAt
            : current.scheduledPublishAt?.toISOString() ?? null;
        updateData.scheduledPublishAt = scheduleAt
          ? new Date(scheduleAt)
          : null;
      } else {
        updateData.published = false;
        updateData.publishedAt = null;
        updateData.scheduledPublishAt = null;
      }
    } else if (data.publishedAt !== undefined) {
      updateData.publishedAt = data.publishedAt
        ? new Date(data.publishedAt)
        : null;
    }

    const post = await prisma.post.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json(post);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation error", details: error.issues },
        { status: 400 }
      );
    }
    console.error("Error updating post:", error);
    return NextResponse.json(
      { error: "Failed to update post" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    await prisma.post.delete({ where: { id } });
    return NextResponse.json({ message: "Post deleted successfully" });
  } catch (error) {
    console.error("Error deleting post:", error);
    return NextResponse.json(
      { error: "Failed to delete post" },
      { status: 500 }
    );
  }
}
