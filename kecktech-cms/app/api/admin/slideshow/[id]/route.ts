import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const slideSchema = z.object({
  title: z.string().optional().nullable(),
  imageUrl: z.string().min(1).optional(),
  altText: z.string().optional().nullable(),
  linkUrl: z.string().optional().nullable(),
  order: z.number().int().optional(),
  active: z.boolean().optional(),
});

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (
    !session ||
    (session.user.role !== "admin" && session.user.role !== "editor")
  ) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await params;
  try {
    const data = slideSchema.parse(await request.json());
    const slide = await prisma.slideshowSlide.update({ where: { id }, data });
    return NextResponse.json(slide);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation error", details: error.issues },
        { status: 400 }
      );
    }
    console.error("update slide failed:", error);
    return NextResponse.json({ error: "Failed to update slide" }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await params;
  await prisma.slideshowSlide.delete({ where: { id } });
  return NextResponse.json({ message: "Slide deleted" });
}
