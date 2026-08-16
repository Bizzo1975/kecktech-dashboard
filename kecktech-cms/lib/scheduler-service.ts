import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { notifyMeManagerTeaser } from "@/lib/me-manager-teaser";

export type ScheduledPublishStats = {
  postsToPublish: number;
  published: Array<{
    id: string;
    title: string;
    slug: string;
    excerpt: string | null;
    teaser: Awaited<ReturnType<typeof notifyMeManagerTeaser>>;
  }>;
  lastRunAt: Date;
};

/**
 * Find scheduled posts that are due, publish them, fire ME Manager teasers,
 * and revalidate blog paths (revalidation failures are non-fatal).
 */
export async function publishScheduledPosts(
  now: Date = new Date()
): Promise<ScheduledPublishStats> {
  const due = await prisma.post.findMany({
    where: {
      status: "scheduled",
      scheduledPublishAt: { lte: now },
    },
    select: {
      id: true,
      title: true,
      slug: true,
      excerpt: true,
    },
  });

  const published: ScheduledPublishStats["published"] = [];

  for (const post of due) {
    const updated = await prisma.post.update({
      where: { id: post.id },
      data: {
        status: "published",
        published: true,
        publishedAt: now,
      },
      select: {
        id: true,
        title: true,
        slug: true,
        excerpt: true,
      },
    });

    console.log(`✅ Published post: "${updated.title}" (${updated.slug})`);

    let teaser: Awaited<ReturnType<typeof notifyMeManagerTeaser>>;
    try {
      teaser = await notifyMeManagerTeaser({
        title: updated.title,
        slug: updated.slug,
        excerpt: updated.excerpt,
      });
      console.log(`📣 Teaser for "${updated.title}":`, teaser);
    } catch (error) {
      console.error(`❌ Teaser failed for "${updated.title}":`, error);
      teaser = {
        ok: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }

    try {
      revalidatePath("/blog");
      revalidatePath(`/blog/${updated.slug}`);
    } catch (error) {
      console.error(`⚠️ Revalidate failed for "${updated.slug}":`, error);
    }

    published.push({
      id: updated.id,
      title: updated.title,
      slug: updated.slug,
      excerpt: updated.excerpt,
      teaser,
    });
  }

  return {
    postsToPublish: due.length,
    published,
    lastRunAt: now,
  };
}

export class SchedulerService {
  static async publishScheduledContent(): Promise<ScheduledPublishStats> {
    return publishScheduledPosts(new Date());
  }

  static async runSchedulerManually(): Promise<ScheduledPublishStats> {
    console.log("🔄 Manually triggering scheduled content publishing...");
    return this.publishScheduledContent();
  }
}
