export type BlogPostListItem = {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  published_at: string | null;
};

export type BlogPost = BlogPostListItem & {
  content: string;
};

export function cmsBase(): string {
  return (
    import.meta.env.KECKTECH_CMS_URL ||
    import.meta.env.PUBLIC_KECKTECH_CMS_URL ||
    'http://127.0.0.1:8085'
  );
}

export function formatDate(iso: string | null | undefined): string {
  if (!iso) return '';
  try {
    return new Date(iso).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  } catch {
    return '';
  }
}

export async function fetchPosts(): Promise<BlogPostListItem[]> {
  const res = await fetch(`${cmsBase()}/api/blog/posts`, {
    headers: { Accept: 'application/json' },
  });
  if (!res.ok) {
    throw new Error(`CMS blog list failed: HTTP ${res.status}`);
  }
  const data = await res.json();
  return Array.isArray(data.posts) ? data.posts : [];
}

export async function fetchPost(slug: string): Promise<BlogPost | null> {
  const res = await fetch(`${cmsBase()}/api/blog/posts/${encodeURIComponent(slug)}`, {
    headers: { Accept: 'application/json' },
  });
  if (res.status === 404) return null;
  if (!res.ok) {
    throw new Error(`CMS blog post failed: HTTP ${res.status}`);
  }
  const data = await res.json();
  return (data.post as BlogPost) || null;
}

const cardColors = ['#C07810', '#0D6E6E', '#1E3A5F', '#4A6887', '#2E7D32'];

export function cardColor(index: number): string {
  return cardColors[index % cardColors.length];
}
