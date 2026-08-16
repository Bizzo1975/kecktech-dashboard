/** Shared helpers for admin CMS APIs */

export function normalizeStringArray(value: unknown): string {
  if (Array.isArray(value)) {
    return JSON.stringify(value.map(String).map((s) => s.trim()).filter(Boolean));
  }
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return "[]";
    try {
      const parsed = JSON.parse(trimmed);
      if (Array.isArray(parsed)) {
        return JSON.stringify(
          parsed.map(String).map((s) => s.trim()).filter(Boolean)
        );
      }
    } catch {
      // comma-separated
    }
    return JSON.stringify(
      trimmed
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean)
    );
  }
  return "[]";
}

export function parseStringArray(value: string | null | undefined): string[] {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    if (Array.isArray(parsed)) return parsed.map(String);
  } catch {
    // fall through
  }
  return value
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

export function joinStringArray(value: string | null | undefined): string {
  return parseStringArray(value).join(", ");
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export const textareaClassName =
  "flex min-h-[80px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50";
