import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { serializeProject, syncProjectsToDemosJson } from "@/lib/projects";

function authorize(request: NextRequest): boolean {
  const key = process.env.ME_MANAGER_API_KEY;
  if (!key) return false;
  const header = request.headers.get("authorization") || "";
  return header === `Bearer ${key}`;
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
    const project = await prisma.project.findFirst({
      where: { OR: [{ id }, { slug: id }] },
    });
    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }
    return NextResponse.json({
      ok: true,
      project: serializeProject(project),
      source: "kecktech",
    });
  } catch (error) {
    console.error("me-manager get project failed:", error);
    return NextResponse.json(
      { error: "Failed to get project" },
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
    const existing = await prisma.project.findFirst({
      where: { OR: [{ id }, { slug: id }] },
    });
    if (!existing) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    const project = await prisma.project.update({
      where: { id: existing.id },
      data: {
        title: body.title ?? undefined,
        slug: body.slug ?? undefined,
        description: body.description ?? undefined,
        content: body.content ?? undefined,
        image: body.image ?? body.featured_image ?? undefined,
        technologies: Array.isArray(body.technologies)
          ? JSON.stringify(body.technologies)
          : undefined,
        liveDemo: body.live_demo ?? body.liveUrl ?? body.url ?? undefined,
        sourceCode: body.source_code ?? body.repoPath ?? undefined,
        contactEmail: body.contact_email ?? body.contactEmail ?? undefined,
        featured:
          typeof body.featured === "boolean" ? body.featured : undefined,
        available:
          typeof body.available === "boolean" ? body.available : undefined,
        status: body.status ?? undefined,
      },
    });

    await syncProjectsToDemosJson();

    return NextResponse.json({
      ok: true,
      project: serializeProject(project),
      source: "kecktech",
    });
  } catch (error) {
    console.error("me-manager patch project failed:", error);
    return NextResponse.json(
      { error: "Failed to update project" },
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
    const existing = await prisma.project.findFirst({
      where: { OR: [{ id }, { slug: id }] },
    });
    if (!existing) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }
    await prisma.project.delete({ where: { id: existing.id } });
    await syncProjectsToDemosJson();
    return NextResponse.json({ ok: true, source: "kecktech" });
  } catch (error) {
    console.error("me-manager delete project failed:", error);
    return NextResponse.json(
      { error: "Failed to delete project" },
      { status: 500 }
    );
  }
}
