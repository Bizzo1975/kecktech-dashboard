import { prisma } from "@/lib/prisma";
import fs from "node:fs";
import path from "node:path";

export type ProjectRow = {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  content: string | null;
  image: string | null;
  technologies: string;
  liveDemo: string | null;
  sourceCode: string | null;
  contactEmail: string | null;
  featured: boolean;
  available: boolean;
  status: string;
  publishedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

export function serializeProject(p: ProjectRow) {
  let technologies: string[] = [];
  try {
    technologies = JSON.parse(p.technologies || "[]");
  } catch {
    technologies = [];
  }
  return {
    id: p.id,
    title: p.title,
    slug: p.slug,
    description: p.description,
    content: p.content,
    image: p.image,
    technologies,
    live_demo: p.liveDemo,
    source_code: p.sourceCode,
    contact_email: p.contactEmail,
    featured: p.featured,
    available: p.available,
    status: p.status,
    published_at: p.publishedAt,
    created_at: p.createdAt,
    updated_at: p.updatedAt,
  };
}

/** Marketing /demos allowlist — only these ids appear in Astro demos.json apps[]. */
export const MARKETING_DEMO_ALLOWLIST = [
  "marketlist",
  "flooros",
  "portal",
  "farmbot",
  "cleaner",
  "argo",
  "netops",
  "chat",
  "sovereign-hub",
  "aerocad",
] as const;

/** CMS / Portfolio slug aliases → canonical marketing id */
export const DEMO_SLUG_ALIASES: Record<string, string> = {
  "net-ops": "netops",
  "kecktech-portal": "portal",
  "chat-kecktech": "chat",
  sovereign: "sovereign-hub",
  syll: "aerocad",
};

export function canonicalizeDemoId(slug: string): string | null {
  const raw = (slug || "").trim().toLowerCase();
  if (!raw) return null;
  const mapped = DEMO_SLUG_ALIASES[raw] || raw;
  return (MARKETING_DEMO_ALLOWLIST as readonly string[]).includes(mapped)
    ? mapped
    : null;
}

type DemoApp = {
  id: string;
  name: string;
  description: string;
  url: string;
  image: string;
  contactEmail: string;
  available: boolean;
  demoUser?: string;
  demoPassword?: string;
};

/**
 * Mirror published projects into Astro demos.json apps[] when DEMOS_JSON_PATH is set.
 * Replaces apps[] with the marketing allowlist only (never merge-retain orphans).
 */
export async function syncProjectsToDemosJson() {
  const demosPath = process.env.DEMOS_JSON_PATH;
  if (!demosPath) return { ok: false as const, reason: "DEMOS_JSON_PATH unset" };

  const projects = await prisma.project.findMany({
    where: { status: "published", available: true },
    orderBy: { updatedAt: "desc" },
  });

  let existing: Record<string, unknown> = {};
  try {
    existing = JSON.parse(fs.readFileSync(demosPath, "utf8"));
  } catch {
    existing = {
      hero: {
        h1: "Live Demos. Real Apps.",
        subtitle: "Open the apps we build and host.",
        cta: "Talk to Us →",
        ctaSecondary: "Browse Demos ↓",
      },
      demos: {
        label: "Built by Kecktech",
        heading: "Try the Apps",
        intro: "Each card opens a running demo.",
      },
      apps: [],
      cta: {
        heading: "Want Something Like This for Your Business?",
        body: "Tell us what you need — we’ll scope a custom app or adapt one of these patterns to your workflow.",
        button: "Contact Kecktech →",
      },
    };
  }

  const prev = Array.isArray(existing.apps) ? (existing.apps as DemoApp[]) : [];
  const curatedById = new Map<string, DemoApp>();
  for (const app of prev) {
    if (!app || typeof app.id !== "string") continue;
    const id = canonicalizeDemoId(app.id);
    if (id) curatedById.set(id, { ...app, id });
  }

  // First-seen wins (projects ordered updatedAt desc — prefer freshest CMS row per canonical id)
  const fromCms = new Map<string, DemoApp>();
  for (const p of projects) {
    const id = canonicalizeDemoId(p.slug);
    if (!id || fromCms.has(id)) continue;
    const prevApp = curatedById.get(id);
    fromCms.set(id, {
      id,
      name: p.title || prevApp?.name || id,
      description: p.description || prevApp?.description || "",
      url: p.liveDemo || prevApp?.url || "#",
      image: p.image || prevApp?.image || `/images/demos/${id}.jpg`,
      contactEmail:
        p.contactEmail || prevApp?.contactEmail || `${id}@kecktech.net`,
      available: p.available,
      ...(prevApp?.demoUser ? { demoUser: prevApp.demoUser } : {}),
      ...(prevApp?.demoPassword ? { demoPassword: prevApp.demoPassword } : {}),
    });
  }

  // Allowlist order; CMS row preferred, else keep curated shell if present
  const apps: DemoApp[] = [];
  for (const id of MARKETING_DEMO_ALLOWLIST) {
    const cms = fromCms.get(id);
    const curated = curatedById.get(id);
    if (cms) {
      apps.push(cms);
    } else if (curated) {
      apps.push({ ...curated, id });
    }
  }

  const next = { ...existing, apps };
  const dir = path.dirname(demosPath);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(demosPath, JSON.stringify(next, null, 2) + "\n", "utf8");
  return { ok: true as const, count: apps.length, path: demosPath };
}
