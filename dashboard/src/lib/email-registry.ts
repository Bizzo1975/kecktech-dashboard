import { promises as fs } from "fs";
import path from "path";

const META = new Set(["note", "sharedMailbox", "phone"]);

export type DomainBlock = {
  primary?: string;
  brandName?: string;
  autoReply?: boolean;
  aliases?: string[] | Record<string, string>;
  also?: string[];
  newsletter?: {
    from?: string;
    replyTo?: string;
    listmonk?: boolean;
    aliasOptional?: string;
  };
  phone?: string | null;
  note?: string;
};

export type ContactsRegistry = {
  note?: string;
  sharedMailbox?: string;
  phone?: unknown;
  [domain: string]: unknown;
};

function registryCandidates(): string[] {
  const env = process.env.EMAIL_REGISTRY_PATH;
  const cwd = process.cwd();
  return [
    env,
    path.join(cwd, "data", "contacts-registry.json"),
    path.join(cwd, "contacts-registry.json"),
    "/data/contacts-registry.json",
  ].filter(Boolean) as string[];
}

export async function resolveRegistryPath(): Promise<string> {
  for (const p of registryCandidates()) {
    try {
      await fs.access(p);
      return p;
    } catch {
      /* try next */
    }
  }
  // Default writable bake path inside image
  return path.join(process.cwd(), "data", "contacts-registry.json");
}

export async function readRegistry(): Promise<{ path: string; data: ContactsRegistry }> {
  const p = await resolveRegistryPath();
  const raw = await fs.readFile(p, "utf8");
  return { path: p, data: JSON.parse(raw) as ContactsRegistry };
}

export async function writeRegistry(data: ContactsRegistry): Promise<string> {
  const p = await resolveRegistryPath();
  await fs.mkdir(path.dirname(p), { recursive: true });
  await fs.writeFile(p, JSON.stringify(data, null, 2) + "\n", "utf8");
  return p;
}

export function listDomains(reg: ContactsRegistry): string[] {
  return Object.keys(reg).filter((k) => !META.has(k));
}

export function collectAliases(block: DomainBlock, domain: string): string[] {
  const out: string[] = [];
  if (block.primary) out.push(block.primary);
  if (Array.isArray(block.also)) out.push(...block.also);
  if (block.aliases) {
    if (Array.isArray(block.aliases)) out.push(...block.aliases);
    else out.push(...Object.values(block.aliases));
  }
  if (block.newsletter?.from) out.push(block.newsletter.from);
  if (block.newsletter?.aliasOptional) out.push(block.newsletter.aliasOptional);
  return [...new Set(out.map((a) => (a.includes("@") ? a : `${a}@${domain}`)))];
}

export function buildChecklist(opts: {
  domain: string;
  primary: string;
  aliases: string[];
  autoReply: boolean;
  newsletter: boolean;
  sharedMailbox: string;
}): string[] {
  const mx = "kecktechitsolutions.mail.protection.outlook.com";
  const lines = [
    `=== Onboard checklist: ${opts.domain} ===`,
    `1. Registry — contacts-registry.json updated (this tool).`,
    `2. M365 — Admin Center → Domains → Add ${opts.domain} (TXT verify).`,
    `   Once AcceptedDomain exists, add aliases on ${opts.sharedMailbox}:`,
    ...opts.aliases.map((a) => `     smtp:${a}`),
    `   CLI: pwsh -File ops/email/17-onboard-domain.ps1 -Domain ${opts.domain} -Primary ${opts.primary} -ApplyM365`,
    `3. Cloudflare — mail RRsets ONLY (never touch A/AAAA / LAN DNS / Unbound / AdGuard):`,
    `     MX  ${opts.domain} → ${mx} (priority 0)`,
    `     TXT ${opts.domain} → v=spf1 include:spf.protection.outlook.com -all`,
    `     CNAME autodiscover.${opts.domain} → autodiscover.outlook.com`,
    `     TXT _dmarc.${opts.domain} → v=DMARC1; p=none; rua=mailto:${opts.sharedMailbox}`,
    `4. Graph — same Entra app Mail.Send; From: brand alias via shared mailbox Send As.`,
    `5. Auto-reply — ${opts.autoReply ? "enabled (contact forms use Graph confirmation)" : "skipped"}`,
    `6. Newsletter — ${opts.newsletter ? "create Listmonk list; set LISTMONK_* env; From/Reply-To brand alias" : "skipped"}`,
    `7. Verify — send [TEST] onboard ${opts.primary}; OWA:`,
    `   https://outlook.office.com/mail/${opts.sharedMailbox}/`,
  ];
  return lines;
}

export function upsertDomain(
  reg: ContactsRegistry,
  opts: {
    domain: string;
    primary: string;
    brandName?: string;
    aliases: string[];
    autoReply: boolean;
    newsletter: boolean;
    newsletterFrom?: string;
  }
): ContactsRegistry {
  const domain = opts.domain.toLowerCase().trim();
  const primary = opts.primary.trim().toLowerCase();
  const aliasList = opts.aliases
    .map((a) => a.trim())
    .filter(Boolean)
    .map((a) => (a.includes("@") ? a.toLowerCase() : `${a.toLowerCase()}@${domain}`));

  const existing = (reg[domain] as DomainBlock) || {};
  const block: DomainBlock = {
    ...existing,
    primary,
    brandName: opts.brandName || existing.brandName || domain,
    autoReply: opts.autoReply,
  };

  const prevAlso = Array.isArray(existing.also) ? existing.also : [];
  const merged = [...new Set([...prevAlso, ...aliasList.filter((a) => a !== primary)])];
  block.also = merged;

  if (opts.newsletter) {
    const from = (opts.newsletterFrom || primary).toLowerCase();
    block.newsletter = {
      from,
      replyTo: primary,
      listmonk: true,
      aliasOptional: from === primary ? `newsletter@${domain}` : from,
    };
  }

  reg[domain] = block;
  return reg;
}
