import { cmsBase } from './cms-blog';

export type CmsPagePayload = {
  id: string;
  title: string;
  slug: string;
  content: string;
  json: Record<string, unknown> | null;
  meta_title: string | null;
  meta_description: string | null;
  updated_at: string;
};

/** Shallow+nested merge: CMS JSON overlays static defaults without blanking missing keys. */
export function mergePageJson<T extends Record<string, unknown>>(
  fallback: T,
  overlay: Record<string, unknown> | null | undefined
): T {
  if (!overlay || typeof overlay !== 'object') return fallback;
  const out: Record<string, unknown> = { ...fallback };
  for (const [key, value] of Object.entries(overlay)) {
    const base = fallback[key];
    if (
      value &&
      typeof value === 'object' &&
      !Array.isArray(value) &&
      base &&
      typeof base === 'object' &&
      !Array.isArray(base)
    ) {
      out[key] = mergePageJson(
        base as Record<string, unknown>,
        value as Record<string, unknown>
      );
    } else if (value !== undefined && value !== null && value !== '') {
      out[key] = value;
    }
  }
  return out as T;
}

export async function fetchCmsPage(slug: string): Promise<CmsPagePayload | null> {
  try {
    const res = await fetch(`${cmsBase()}/api/pages/${encodeURIComponent(slug)}`, {
      headers: { Accept: 'application/json' },
    });
    if (res.status === 404) return null;
    if (!res.ok) {
      throw new Error(`CMS page failed: HTTP ${res.status}`);
    }
    const data = await res.json();
    return (data.page as CmsPagePayload) || null;
  } catch (err) {
    console.warn(`[cms-pages] fetch ${slug} failed:`, err);
    return null;
  }
}

/** Fetch CMS page JSON and merge over static fallback; never blanks the site. */
export async function loadPageContent<T extends Record<string, unknown>>(
  slug: string,
  fallback: T
): Promise<{ data: T; fromCms: boolean }> {
  const page = await fetchCmsPage(slug);
  if (!page) return { data: fallback, fromCms: false };

  let overlay: Record<string, unknown> | null = page.json;
  if (!overlay && page.content) {
    try {
      const parsed = JSON.parse(page.content);
      if (parsed && typeof parsed === 'object') {
        overlay = parsed as Record<string, unknown>;
      }
    } catch {
      overlay = null;
    }
  }

  if (!overlay) return { data: fallback, fromCms: false };
  return { data: mergePageJson(fallback, overlay), fromCms: true };
}
