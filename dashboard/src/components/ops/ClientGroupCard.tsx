"use client";

import { useState } from "react";
import type { ClientGroup, TRMMAgent, TRMMAlert } from "@/lib/trmm";

const SEV_COLOR: Record<string, string> = {
  critical: "#f87171",
  high: "#fb923c",
  warning: "#fbbf24",
  info: "#60a5fa",
};

type AgentDetail = {
  id: number;
  hostname: string;
  operating_system: string;
  status: string;
  total_ram_mb?: number;
  used_ram_mb?: number;
  cpu_model?: string;
  patches_pending?: number;
  disks?: Array<{ free: number; total: number; device: string }>;
  last_seen: string;
};

function AgentRow({ agent, alerts }: { agent: TRMMAgent; alerts: TRMMAlert[] }) {
  const [expanded, setExpanded] = useState(false);
  const [detail, setDetail] = useState<AgentDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [ticketCreated, setTicketCreated] = useState<Record<number, number>>({});
  const [creating, setCreating] = useState<Record<number, boolean>>({});

  const online = agent.status === "online";
  const agentAlerts = alerts.filter((a) => a.hostname === agent.hostname);
  const agentColor = online && agentAlerts.length === 0 ? "#34d399" : online && agentAlerts.length > 0 ? "#fbbf24" : "#f87171";

  async function handleExpand() {
    if (expanded) { setExpanded(false); return; }
    setExpanded(true);
    if (!detail) {
      setLoading(true);
      try {
        const res = await fetch(`/api/devices/${agent.id}`);
        const data = await res.json();
        setDetail(data.agent);
      } catch { /* ignore */ }
      finally { setLoading(false); }
    }
  }

  async function createTicketFromAlert(alert: TRMMAlert) {
    setCreating((p) => ({ ...p, [alert.id]: true }));
    try {
      const res = await fetch(`/api/alerts/${alert.id}/ticket`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          hostname: alert.hostname,
          message: alert.message,
          severity: alert.severity,
          alert_type: alert.alert_type,
        }),
      });
      const data = await res.json();
      if (res.ok) setTicketCreated((p) => ({ ...p, [alert.id]: data.ticketId }));
    } catch { /* ignore */ }
    finally { setCreating((p) => ({ ...p, [alert.id]: false })); }
  }

  const diskUsage = detail?.disks?.[0]
    ? Math.round(((detail.disks[0].total - detail.disks[0].free) / detail.disks[0].total) * 100)
    : null;
  const ramUsage = detail?.total_ram_mb && detail?.used_ram_mb
    ? Math.round((detail.used_ram_mb / detail.total_ram_mb) * 100)
    : null;

  return (
    <div style={{ borderBottom: "1px solid #0f172a" }}>
      <div
        onClick={handleExpand}
        style={{ display: "flex", alignItems: "center", gap: "12px", padding: "8px 0", cursor: "pointer", flexWrap: "wrap" }}
      >
        <span style={{ display: "inline-block", width: "7px", height: "7px", borderRadius: "50%", background: agentColor, flexShrink: 0 }} />
        <span style={{ fontSize: "13px", fontWeight: 600, color: "#e2e8f0", minWidth: "160px" }}>{agent.hostname}</span>
        <span style={{ fontSize: "11px", color: "#475569", flex: 1, minWidth: "120px" }}>{agent.operating_system}</span>
        <span style={{ fontSize: "11px", color: online ? "#34d399" : "#f87171" }}>{agent.status}</span>
        {agentAlerts.length > 0 && (
          <span style={{ fontSize: "11px", color: "#fbbf24" }}>⚠ {agentAlerts.length} alert{agentAlerts.length > 1 ? "s" : ""}</span>
        )}
        {agent.pending_actions_count > 0 && (
          <span style={{ fontSize: "11px", color: "#a78bfa" }}>⏳ {agent.pending_actions_count} pending</span>
        )}
        <span style={{ fontSize: "11px", color: "#334155", marginLeft: "auto" }}>
          {agent.last_seen ? new Date(agent.last_seen).toLocaleString("en-US", { timeZone: "America/Chicago", dateStyle: "short", timeStyle: "short" }) : "—"}
        </span>
        <span style={{ fontSize: "11px", color: "#475569" }}>{expanded ? "▲" : "▼"}</span>
      </div>

      {expanded && (
        <div style={{ background: "#0f172a", borderRadius: "8px", padding: "12px", marginBottom: "8px", fontSize: "12px" }}>
          {loading && <div style={{ color: "#475569" }}>Loading device detail…</div>}
          {detail && (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "12px", marginBottom: "12px" }}>
              <div>
                <div style={{ color: "#64748b", marginBottom: "2px" }}>RAM Usage</div>
                <div style={{ color: ramUsage !== null ? (ramUsage > 85 ? "#f87171" : ramUsage > 60 ? "#fbbf24" : "#34d399") : "#475569", fontWeight: 600 }}>
                  {ramUsage !== null ? `${ramUsage}%` : "N/A"}
                  {detail.total_ram_mb ? ` (${Math.round(detail.total_ram_mb / 1024)}GB)` : ""}
                </div>
              </div>
              <div>
                <div style={{ color: "#64748b", marginBottom: "2px" }}>Disk (C:)</div>
                <div style={{ color: diskUsage !== null ? (diskUsage > 90 ? "#f87171" : diskUsage > 75 ? "#fbbf24" : "#34d399") : "#475569", fontWeight: 600 }}>
                  {diskUsage !== null ? `${diskUsage}% used` : "N/A"}
                </div>
              </div>
              <div>
                <div style={{ color: "#64748b", marginBottom: "2px" }}>Pending Patches</div>
                <div style={{ color: (detail.patches_pending ?? 0) > 10 ? "#fbbf24" : "#34d399", fontWeight: 600 }}>
                  {detail.patches_pending ?? 0}
                </div>
              </div>
              {detail.cpu_model && (
                <div style={{ gridColumn: "1 / -1" }}>
                  <div style={{ color: "#64748b", marginBottom: "2px" }}>CPU</div>
                  <div style={{ color: "#94a3b8" }}>{detail.cpu_model}</div>
                </div>
              )}
            </div>
          )}

          {/* Active alerts on this device */}
          {agentAlerts.length > 0 && (
            <div style={{ marginBottom: "8px" }}>
              <div style={{ color: "#64748b", marginBottom: "6px" }}>Active Alerts</div>
              {agentAlerts.map((alert) => {
                const color = SEV_COLOR[(alert.severity || "info").toLowerCase()] || "#94a3b8";
                return (
                  <div key={alert.id} style={{ display: "flex", alignItems: "center", gap: "8px", padding: "5px 8px", background: `${color}11`, border: `1px solid ${color}33`, borderRadius: "6px", marginBottom: "4px" }}>
                    <span style={{ color, fontWeight: 600, fontSize: "11px", minWidth: "60px" }}>{alert.severity}</span>
                    <span style={{ color: "#94a3b8", flex: 1 }}>{alert.message}</span>
                    {ticketCreated[alert.id] ? (
                      <a href={`https://tickets.kecktech.net/#ticket/zoom/${ticketCreated[alert.id]}`} target="_blank" rel="noopener noreferrer" style={{ fontSize: "11px", color: "#34d399", whiteSpace: "nowrap" }}>
                        ✓ #{ticketCreated[alert.id]}
                      </a>
                    ) : (
                      <button
                        onClick={(e) => { e.stopPropagation(); createTicketFromAlert(alert); }}
                        disabled={creating[alert.id]}
                        style={{ background: "transparent", border: "1px solid #334155", borderRadius: "4px", color: "#94a3b8", fontSize: "11px", padding: "2px 8px", cursor: "pointer", whiteSpace: "nowrap" }}
                      >
                        {creating[alert.id] ? "…" : "→ Ticket"}
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          <div style={{ display: "flex", gap: "8px" }}>
            <a
              href={`https://rmm.kecktech.net/agents/${agent.id}`}
              target="_blank"
              rel="noopener noreferrer"
              style={{ fontSize: "11px", color: "#3b82f6", border: "1px solid #334155", borderRadius: "4px", padding: "3px 8px", textDecoration: "none" }}
            >
              Open in TRMM ↗
            </a>
            <a
              href="https://vault.kecktech.net"
              target="_blank"
              rel="noopener noreferrer"
              style={{ fontSize: "11px", color: "#64748b", border: "1px solid #334155", borderRadius: "4px", padding: "3px 8px", textDecoration: "none" }}
            >
              🔑 Vault
            </a>
          </div>
        </div>
      )}
    </div>
  );
}

type SubscriptionInfo = { name: string; plans: string; mrr: number };

export function ClientGroupCard({
  group,
  subscriptions,
  overdueInvoiceCount,
  healthScore,
}: {
  group: ClientGroup;
  subscriptions?: SubscriptionInfo[];
  overdueInvoiceCount?: number;
  healthScore: "green" | "amber" | "red";
}) {
  const hasIssue = group.offline > 0 || group.alerts.length > 0;
  const allOnline = group.offline === 0 && group.alerts.length === 0;
  const borderColor = hasIssue
    ? group.alerts.some((a) => a.severity?.toLowerCase() === "critical") ? "#f87171" : "#fbbf24"
    : "#334155";
  const statusDot = allOnline ? "#34d399" : hasIssue ? "#f87171" : "#fbbf24";
  const healthColor = healthScore === "green" ? "#34d399" : healthScore === "amber" ? "#fbbf24" : "#f87171";

  return (
    <div style={{ background: "#1e293b", border: `1px solid ${borderColor}`, borderRadius: "10px", marginBottom: "10px", overflow: "hidden" }}>
      {/* Header */}
      <div style={{ padding: "12px 16px", display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid #1e293b", flexWrap: "wrap", gap: "8px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <span style={{ display: "inline-block", width: "10px", height: "10px", borderRadius: "50%", background: statusDot, flexShrink: 0 }} />
          <span style={{ fontSize: "14px", fontWeight: 700, color: "#f1f5f9" }}>{group.client_name}</span>
          <span style={{ fontSize: "11px", padding: "1px 6px", borderRadius: "999px", background: `${healthColor}22`, color: healthColor, border: `1px solid ${healthColor}44` }}>
            {healthScore === "green" ? "Healthy" : healthScore === "amber" ? "Needs Attention" : "At Risk"}
          </span>
        </div>
        <div style={{ display: "flex", gap: "10px", alignItems: "center", fontSize: "12px" }}>
          <span style={{ color: "#34d399" }}>{group.online} online</span>
          {group.offline > 0 && <span style={{ color: "#f87171" }}>{group.offline} offline</span>}
          {group.alerts.length > 0 && <span style={{ color: "#fbbf24" }}>{group.alerts.length} alerts</span>}
          {overdueInvoiceCount != null && overdueInvoiceCount > 0 && (
            <span style={{ color: "#fb923c" }}>💳 {overdueInvoiceCount} overdue</span>
          )}
        </div>
      </div>

      {/* Agent rows */}
      <div style={{ padding: "4px 16px 8px" }}>
        {group.agents.map((agent) => (
          <AgentRow key={agent.id} agent={agent} alerts={group.alerts} />
        ))}
      </div>

      {/* Subscriptions */}
      {subscriptions && subscriptions.length > 0 && (
        <div style={{ borderTop: "1px solid #0f172a", padding: "10px 16px", display: "flex", gap: "10px", alignItems: "center", flexWrap: "wrap" }}>
          <span style={{ fontSize: "11px", color: "#64748b" }}>Subscriptions:</span>
          {subscriptions.map((sub) => (
            <span key={sub.name} style={{ fontSize: "11px", padding: "1px 8px", borderRadius: "999px", background: "#a78bfa22", color: "#a78bfa", border: "1px solid #a78bfa44" }}>
              {sub.name}
            </span>
          ))}
          <a
            href={`https://ops.kecktech.net/app/subscription/new`}
            target="_blank"
            rel="noopener noreferrer"
            style={{ fontSize: "11px", color: "#C07810", textDecoration: "none", marginLeft: "auto" }}
          >
            + Add Service ↗
          </a>
        </div>
      )}
    </div>
  );
}
