import { prisma } from "@/lib/prisma";
import fs from "node:fs";

/**
 * Syncs the Service catalog (kecktech-cms admin + Me Manager /me-manager/content
 * bridge) to the static services.json the Astro site's /services page actually
 * reads. Added 2026-08-17 - this connection never existed before; services.json
 * was a hand-maintained static file with zero sync mechanism. Preserves the
 * existing hero/cta top-level blocks (site-wide framing copy, not per-service),
 * only replaces the services[] array.
 */
export async function syncServicesToJson() {
  const servicesPath = process.env.SERVICES_JSON_PATH;
  if (!servicesPath) return { ok: false as const, reason: "SERVICES_JSON_PATH unset" };

  const services = await prisma.service.findMany({
    where: { status: { not: "archived" } },
    orderBy: { order: "asc" },
  });

  let existing: Record<string, unknown> = {};
  try {
    existing = JSON.parse(fs.readFileSync(servicesPath, "utf8"));
  } catch {
    existing = {
      hero: { h1: "Every Service Exists For a Reason.", subtitle: "" },
      cta: { heading: "Not Sure Which Service Fits?", body: "", button: "Talk to a Human \u2192" },
    };
  }

  const output = {
    hero: existing.hero,
    cta: existing.cta,
    services: services.map((s) => ({
      id: s.slug,
      available: s.status === "active",
      name: s.title,
      price: s.price || "",
      ...(s.priceNote ? { priceNote: s.priceNote } : {}),
      body: s.content || s.description,
      features: (() => { try { return JSON.parse(s.features || "[]"); } catch { return []; } })(),
      cta: s.cta || "Get Started",
    })),
  };

  fs.writeFileSync(servicesPath, JSON.stringify(output, null, 2));
  return { ok: true as const, count: services.length };
}
