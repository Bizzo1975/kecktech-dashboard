import { getUser } from "@/lib/auth";
import { getLeads, getOpportunities } from "@/lib/erpnext";
import { getWebsiteStats } from "@/lib/umami";
import { RefreshOnLeadCreate } from "@/components/sales/RefreshOnLeadCreate";
import { SalesBoard } from "@/components/sales/SalesBoard";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const SOURCE_COLORS: Record<string, string> = {
  "WordPress Form": "#38bdf8",
  Referral: "#a78bfa",
  "RMM Alert": "#fb923c",
  Manual: "#64748b",
  "Cold Call": "#34d399",
  Other: "#94a3b8",
};

const STAGE_COLORS: Record<string, string> = {
  New: "#60a5fa",
  Open: "#a78bfa",
  Replied: "#34d399",
  Opportunity: "#fbbf24",
  Quotation: "#fb923c",
  Interested: "#f472b6",
  Converted: "#4ade80",
  "Do Not Contact": "#f87171",
};

function daysSince(dateStr: string) {
  if (!dateStr) return 0;
  return Math.floor((Date.now() - new Date(dateStr).getTime()) / 86_400_000);
}

function KpiCard({ label, value, sub, color }: { label: string; value: string; sub?: string; color?: string }) {
  return (
    <div style={{ background: "#1e293b", border: "1px solid #334155", borderRadius: "10px", padding: "16px 20px", flex: 1, minWidth: 0 }}>
      <div style={{ fontSize: "11px", color: "#64748b", fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "6px" }}>{label}</div>
      <div style={{ fontSize: "22px", fontWeight: 700, color: color || "#f1f5f9" }}>{value}</div>
      {sub && <div style={{ fontSize: "12px", color: "#64748b", marginTop: "2px" }}>{sub}</div>}
    </div>
  );
}

function SourceBadge({ source }: { source: string }) {
  const color = SOURCE_COLORS[source] || "#64748b";
  return (
    <span style={{ fontSize: "10px", padding: "1px 6px", borderRadius: "999px", background: `${color}22`, color, border: `1px solid ${color}44` }}>
      {source || "Manual"}
    </span>
  );
}

export default async function SalesPage() {
  const user = await getUser();
  if (!user.canSales) redirect("/");

  const [
    { leads, error: leadsErr },
    { opportunities, error: oppErr },
    { stats, error: umamiErr },
  ] = await Promise.all([
    getLeads(),
    getOpportunities(),
    getWebsiteStats(),
  ]);

  // Pipeline KPIs
  const active = leads.filter((l) => !["Converted", "Do Not Contact"].includes(l.status));
  const converted = leads.filter((l) => l.status === "Converted");
  const conversionRate = leads.length > 0 ? Math.round((converted.length / leads.length) * 100) : 0;
  const now = Date.now();
  const oneWeekAgo = now - 7 * 86_400_000;
  const newThisWeek = leads.filter((l) => new Date(l.creation).getTime() > oneWeekAgo).length;

  // Weighted pipeline forecast
  const weightedForecast = opportunities
    .filter((o) => !["Won", "Lost"].includes(o.status))
    .reduce((s, o) => s + ((o.opportunity_amount || 0) * (o.probability || 0)) / 100, 0);

  const openOpportunities = opportunities.filter((o) => !["Won", "Lost"].includes(o.status));
  const avgDealSize = openOpportunities.length > 0
    ? openOpportunities.reduce((s, o) => s + (o.opportunity_amount || 0), 0) / openOpportunities.length
    : 0;

  const fmtCur = (n: number) => n.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });

  // Follow-up queue: active leads not touched in 3+ days
  const followUp = active
    .filter((l) => daysSince(l.modified) >= 3)
    .sort((a, b) => daysSince(b.modified) - daysSince(a.modified))
    .slice(0, 15);

  return (
    <div style={{ padding: "28px 32px", maxWidth: "1600px", margin: "0 auto" }}>
      <h1 style={{ margin: "0 0 4px", fontSize: "22px", fontWeight: 700, color: "#f1f5f9" }}>Sales & CRM</h1>
      <p style={{ margin: "0 0 24px", color: "#64748b", fontSize: "13px" }}>
        Lead pipeline · Opportunities · Follow-ups · Quick capture
      </p>

      {/* ── KPI Row ─────────────────────────────────────────────────────────── */}
      <div style={{ display: "flex", gap: "14px", marginBottom: "28px", flexWrap: "wrap" }}>
        <KpiCard label="In Pipeline" value={String(active.length)} sub="Active leads" />
        <KpiCard label="New This Week" value={String(newThisWeek)} color={newThisWeek > 0 ? "#60a5fa" : undefined} />
        <KpiCard label="Conversion Rate" value={`${conversionRate}%`} sub={`${converted.length} converted`} color={conversionRate > 20 ? "#34d399" : undefined} />
        <KpiCard label="Open Opportunities" value={String(openOpportunities.length)} color="#a78bfa" sub={`${opportunities.filter(o => o.status === "Won").length} won`} />
        <KpiCard label="Weighted Forecast" value={fmtCur(weightedForecast)} color="#fbbf24" sub="Pipeline × probability" />
        <KpiCard label="Avg Deal Size" value={avgDealSize > 0 ? fmtCur(avgDealSize) : "—"} sub="Open opportunities" />
        {stats && (
          <KpiCard
            label="Website Visitors (7d)"
            value={String(stats.pageviews?.value ?? 0)}
            sub={umamiErr ? `⚠ ${umamiErr}` : "kecktech.net"}
          />
        )}
        {leadsErr && (
          <div style={{ background: "#1e293b", border: "1px solid #f8717144", borderRadius: "10px", padding: "16px 20px", fontSize: "13px", color: "#f87171", flex: 1 }}>
            ⚠ ERPNext Leads: {leadsErr}
          </div>
        )}
        {oppErr && (
          <div style={{ background: "#1e293b", border: "1px solid #f8717144", borderRadius: "10px", padding: "16px 20px", fontSize: "13px", color: "#f87171", flex: 1 }}>
            ⚠ ERPNext Opportunities: {oppErr}
          </div>
        )}
      </div>

      {/* ── Kanban + Opportunity Pipeline (interactive client component) ──── */}
      <section style={{ marginBottom: "32px" }}>
        <h2 style={{ margin: "0 0 14px", fontSize: "16px", fontWeight: 600, color: "#e2e8f0" }}>
          📊 Lead Pipeline
          <span style={{ fontSize: "12px", fontWeight: 400, color: "#475569", marginLeft: "8px" }}>
            Drag cards to move between stages · Click to open detail
          </span>
        </h2>
        <SalesBoard leads={leads} opportunities={opportunities} />
      </section>

      {/* ── Bottom Row: Follow-Up + New Lead ──────────────────────────────── */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 380px", gap: "20px", alignItems: "start" }}>
        {/* Follow-Up Queue */}
        <section>
          <h2 style={{ margin: "0 0 14px", fontSize: "16px", fontWeight: 600, color: "#e2e8f0" }}>
            ⏰ Follow-Up Queue
            {followUp.length > 0 && (
              <span style={{ marginLeft: "8px", fontSize: "13px", color: "#fb923c" }}>
                {followUp.length} stale
              </span>
            )}
          </h2>

          {followUp.length === 0 && (
            <div style={{ background: "#1e293b", border: "1px solid #334155", borderRadius: "10px", padding: "24px", textAlign: "center", color: "#475569", fontSize: "13px" }}>
              ✅ No leads need follow-up
            </div>
          )}

          {followUp.map((lead) => {
            const days = daysSince(lead.modified);
            const stageColor = STAGE_COLORS[lead.status] || "#64748b";
            return (
              <div
                key={lead.name}
                style={{
                  background: "#1e293b",
                  border: "1px solid #334155",
                  borderLeft: "4px solid #fb923c",
                  borderRadius: "10px",
                  padding: "12px 16px",
                  marginBottom: "8px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: "12px",
                }}
              >
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: "14px", fontWeight: 600, color: "#f1f5f9" }}>{lead.lead_name}</div>
                  {lead.company_name && (
                    <div style={{ fontSize: "12px", color: "#64748b" }}>{lead.company_name}</div>
                  )}
                  <div style={{ display: "flex", gap: "6px", marginTop: "4px", alignItems: "center", flexWrap: "wrap" }}>
                    <SourceBadge source={lead.utm_source} />
                    <span style={{ fontSize: "11px", padding: "1px 6px", borderRadius: "999px", background: `${stageColor}22`, color: stageColor, border: `1px solid ${stageColor}44` }}>
                      {lead.status}
                    </span>
                    <span style={{ fontSize: "11px", color: "#fb923c" }}>{days}d no contact</span>
                  </div>
                </div>
                <div style={{ flexShrink: 0 }}>
                  <a
                    href={`https://ops.kecktech.net/app/crm-lead/${lead.name}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      display: "block",
                      fontSize: "12px",
                      color: "#3b82f6",
                      textDecoration: "none",
                      border: "1px solid #334155",
                      borderRadius: "6px",
                      padding: "4px 10px",
                      whiteSpace: "nowrap",
                    }}
                  >
                    Open in CRM ↗
                  </a>
                </div>
              </div>
            );
          })}
        </section>

        {/* New Lead Form */}
        <section>
          <h2 style={{ margin: "0 0 14px", fontSize: "16px", fontWeight: 600, color: "#e2e8f0" }}>
            ✨ Add Lead
          </h2>
          <div
            style={{
              background: "#1e293b",
              border: "1px solid #334155",
              borderRadius: "10px",
              padding: "20px",
            }}
          >
            <RefreshOnLeadCreate />
          </div>
        </section>
      </div>
    </div>
  );
}
