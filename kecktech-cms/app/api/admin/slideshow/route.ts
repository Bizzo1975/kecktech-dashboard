import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const slideSchema = z.object({
  title: z.string().optional().nullable(),
  imageUrl: z.string().min(1),
  altText: z.string().optional().nullable(),
  linkUrl: z.string().optional().nullable(),
  order: z.number().int().optional(),
  active: z.boolean().optional(),
});

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const slides = await prisma.slideshowSlide.findMany({
    orderBy: [{ order: "asc" }, { createdAt: "asc" }],
  });
  return NextResponse.json(slides);
}

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (
    !session ||
    (session.user.role !== "admin" && session.user.role !== "editor")
  ) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const data = slideSchema.parse(await request.json());
    const slide = await prisma.slideshowSlide.create({
      data: {
        title: data.title || null,
        imageUrl: data.imageUrl,
        altText: data.altText || null,
        linkUrl: data.linkUrl || null,
        order: data.order ?? 0,
        active: data.active ?? true,
      },
    });
    return NextResponse.json(slide, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation error", details: error.issues },
        { status: 400 }
      );
    }
    console.error("create slide failed:", error);
    return NextResponse.json({ error: "Failed to create slide" }, { status: 500 });
  }
}
