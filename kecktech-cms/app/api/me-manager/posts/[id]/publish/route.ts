import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { notifyMeManagerTeaser } from "@/lib/me-manager-teaser";

function authorize(request: NextRequest): boolean {
  const key = process.env.ME_MANAGER_API_KEY;
  if (!key) return false;
  const header = request.headers.get("authorization") || "";
  return header === `Bearer ${key}`;
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!authorize(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  try {
    const post = await prisma.post.update({
      where: { id },
      data: {
        published: true,
        status: "published",
        publishedAt: new Date(),
      },
    });

    revalidatePath("/blog");
    revalidatePath(`/blog/${post.slug}`);

    const teaser = await notifyMeManagerTeaser(post);

    // Ask ME Manager to trigger Astro static rebuild (marketing /blog).
    let astroRebuild: { ok?: boolean; skipped?: boolean; message?: string } | null =
      null;
    const meUrl = process.env.ME_MANAGER_URL?.replace(/\/$/, "");
    const ingest = process.env.ME_MANAGER_INGEST_KEY;
    if (meUrl && ingest) {
      try {
        const res = await fetch(`${meUrl}/api/sites/astro-rebuild`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${ingest}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            site: "kecktech",
            reason: `publish:${post.slug}`,
          }),
          signal: AbortSignal.timeout(30_000),
        });
        astroRebuild = (await res.json().catch(() => ({}))) as {
          ok?: boolean;
          skipped?: boolean;
          message?: string;
        };
      } catch (e) {
        astroRebuild = {
          ok: false,
          message: e instanceof Error ? e.message : String(e),
        };
      }
    }

    return NextResponse.json({
      ok: true,
      post: {
        id: post.id,
        title: post.title,
        slug: post.slug,
        status: post.status,
        published: post.published,
        published_at: post.publishedAt,
        excerpt: post.excerpt,
      },
      teaser,
      astroRebuild,
      message:
        "Published. Social teaser enqueue attempted; Astro rebuild requested via ME Manager.",
    });
  } catch (error) {
    console.error("me-manager publish failed:", error);
    return NextResponse.json(
      { error: "Failed to publish post" },
      { status: 500 }
    );
  }
}
