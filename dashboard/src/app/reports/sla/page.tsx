import { getUser } from "@/lib/auth";
import { getClosedTickets } from "@/lib/zammad";
import { SlaExportButton } from "@/components/reports/SlaExportButton";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";
export const revalidate = 0;

// SLA resolution targets by priority (hours)
const SLA_TARGETS: Record<string, number> = {
  high: 4,
  normal: 24,
  low: 72,
};

function getDefaultDateRange() {
  const to = new Date();
  const from = new Date();
  from.setDate(1);
  return {
    from: from.toISOString().split("T")[0],
    to: to.toISOString().split("T")[0],
    label: to.toLocaleString("en-US", { month: "long", year: "numeric" }),
  };
}

export default async function SlaReportsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string>>;
}) {
  const user = await getUser();
  if (!user.canSupport && !user.canOps) redirect("/");

  const params = await searchParams;
  const range = getDefaultDateRange();
  const dateFrom = params.from || range.from;
  const dateTo = params.to || range.to;

  const { tickets, error } = await getClosedTickets(dateFrom, dateTo);

  // Calculate SLA compliance per ticket
  type TicketSla = {
    id: number;
    number: number;
    title: string;
    client: string;
    priority: string;
    group: string;
    resolutionHours: number;
    slaTarget: number;
    slaMet: boolean;
    createdAt: string;
    closedAt: string;
  };

  const ticketRows: TicketSla[] = tickets.map((t) => {
    const created = new Date(t.created_at).getTime();
    const closed = new Date(t.updated_at).getTime();
    const resolutionHours = Math.max(0, (closed - created) / 3_600_000);
    const target = SLA_TARGETS[t.priority] ?? 24;
    return {
      id: t.id,
      number: t.number,
      title: t.title,
      client: t.customerName,
      priority: t.priority,
      group: t.group,
      resolutionHours,
      slaTarget: target,
      slaMet: resolutionHours <= target,
      createdAt: t.created_at,
      closedAt: t.updated_at,
    };
  });

  // Roll up by client
  type ClientSla = {
    client: string;
    ticketCount: number;
    slaMet: number;
    slaBreached: number;
    compliancePct: number;
    avgResolutionHours: number;
  };

  const clientMap: Record<string, ClientSla> = {};
  for (const t of ticketRows) {
    if (!clientMap[t.client]) {
      clientMap[t.client] = { client: t.client, ticketCount: 0, slaMet: 0, slaBreached: 0, compliancePct: 0, avgResolutionHours: 0 };
    }
    const c = clientMap[t.client];
    c.ticketCount++;
    c.avgResolutionHours += t.resolutionHours;
    if (t.slaMet) c.slaMet++;
    else c.slaBreached++;
  }
  for (const c of Object.values(clientMap)) {
    c.avgResolutionHours = c.ticketCount > 0 ? c.avgResolutionHours / c.ticketCount : 0;
    c.compliancePct = c.ticketCount > 0 ? (c.slaMet / c.ticketCount) * 100 : 100;
  }
  const clientRows = Object.values(clientMap).sort((a, b) => a.compliancePct - b.compliancePct);

  // Summary stats
  const totalTickets = ticketRows.length;
  const metCount = ticketRows.filter((t) => t.slaMet).length;
  const overallCompliance = totalTickets > 0 ? Math.round((metCount / totalTickets) * 100) : 100;
  const avgRes = totalTickets > 0 ? ticketRows.reduce((s, t) => s + t.resolutionHours, 0) / totalTickets : 0;

  const month = new Date(dateFrom).toLocaleString("en-US", { month: "long", year: "numeric" });

  return (
    <div style={{ padding: "28px 32px", maxWidth: "1200px", margin: "0 auto" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "24px", flexWrap: "wrap", gap: "12px" }}>
        <div>
          <h1 style={{ margin: "0 0 4px", fontSize: "22px", fontWeight: 700, color: "#f1f5f9" }}>SLA Compliance Report</h1>
          <p style={{ margin: 0, color: "#64748b", fontSize: "13px" }}>
            Closed tickets · {dateFrom} to {dateTo}
          </p>
        </div>
        <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
          <SlaExportButton rows={clientRows} month={month} />
          <a
            href="https://tickets.kecktech.net"
            target="_blank"
            rel="noopener noreferrer"
            style={{ fontSize: "12px", color: "#3b82f6" }}
          >
            Zammad ↗
          </a>
        </div>
      </div>

      {/* Date range form */}
      <form method="GET" style={{ display: "flex", gap: "10px", alignItems: "center", marginBottom: "24px", flexWrap: "wrap" }}>
        <label style={{ fontSize: "13px", color: "#94a3b8" }}>From</label>
        <input
          name="from"
          type="date"
          defaultValue={dateFrom}
          style={{ background: "#1e293b", border: "1px solid #334155", borderRadius: "6px", color: "#e2e8f0", padding: "6px 10px", fontSize: "13px" }}
        />
        <label style={{ fontSize: "13px", color: "#94a3b8" }}>To</label>
        <input
          name="to"
          type="date"
          defaultValue={dateTo}
          style={{ background: "#1e293b", border: "1px solid #334155", borderRadius: "6px", color: "#e2e8f0", padding: "6px 10px", fontSize: "13px" }}
        />
        <button
          type="submit"
          style={{ background: "#334155", color: "#e2e8f0", border: "none", borderRadius: "6px", padding: "7px 16px", fontSize: "13px", cursor: "pointer" }}
        >
          Apply
        </button>
      </form>

      {error && (
        <div style={{ background: "#1e293b", border: "1px solid #f8717144", borderRadius: "10px", padding: "16px", color: "#f87171", fontSize: "13px", marginBottom: "16px" }}>
          ⚠ Zammad error: {error}
        </div>
      )}

      {/* Summary KPIs */}
      <div style={{ display: "flex", gap: "14px", marginBottom: "28px", flexWrap: "wrap" }}>
        {[
          { label: "Closed Tickets", value: String(totalTickets) },
          { label: "SLA Met", value: String(metCount), color: "#34d399" },
          { label: "SLA Breached", value: String(totalTickets - metCount), color: totalTickets - metCount > 0 ? "#f87171" : "#34d399" },
          { label: "Overall Compliance", value: `${overallCompliance}%`, color: overallCompliance >= 90 ? "#34d399" : overallCompliance >= 70 ? "#fbbf24" : "#f87171" },
          { label: "Avg Resolution", value: `${avgRes.toFixed(1)}h`, color: "#60a5fa" },
        ].map((kpi) => (
          <div key={kpi.label} style={{ background: "#1e293b", border: "1px solid #334155", borderRadius: "10px", padding: "16px 20px", flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: "11px", color: "#64748b", fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "6px" }}>{kpi.label}</div>
            <div style={{ fontSize: "24px", fontWeight: 700, color: kpi.color || "#f1f5f9" }}>{kpi.value}</div>
          </div>
        ))}
      </div>

      {/* SLA Targets reference */}
      <div style={{ background: "#1e293b", border: "1px solid #334155", borderRadius: "10px", padding: "12px 16px", marginBottom: "24px", display: "flex", gap: "20px", flexWrap: "wrap" }}>
        <span style={{ fontSize: "12px", fontWeight: 600, color: "#64748b" }}>SLA Targets:</span>
        <span style={{ fontSize: "12px", color: "#f87171" }}>High → 4h resolution</span>
        <span style={{ fontSize: "12px", color: "#fbbf24" }}>Normal → 24h resolution</span>
        <span style={{ fontSize: "12px", color: "#60a5fa" }}>Low → 72h resolution</span>
      </div>

      {/* Per-client compliance table */}
      <section style={{ marginBottom: "32px" }}>
        <h2 style={{ margin: "0 0 14px", fontSize: "16px", fontWeight: 600, color: "#e2e8f0" }}>
          📊 Compliance by Client
        </h2>
        {clientRows.length === 0 && (
          <div style={{ background: "#1e293b", border: "1px solid #334155", borderRadius: "10px", padding: "24px", textAlign: "center", color: "#475569", fontSize: "13px" }}>
            No closed tickets in this date range
          </div>
        )}
        {clientRows.length > 0 && (
          <div style={{ background: "#1e293b", border: "1px solid #334155", borderRadius: "10px", overflow: "hidden" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
              <thead>
                <tr style={{ borderBottom: "1px solid #334155" }}>
                  {["Client", "Tickets", "SLA Met", "Breached", "Compliance", "Avg Resolution"].map((h) => (
                    <th key={h} style={{ padding: "10px 14px", textAlign: "left", color: "#64748b", fontWeight: 500, fontSize: "11px", textTransform: "uppercase" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {clientRows.map((row) => {
                  const compColor = row.compliancePct >= 90 ? "#34d399" : row.compliancePct >= 70 ? "#fbbf24" : "#f87171";
                  return (
                    <tr key={row.client} style={{ borderBottom: "1px solid #0f172a" }}>
                      <td style={{ padding: "10px 14px", color: "#e2e8f0", fontWeight: 600 }}>{row.client}</td>
                      <td style={{ padding: "10px 14px", color: "#94a3b8" }}>{row.ticketCount}</td>
                      <td style={{ padding: "10px 14px", color: "#34d399" }}>{row.slaMet}</td>
                      <td style={{ padding: "10px 14px", color: row.slaBreached > 0 ? "#f87171" : "#34d399" }}>{row.slaBreached}</td>
                      <td style={{ padding: "10px 14px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                          <div style={{ flex: 1, height: "6px", background: "#334155", borderRadius: "3px", overflow: "hidden", maxWidth: "80px" }}>
                            <div style={{ width: `${row.compliancePct}%`, height: "100%", background: compColor, borderRadius: "3px" }} />
                          </div>
                          <span style={{ color: compColor, fontWeight: 700, minWidth: "40px" }}>{row.compliancePct.toFixed(0)}%</span>
                        </div>
                      </td>
                      <td style={{ padding: "10px 14px", color: "#94a3b8" }}>{row.avgResolutionHours.toFixed(1)}h</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Individual ticket detail */}
      <section>
        <h2 style={{ margin: "0 0 14px", fontSize: "16px", fontWeight: 600, color: "#e2e8f0" }}>
          🎫 Ticket Detail ({ticketRows.length})
        </h2>
        {ticketRows.length > 0 && (
          <div style={{ background: "#1e293b", border: "1px solid #334155", borderRadius: "10px", overflow: "hidden" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12px" }}>
              <thead>
                <tr style={{ borderBottom: "1px solid #334155" }}>
                  {["#", "Title", "Client", "Priority", "Group", "Resolution", "Target", "SLA"].map((h) => (
                    <th key={h} style={{ padding: "8px 12px", textAlign: "left", color: "#64748b", fontWeight: 500, fontSize: "11px", textTransform: "uppercase" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {ticketRows.map((t) => (
                  <tr key={t.id} style={{ borderBottom: "1px solid #0f172a", background: t.slaMet ? "transparent" : "#1c0a0a22" }}>
                    <td style={{ padding: "8px 12px" }}>
                      <a href={`https://tickets.kecktech.net/#ticket/zoom/${t.id}`} target="_blank" rel="noopener noreferrer" style={{ color: "#3b82f6", textDecoration: "none" }}>
                        #{t.number}
                      </a>
                    </td>
                    <td style={{ padding: "8px 12px", color: "#e2e8f0", maxWidth: "200px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{t.title}</td>
                    <td style={{ padding: "8px 12px", color: "#94a3b8" }}>{t.client}</td>
                    <td style={{ padding: "8px 12px" }}>
                      <span style={{ fontSize: "10px", padding: "1px 6px", borderRadius: "999px", background: t.priority === "high" ? "#f8717122" : "#fbbf2422", color: t.priority === "high" ? "#f87171" : "#fbbf24", border: `1px solid ${t.priority === "high" ? "#f8717144" : "#fbbf2444"}` }}>
                        {t.priority}
                      </span>
                    </td>
                    <td style={{ padding: "8px 12px", color: "#64748b" }}>{t.group}</td>
                    <td style={{ padding: "8px 12px", color: "#94a3b8" }}>{t.resolutionHours.toFixed(1)}h</td>
                    <td style={{ padding: "8px 12px", color: "#64748b" }}>{t.slaTarget}h</td>
                    <td style={{ padding: "8px 12px" }}>
                      <span style={{ fontSize: "10px", padding: "1px 6px", borderRadius: "999px", background: t.slaMet ? "#34d39922" : "#f8717122", color: t.slaMet ? "#34d399" : "#f87171", border: `1px solid ${t.slaMet ? "#34d39944" : "#f8717144"}`, fontWeight: 600 }}>
                        {t.slaMet ? "✓ Met" : "✗ Breached"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
