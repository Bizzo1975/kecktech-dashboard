import { getUser } from "@/lib/auth";
import { getClientGroups } from "@/lib/trmm";
import { getOpenInvoices, getSubscriptionsByParty, getHaasAssets } from "@/lib/erpnext";
import { SERVICES } from "@/lib/services";
import { checkHealth as pingHealth } from "@/lib/checkHealth";
import { ClientGroupCard } from "@/components/ops/ClientGroupCard";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";
export const revalidate = 0;

async function checkHealth(healthUrl: string, healthHost?: string): Promise<{ up: boolean; latency: number }> {
  const h = await pingHealth(healthUrl, healthHost, 4000);
  return { up: h.status === "up", latency: h.latency };
}

export default async function OpsPage() {
  const user = await getUser();
  if (!user.canOps) redirect("/");

  const [
    { groups, error: trmmErr },
    { invoices: arInvoices },
    { byParty: subsByParty },
    { assets: haasAssets },
    stackResults,
  ] = await Promise.all([
    getClientGroups(),
    getOpenInvoices(),
    getSubscriptionsByParty(),
    getHaasAssets(),
    Promise.all(SERVICES.map(async (svc) => {
      const h = await checkHealth(svc.healthUrl, svc.healthHost);
      return { ...svc, ...h };
    })),
  ]);

  // Per-customer overdue invoice count
  const overdueByCustomer: Record<string, number> = {};
  const now = Date.now();
  for (const inv of arInvoices) {
    if (new Date(inv.due_date).getTime() < now) {
      overdueByCustomer[inv.customer] = (overdueByCustomer[inv.customer] || 0) + 1;
    }
  }

  // Health score per client group
  function computeHealth(group: (typeof groups)[0]): "green" | "amber" | "red" {
    const offlineRatio = group.agents.length > 0 ? group.offline / group.agents.length : 0;
    const criticalAlerts = group.alerts.filter((a) => a.severity?.toLowerCase() === "critical").length;
    const clientOverdue = Object.entries(overdueByCustomer).find(([k]) => k.toLowerCase().includes(group.client_name.toLowerCase()));
    const hasOverdue = clientOverdue && clientOverdue[1] > 0;
    if (criticalAlerts > 0 || offlineRatio > 0.5 || (hasOverdue && group.alerts.length > 2)) return "red";
    if (group.offline > 0 || group.alerts.length > 0 || hasOverdue) return "amber";
    return "green";
  }

  // Alert severity summary across all clients
  const allAlerts = groups.flatMap((g) => g.alerts);
  const sevCount = { critical: 0, high: 0, warning: 0, info: 0 };
  for (const a of allAlerts) {
    const s = (a.severity || "info").toLowerCase() as keyof typeof sevCount;
    if (s in sevCount) sevCount[s]++;
  }

  const stackUp = stackResults.filter((s) => s.up).length;

  // HaaS asset age in months
  function assetAgeMonths(purchaseDate: string): number {
    if (!purchaseDate) return 0;
    return Math.floor((Date.now() - new Date(purchaseDate).getTime()) / (30 * 86_400_000));
  }

  return (
    <div style={{ padding: "28px 32px", maxWidth: "1400px", margin: "0 auto" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "24px", flexWrap: "wrap", gap: "12px" }}>
        <div>
          <h1 style={{ margin: "0 0 4px", fontSize: "22px", fontWeight: 700, color: "#f1f5f9" }}>Operations / SOC</h1>
          <p style={{ margin: 0, color: "#64748b", fontSize: "13px" }}>
            Client health · Alert monitoring · Device management · Stack status
          </p>
        </div>
        <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
          <a
            href="/ops/email-onboard"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "8px",
              padding: "10px 18px",
              background: "#0f766e",
              border: "none",
              borderRadius: "8px",
              color: "#fff",
              fontSize: "13px",
              fontWeight: 700,
              textDecoration: "none",
              flexShrink: 0,
            }}
          >
            ✉ Email domain onboard
          </a>
          <a
            href="/ops/onboarding"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "8px",
              padding: "10px 18px",
              background: "#C07810",
              border: "none",
              borderRadius: "8px",
              color: "#fff",
              fontSize: "13px",
              fontWeight: 700,
              textDecoration: "none",
              flexShrink: 0,
            }}
          >
            ＋ Onboard New Customer
          </a>
        </div>
      </div>

      {/* ── Alert Summary Bar ─────────────────────────────────────────────── */}
      <div style={{ background: "#1e293b", border: "1px solid #334155", borderRadius: "10px", padding: "14px 20px", display: "flex", gap: "20px", alignItems: "center", marginBottom: "24px", flexWrap: "wrap" }}>
        <span style={{ fontSize: "13px", fontWeight: 600, color: "#94a3b8" }}>Active Alerts:</span>
        {[
          { key: "critical", label: "Critical", color: "#f87171" },
          { key: "high", label: "High", color: "#fb923c" },
          { key: "warning", label: "Warning", color: "#fbbf24" },
          { key: "info", label: "Info", color: "#60a5fa" },
        ].map(({ key, label, color }) => {
          const count = sevCount[key as keyof typeof sevCount];
          return (
            <div key={key} style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <span style={{ display: "inline-block", width: "8px", height: "8px", borderRadius: "50%", background: color, boxShadow: count > 0 && key === "critical" ? `0 0 6px ${color}` : "none" }} />
              <span style={{ fontSize: "13px", color: count > 0 ? color : "#475569", fontWeight: count > 0 ? 600 : 400 }}>
                {count} {label}
              </span>
            </div>
          );
        })}
        {allAlerts.length === 0 && <span style={{ fontSize: "13px", color: "#34d399" }}>✅ All clients clear</span>}
        <div style={{ marginLeft: "auto", fontSize: "12px", color: "#475569" }}>
          {groups.length} clients · {groups.reduce((s, g) => s + g.agents.length, 0)} agents
        </div>
      </div>

      {trmmErr && (
        <div style={{ background: "#1e293b", border: "1px solid #f8717144", borderRadius: "10px", padding: "16px", color: "#f87171", fontSize: "13px", marginBottom: "16px" }}>
          ⚠ TRMM: {trmmErr}
        </div>
      )}

      {/* ── Customer Health Overview ────────────────────────────────────── */}
      <section style={{ marginBottom: "28px" }}>
        <h2 style={{ margin: "0 0 14px", fontSize: "16px", fontWeight: 600, color: "#e2e8f0" }}>
          📊 Customer Health Overview
        </h2>
        <div style={{ background: "#1e293b", border: "1px solid #334155", borderRadius: "10px", overflow: "hidden" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
            <thead>
              <tr style={{ borderBottom: "1px solid #334155" }}>
                {["Client", "Status", "Devices", "Alerts", "Overdue Invoices", "Health Score"].map((h) => (
                  <th key={h} style={{ padding: "10px 14px", textAlign: "left", color: "#64748b", fontWeight: 500, fontSize: "11px", textTransform: "uppercase" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {groups.map((group) => {
                const health = computeHealth(group);
                const hColor = health === "green" ? "#34d399" : health === "amber" ? "#fbbf24" : "#f87171";
                const clientOverdue = Object.entries(overdueByCustomer).find(([k]) => k.toLowerCase().includes(group.client_name.toLowerCase()));
                const overdueCount = clientOverdue ? clientOverdue[1] : 0;
                return (
                  <tr key={group.client_name} style={{ borderBottom: "1px solid #0f172a" }}>
                    <td style={{ padding: "10px 14px", color: "#e2e8f0", fontWeight: 600 }}>{group.client_name}</td>
                    <td style={{ padding: "10px 14px" }}>
                      <div style={{ display: "flex", gap: "4px" }}>
                        {group.offline > 0 && <span style={{ fontSize: "11px", padding: "1px 6px", borderRadius: "999px", background: "#f8717122", color: "#f87171", border: "1px solid #f8717144" }}>{group.offline} offline</span>}
                        {group.offline === 0 && <span style={{ fontSize: "11px", color: "#34d399" }}>✓ All online</span>}
                      </div>
                    </td>
                    <td style={{ padding: "10px 14px", color: "#94a3b8" }}>{group.agents.length}</td>
                    <td style={{ padding: "10px 14px", color: group.alerts.length > 0 ? "#fbbf24" : "#34d399" }}>
                      {group.alerts.length > 0 ? `⚠ ${group.alerts.length}` : "✓ None"}
                    </td>
                    <td style={{ padding: "10px 14px", color: overdueCount > 0 ? "#fb923c" : "#34d399" }}>
                      {overdueCount > 0 ? `💳 ${overdueCount}` : "✓ Current"}
                    </td>
                    <td style={{ padding: "10px 14px" }}>
                      <span style={{ fontSize: "11px", padding: "2px 10px", borderRadius: "999px", background: `${hColor}22`, color: hColor, border: `1px solid ${hColor}44`, fontWeight: 600 }}>
                        {health === "green" ? "Healthy" : health === "amber" ? "Needs Attention" : "At Risk"}
                      </span>
                    </td>
                  </tr>
                );
              })}
              {groups.length === 0 && (
                <tr>
                  <td colSpan={6} style={{ padding: "24px", textAlign: "center", color: "#475569" }}>No clients in Tactical RMM</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* ── Client Group Cards with expandable agents ──────────────────── */}
      <section style={{ marginBottom: "32px" }}>
        <h2 style={{ margin: "0 0 14px", fontSize: "16px", fontWeight: 600, color: "#e2e8f0" }}>
          🏢 Client Devices
          <span style={{ fontSize: "12px", fontWeight: 400, color: "#475569", marginLeft: "8px" }}>Click an agent row to expand device detail</span>
        </h2>

        {groups.length === 0 && !trmmErr && (
          <div style={{ background: "#1e293b", border: "1px solid #334155", borderRadius: "10px", padding: "24px", textAlign: "center", color: "#475569", fontSize: "13px" }}>
            No clients found in Tactical RMM
          </div>
        )}

        {groups.map((group) => {
          const health = computeHealth(group);
          const clientName = group.client_name.toLowerCase();
          const matchedParty = Object.keys(subsByParty).find((k) => k.toLowerCase().includes(clientName));
          const subs = matchedParty ? subsByParty[matchedParty] : [];
          const overdueEntry = Object.entries(overdueByCustomer).find(([k]) => k.toLowerCase().includes(clientName));
          const overdueCount = overdueEntry ? overdueEntry[1] : 0;
          return (
            <ClientGroupCard
              key={group.client_name}
              group={group}
              subscriptions={subs}
              overdueInvoiceCount={overdueCount}
              healthScore={health}
            />
          );
        })}
      </section>

      {/* ── HaaS Device Lifecycle ─────────────────────────────────────────── */}
      <section style={{ marginBottom: "32px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px" }}>
          <h2 style={{ margin: 0, fontSize: "16px", fontWeight: 600, color: "#e2e8f0" }}>📦 HaaS Device Lifecycle</h2>
          <a href="https://ops.kecktech.net/app/asset" target="_blank" rel="noopener noreferrer" style={{ fontSize: "12px", color: "#3b82f6" }}>
            Manage in ERPNext ↗
          </a>
        </div>
        {haasAssets.length === 0 && (
          <div style={{ background: "#1e293b", border: "1px solid #334155", borderRadius: "10px", padding: "24px", textAlign: "center", color: "#475569", fontSize: "13px" }}>
            No HaaS assets found — <a href="https://ops.kecktech.net/app/asset/new" target="_blank" rel="noopener noreferrer" style={{ color: "#3b82f6" }}>Record one ↗</a>
          </div>
        )}
        {haasAssets.length > 0 && (
          <div style={{ background: "#1e293b", border: "1px solid #334155", borderRadius: "10px", overflow: "hidden" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
              <thead>
                <tr style={{ borderBottom: "1px solid #334155" }}>
                  {["Asset", "Customer", "Purchase Date", "Age", "Status", "Lifecycle Flag"].map((h) => (
                    <th key={h} style={{ padding: "10px 14px", textAlign: "left", color: "#64748b", fontWeight: 500, fontSize: "11px", textTransform: "uppercase" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {haasAssets.map((asset) => {
                  const ageMo = assetAgeMonths(asset.purchase_date);
                  const ageFlag = ageMo > 48 ? "red" : ageMo > 36 ? "amber" : "green";
                  const flagColor = ageFlag === "red" ? "#f87171" : ageFlag === "amber" ? "#fbbf24" : "#34d399";
                  const flagLabel = ageFlag === "red" ? "Replace Soon" : ageFlag === "amber" ? "Aging" : "Good";
                  return (
                    <tr key={asset.name} style={{ borderBottom: "1px solid #0f172a" }}>
                      <td style={{ padding: "10px 14px" }}>
                        <a href={`https://ops.kecktech.net/app/asset/${asset.name}`} target="_blank" rel="noopener noreferrer" style={{ color: "#3b82f6", textDecoration: "none" }}>
                          {asset.asset_name}
                        </a>
                      </td>
                      <td style={{ padding: "10px 14px", color: "#e2e8f0" }}>{asset.customer || "—"}</td>
                      <td style={{ padding: "10px 14px", color: "#94a3b8" }}>{asset.purchase_date || "—"}</td>
                      <td style={{ padding: "10px 14px", color: "#94a3b8" }}>{ageMo > 0 ? `${ageMo}mo` : "—"}</td>
                      <td style={{ padding: "10px 14px" }}>
                        <span style={{ fontSize: "11px", padding: "2px 8px", borderRadius: "999px", background: "#60a5fa22", color: "#60a5fa", border: "1px solid #60a5fa44" }}>
                          {asset.status}
                        </span>
                      </td>
                      <td style={{ padding: "10px 14px" }}>
                        <span style={{ fontSize: "11px", padding: "2px 10px", borderRadius: "999px", background: `${flagColor}22`, color: flagColor, border: `1px solid ${flagColor}44`, fontWeight: 600 }}>
                          {flagLabel}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* ── Stack Health ──────────────────────────────────────────────────── */}
      <section>
        <h2 style={{ margin: "0 0 14px", fontSize: "16px", fontWeight: 600, color: "#e2e8f0" }}>
          🖥️ Stack Health — {stackUp}/{SERVICES.length} up
        </h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: "10px" }}>
          {stackResults.map((svc) => (
            <a
              key={svc.name}
              href={svc.url}
              target="_blank"
              rel="noopener noreferrer"
              style={{ display: "flex", alignItems: "center", gap: "10px", background: "#1e293b", border: `1px solid ${svc.up ? "#334155" : "#f8717144"}`, borderRadius: "8px", padding: "10px 14px", textDecoration: "none", color: "inherit" }}
            >
              <span style={{ display: "inline-block", width: "8px", height: "8px", borderRadius: "50%", background: svc.up ? "#34d399" : "#f87171", flexShrink: 0 }} />
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: "13px", fontWeight: 600, color: "#e2e8f0" }}>{svc.name}</div>
                <div style={{ fontSize: "11px", color: svc.up ? "#475569" : "#f87171" }}>{svc.up ? `${svc.latency}ms` : "Down"}</div>
              </div>
            </a>
          ))}
        </div>
      </section>
    </div>
  );
}
