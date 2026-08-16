import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import fs from "node:fs";
import path from "node:path";

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
    const media = await prisma.mediaFile.findUnique({ where: { id } });
    if (!media) {
      return NextResponse.json({ error: "Media not found" }, { status: 404 });
    }

    const filePath = path.join(
      process.cwd(),
      "public",
      "uploads",
      media.filename
    );
    try {
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    } catch (err) {
      console.error("Failed to delete media file from disk:", err);
    }

    await prisma.mediaFile.delete({ where: { id } });
    return NextResponse.json({ message: "Media deleted successfully" });
  } catch (error) {
    console.error("Error deleting media:", error);
    return NextResponse.json(
      { error: "Failed to delete media" },
      { status: 500 }
    );
  }
}
