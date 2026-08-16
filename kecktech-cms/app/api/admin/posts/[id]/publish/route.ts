import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export async function POST(
  _request: NextRequest,
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
    const post = await prisma.post.update({
      where: { id },
      data: {
        published: true,
        status: "published",
        publishedAt: new Date(),
      },
    });

    try {
      revalidatePath("/blog");
      revalidatePath(`/blog/${post.slug}`);
    } catch {
      // non-fatal in admin context
    }

    return NextResponse.json({
      ok: true,
      post,
      message: "Post published successfully",
    });
  } catch (error) {
    console.error("Error publishing post:", error);
    return NextResponse.json(
      { error: "Failed to publish post" },
      { status: 500 }
    );
  }
}
