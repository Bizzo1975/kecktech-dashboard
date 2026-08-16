import { NextRequest, NextResponse } from "next/server";
import { getUser } from "@/lib/auth";
import {
  buildChecklist,
  collectAliases,
  listDomains,
  readRegistry,
  upsertDomain,
  writeRegistry,
  type DomainBlock,
} from "@/lib/email-registry";

export const dynamic = "force-dynamic";

async function requireOps() {
  const user = await getUser();
  if (!user.canOps) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  return null;
}

export async function GET() {
  const denied = await requireOps();
  if (denied) return denied;

  try {
    const { path: registryPath, data } = await readRegistry();
    const sharedMailbox = (data.sharedMailbox as string) || "support@kecktech.net";
    const domains = listDomains(data).map((domain) => {
      const block = data[domain] as DomainBlock;
      const aliases = collectAliases(block || {}, domain);
      return {
        domain,
        primary: block?.primary || "",
        brandName: block?.brandName || domain,
        autoReply: Boolean(block?.autoReply),
        newsletter: Boolean(block?.newsletter?.listmonk),
        aliases,
      };
    });

    return NextResponse.json({
      ok: true,
      registryPath,
      sharedMailbox,
      domains,
      note: data.note || "",
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Failed to read registry";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const denied = await requireOps();
  if (denied) return denied;

  try {
    const body = await req.json() as {
      domain?: string;
      primary?: string;
      brandName?: string;
      aliases?: string; // comma-separated local-parts or full emails
      autoReply?: boolean;
      newsletter?: boolean;
      newsletterFrom?: string;
    };

    const domain = (body.domain || "").trim().toLowerCase();
    const primary = (body.primary || "").trim().toLowerCase();
    if (!domain || !primary) {
      return NextResponse.json({ error: "domain and primary are required" }, { status: 400 });
    }
    if (!domain.includes(".") || !primary.includes("@")) {
      return NextResponse.json({ error: "Invalid domain or primary email" }, { status: 400 });
    }

    const aliasParts = (body.aliases || "")
      .split(/[,\s]+/)
      .map((s) => s.trim())
      .filter(Boolean);

    const { data } = await readRegistry();
    const sharedMailbox = (data.sharedMailbox as string) || "support@kecktech.net";
    const updated = upsertDomain(data, {
      domain,
      primary,
      brandName: body.brandName,
      aliases: aliasParts,
      autoReply: body.autoReply !== false,
      newsletter: Boolean(body.newsletter),
      newsletterFrom: body.newsletterFrom,
    });
    const savedPath = await writeRegistry(updated);
    const block = updated[domain] as DomainBlock;
    const aliases = collectAliases(block, domain);
    const checklist = buildChecklist({
      domain,
      primary,
      aliases,
      autoReply: Boolean(block.autoReply),
      newsletter: Boolean(block.newsletter?.listmonk),
      sharedMailbox,
    });

    return NextResponse.json({
      ok: true,
      registryPath: savedPath,
      domain,
      primary,
      aliases,
      checklist,
      cli: `pwsh -File ops/email/17-onboard-domain.ps1 -Domain ${domain} -Primary ${primary} -Aliases ${aliasParts.join(",") || "info,noreply"} -AutoReply${body.newsletter ? " -Newsletter" : ""} -EmitCloudflareOnly`,
      applyM365: `pwsh -File ops/email/17-onboard-domain.ps1 -Domain ${domain} -Primary ${primary} -ApplyM365`,
      owa: `https://outlook.office.com/mail/${sharedMailbox}/`,
      humanGates: [
        "Verify domain TXT in M365 Admin Center before -ApplyM365",
        "Apply Cloudflare mail RRsets only (MX/SPF/autodiscover/DMARC)",
        "Do not touch Unbound / AdGuard / LAN DNS / website A/AAAA",
      ],
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Failed to update registry";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
