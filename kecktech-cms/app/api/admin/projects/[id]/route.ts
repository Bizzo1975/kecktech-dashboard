import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { normalizeStringArray } from "@/lib/cms";
import { syncProjectsToDemosJson } from "@/lib/projects";
import { z } from "zod";

const projectSchema = z.object({
  title: z.string().min(1).optional(),
  slug: z.string().min(1).optional(),
  description: z.string().optional().nullable(),
  content: z.string().optional().nullable(),
  image: z.string().optional().nullable(),
  liveDemo: z.string().optional().nullable(),
  sourceCode: z.string().optional().nullable(),
  contactEmail: z.string().optional().nullable(),
  technologies: z.union([z.string(), z.array(z.string())]).optional(),
  featured: z.boolean().optional(),
  available: z.boolean().optional(),
  status: z.enum(["draft", "published", "archived"]).optional(),
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
    const project = await prisma.project.findUnique({ where: { id } });
    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }
    return NextResponse.json(project);
  } catch (error) {
    console.error("Error fetching project:", error);
    return NextResponse.json(
      { error: "Failed to fetch project" },
      { status: 500 }
    );
  }
}

export async function PUT(
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
    const data = projectSchema.parse(body);

    if (data.slug) {
      const existing = await prisma.project.findFirst({
        where: { slug: data.slug, id: { not: id } },
      });
      if (existing) {
        return NextResponse.json(
          { error: "A project with this slug already exists" },
          { status: 400 }
        );
      }
    }

    const current = await prisma.project.findUnique({ where: { id } });
    if (!current) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    const updateData: Record<string, unknown> = { ...data };
    if (data.technologies !== undefined) {
      updateData.technologies = normalizeStringArray(data.technologies);
    }
    if (data.status === "published" && !current.publishedAt) {
      updateData.publishedAt = new Date();
    }

    const project = await prisma.project.update({
      where: { id },
      data: updateData,
    });

    const sync = await syncProjectsToDemosJson();

    return NextResponse.json({ ...project, sync });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation error", details: error.issues },
        { status: 400 }
      );
    }
    console.error("Error updating project:", error);
    return NextResponse.json(
      { error: "Failed to update project" },
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
    await prisma.project.delete({ where: { id } });
    const sync = await syncProjectsToDemosJson();
    return NextResponse.json({
      message: "Project deleted successfully",
      sync,
    });
  } catch (error) {
    console.error("Error deleting project:", error);
    return NextResponse.json(
      { error: "Failed to delete project" },
      { status: 500 }
    );
  }
}
