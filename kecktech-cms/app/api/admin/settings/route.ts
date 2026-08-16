import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const SETTING_KEYS = ["site_name", "site_url", "default_author"] as const;

const settingsSchema = z.object({
  site_name: z.string().optional(),
  site_url: z.string().optional(),
  default_author: z.string().optional(),
});

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const rows = await prisma.setting.findMany({
      where: { key: { in: [...SETTING_KEYS] } },
    });

    const settings: Record<string, string> = {
      site_name: "",
      site_url: "",
      default_author: "",
    };
    for (const row of rows) {
      settings[row.key] = row.value;
    }

    return NextResponse.json(settings);
  } catch (error) {
    console.error("Error fetching settings:", error);
    return NextResponse.json(
      { error: "Failed to fetch settings" },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const data = settingsSchema.parse(body);

    const updates: Array<{ key: string; value: string }> = [];
    for (const key of SETTING_KEYS) {
      if (data[key] !== undefined) {
        updates.push({ key, value: data[key] as string });
      }
    }

    for (const { key, value } of updates) {
      await prisma.setting.upsert({
        where: { key },
        create: { key, value },
        update: { value },
      });
    }

    const rows = await prisma.setting.findMany({
      where: { key: { in: [...SETTING_KEYS] } },
    });
    const settings: Record<string, string> = {
      site_name: "",
      site_url: "",
      default_author: "",
    };
    for (const row of rows) {
      settings[row.key] = row.value;
    }

    return NextResponse.json(settings);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation error", details: error.issues },
        { status: 400 }
      );
    }
    console.error("Error updating settings:", error);
    return NextResponse.json(
      { error: "Failed to update settings" },
      { status: 500 }
    );
  }
}
