import Link from "next/link";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Blog",
  description: "News and updates from Kecktech",
};

export default async function BlogIndexPage() {
  const posts = await prisma.post.findMany({
    where: { published: true, status: "published" },
    orderBy: { publishedAt: "desc" },
  });

  return (
    <main className="mx-auto max-w-3xl px-4 py-16">
      <h1 className="mb-2 text-3xl font-bold tracking-tight">Blog</h1>
      <p className="mb-10 text-muted-foreground">
        Updates from Kecktech — products, services, and engineering notes.
      </p>
      {posts.length === 0 ? (
        <p className="text-muted-foreground">No posts published yet.</p>
      ) : (
        <ul className="space-y-8">
          {posts.map((post) => (
            <li key={post.id} className="border-b border-border pb-8">
              <Link
                href={`/blog/${post.slug}`}
                className="text-xl font-semibold hover:underline"
              >
                {post.title}
              </Link>
              {post.excerpt ? (
                <p className="mt-2 text-muted-foreground">{post.excerpt}</p>
              ) : null}
              {post.publishedAt ? (
                <time
                  className="mt-2 block text-sm text-muted-foreground"
                  dateTime={post.publishedAt.toISOString()}
                >
                  {post.publishedAt.toLocaleDateString()}
                </time>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
