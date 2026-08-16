import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { normalizeStringArray } from "@/lib/cms";
import { syncProjectsToDemosJson } from "@/lib/projects";
import { z } from "zod";

const projectSchema = z.object({
  title: z.string().min(1, "Title is required"),
  slug: z.string().min(1, "Slug is required"),
  description: z.string().optional().nullable(),
  content: z.string().optional().nullable(),
  image: z.string().optional().nullable(),
  liveDemo: z.string().optional().nullable(),
  sourceCode: z.string().optional().nullable(),
  contactEmail: z.string().optional().nullable(),
  technologies: z.union([z.string(), z.array(z.string())]).optional(),
  featured: z.boolean().default(false),
  available: z.boolean().default(true),
  status: z.enum(["draft", "published", "archived"]).default("published"),
});

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const projects = await prisma.project.findMany({
      orderBy: { updatedAt: "desc" },
    });
    return NextResponse.json(projects);
  } catch (error) {
    console.error("Error fetching projects:", error);
    return NextResponse.json(
      { error: "Failed to fetch projects" },
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
    const data = projectSchema.parse(body);

    const existing = await prisma.project.findUnique({
      where: { slug: data.slug },
    });
    if (existing) {
      return NextResponse.json(
        { error: "A project with this slug already exists" },
        { status: 400 }
      );
    }

    const project = await prisma.project.create({
      data: {
        title: data.title,
        slug: data.slug,
        description: data.description || null,
        content: data.content || null,
        image: data.image || null,
        liveDemo: data.liveDemo || null,
        sourceCode: data.sourceCode || null,
        contactEmail: data.contactEmail || null,
        technologies: normalizeStringArray(data.technologies),
        featured: data.featured,
        available: data.available,
        status: data.status,
        publishedAt: data.status === "published" ? new Date() : null,
      },
    });

    const sync = await syncProjectsToDemosJson();

    return NextResponse.json({ ...project, sync }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation error", details: error.issues },
        { status: 400 }
      );
    }
    console.error("Error creating project:", error);
    return NextResponse.json(
      { error: "Failed to create project" },
      { status: 500 }
    );
  }
}
