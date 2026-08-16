import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

function authorize(request: NextRequest): boolean {
  const key = process.env.ME_MANAGER_API_KEY;
  if (!key) return false;
  const header = request.headers.get("authorization") || "";
  return header === `Bearer ${key}`;
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!authorize(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const body = await request.json();
  const scheduledDate = body.scheduledDate as string;

  if (!scheduledDate) {
    return NextResponse.json(
      { error: "scheduledDate required" },
      { status: 400 }
    );
  }

  const scheduleTime = new Date(scheduledDate);
  if (scheduleTime <= new Date()) {
    return NextResponse.json(
      { error: "Scheduled date must be in the future" },
      { status: 400 }
    );
  }

  try {
    const existing = await prisma.post.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Post not found" }, { status: 404 });
    }

    const post = await prisma.post.update({
      where: { id },
      data: {
        status: "scheduled",
        scheduledPublishAt: scheduleTime,
      },
    });

    return NextResponse.json({
      ok: true,
      post: {
        id: post.id,
        title: post.title,
        slug: post.slug,
        status: post.status,
        scheduled_publish_at: post.scheduledPublishAt,
      },
      message: `Scheduled "${post.title}" for ${scheduleTime.toISOString()}`,
    });
  } catch (error) {
    console.error("me-manager schedule failed:", error);
    return NextResponse.json(
      { error: "Failed to schedule post" },
      { status: 500 }
    );
  }
}
