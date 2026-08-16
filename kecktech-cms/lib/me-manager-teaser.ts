export type TeaserPost = {
  title: string;
  excerpt?: string | null;
  slug?: string;
};

export type TeaserResult =
  | { skipped: true }
  | { ok: boolean; body?: unknown }
  | { ok: false; error: string };

/**
 * Notify ME Manager to enqueue social teasers for a newly published post.
 */
export async function notifyMeManagerTeaser(
  post: TeaserPost
): Promise<TeaserResult> {
  const meUrl = process.env.ME_MANAGER_URL || "http://localhost:3010";
  const ingestKey =
    process.env.ME_MANAGER_INGEST_KEY || process.env.ME_MANAGER_API_KEY;
  if (!ingestKey) return { skipped: true };

  const siteBase = (
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.NEXTAUTH_URL ||
    "https://www.kecktech.net"
  ).replace(/\/$/, "");
  const siteUrl = `${siteBase}/blog/${post.slug || ""}`;

  try {
    const res = await fetch(`${meUrl.replace(/\/$/, "")}/api/sites/teaser`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${ingestKey}`,
      },
      body: JSON.stringify({
        title: post.title,
        summary: post.excerpt || post.title,
        url: siteUrl,
        platforms: ["linkedin", "bluesky", "mastodon"],
      }),
    });
    const body = await res.json().catch(() => null);
    return { ok: res.ok, body };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : String(e),
    };
  }
}
