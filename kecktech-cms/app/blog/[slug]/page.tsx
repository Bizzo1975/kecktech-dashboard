import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const post = await prisma.post.findUnique({ where: { slug } });
  if (!post || !post.published) return { title: "Post" };
  return {
    title: post.title,
    description: post.excerpt || undefined,
  };
}

export default async function BlogPostPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const post = await prisma.post.findUnique({ where: { slug } });
  if (!post || !post.published) notFound();

  return (
    <main className="mx-auto max-w-3xl px-4 py-16">
      <Link
        href="/blog"
        className="mb-8 inline-block text-sm text-muted-foreground hover:underline"
      >
        ← Blog
      </Link>
      <article>
        <h1 className="mb-4 text-3xl font-bold tracking-tight">{post.title}</h1>
        {post.publishedAt ? (
          <time
            className="mb-8 block text-sm text-muted-foreground"
            dateTime={post.publishedAt.toISOString()}
          >
            {post.publishedAt.toLocaleDateString()}
          </time>
        ) : null}
        {post.excerpt ? (
          <p className="mb-8 text-lg text-muted-foreground">{post.excerpt}</p>
        ) : null}
        <div className="prose prose-invert max-w-none whitespace-pre-wrap">
          {post.content}
        </div>
      </article>
    </main>
  );
}
