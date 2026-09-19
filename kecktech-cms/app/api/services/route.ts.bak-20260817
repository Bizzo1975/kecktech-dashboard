import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const serviceSchema = z.object({
  title: z.string().min(1, "Title is required"),
  slug: z.string().min(1, "Slug is required"),
  description: z.string().min(1, "Description is required"),
  content: z.string().optional(),
  categoryId: z.string().optional().nullable(),
  price: z.string().optional().nullable(),
  image: z.string().optional().nullable(),
  featured: z.boolean().default(false),
  status: z.enum(["active", "coming-soon", "archived"]).default("active"),
  order: z.number().default(0),
  metaTitle: z.string().optional().nullable(),
  metaDescription: z.string().optional().nullable(),
});

// GET - List all services
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const services = await prisma.service.findMany({
      include: {
        category: true,
      },
      orderBy: {
        order: "asc",
      },
    });

    return NextResponse.json(services);
  } catch (error) {
    console.error("Error fetching services:", error);
    return NextResponse.json(
      { error: "Failed to fetch services" },
      { status: 500 }
    );
  }
}

// POST - Create a new service
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || (session.user.role !== "admin" && session.user.role !== "editor")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const data = serviceSchema.parse(body);

    // Check if slug already exists
    const existingService = await prisma.service.findUnique({
      where: { slug: data.slug },
    });

    if (existingService) {
      return NextResponse.json(
        { error: "A service with this slug already exists" },
        { status: 400 }
      );
    }

    const service = await prisma.service.create({
      data: {
        ...data,
        categoryId: data.categoryId || undefined,
      },
      include: {
        category: true,
      },
    });

    return NextResponse.json(service, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation error", details: error.issues },
        { status: 400 }
      );
    }
    console.error("Error creating service:", error);
    return NextResponse.json(
      { error: "Failed to create service" },
      { status: 500 }
    );
  }
}

