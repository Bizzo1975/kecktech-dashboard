import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { serializeProject, syncProjectsToDemosJson } from "@/lib/projects";

function authorize(request: NextRequest): boolean {
  const key = process.env.ME_MANAGER_API_KEY;
  if (!key) return false;
  const header = request.headers.get("authorization") || "";
  return header === `Bearer ${key}`;
}

export async function GET(request: NextRequest) {
  if (!authorize(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const projects = await prisma.project.findMany({
      orderBy: { updatedAt: "desc" },
      take: 100,
    });
    return NextResponse.json({
      projects: projects.map(serializeProject),
      source: "kecktech",
    });
  } catch (error) {
    console.error("me-manager projects list failed:", error);
    return NextResponse.json(
      { error: "Failed to list projects" },
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
    const slug =
      body.slug ||
      String(body.title || "project")
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "");

    const project = await prisma.project.upsert({
      where: { slug },
      create: {
        title: body.title || slug,
        slug,
        description: body.description ?? null,
        content: body.content ?? null,
        image: body.image ?? body.featured_image ?? null,
        technologies: JSON.stringify(body.technologies || []),
        liveDemo: body.live_demo ?? body.liveUrl ?? body.url ?? null,
        sourceCode: body.source_code ?? body.repoPath ?? null,
        contactEmail: body.contact_email ?? body.contactEmail ?? null,
        featured: Boolean(body.featured),
        available: body.available !== false,
        status: body.status || "published",
        publishedAt: body.status === "draft" ? null : new Date(),
      },
      update: {
        title: body.title || undefined,
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
        status: body.status || undefined,
      },
    });

    await syncProjectsToDemosJson();

    return NextResponse.json({
      ok: true,
      project: serializeProject(project),
      source: "kecktech",
    });
  } catch (error) {
    console.error("me-manager create project failed:", error);
    return NextResponse.json(
      { error: "Failed to create project" },
      { status: 500 }
    );
  }
}
