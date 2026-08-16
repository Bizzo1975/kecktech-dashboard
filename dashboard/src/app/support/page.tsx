import { getUser } from "@/lib/auth";
import { getOpenTickets, getActiveChats } from "@/lib/zammad";
import { getActiveAlerts } from "@/lib/trmm";
import { getCustomers } from "@/lib/erpnext";
import { TimeEntryForm } from "@/components/support/TimeEntryForm";
import { TicketPanel } from "@/components/support/TicketPanel";
import { AlertPanel } from "@/components/support/AlertPanel";
import { RustDeskPanel } from "@/components/support/RustDeskPanel";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function SupportPage() {
  const user = await getUser();
  if (!user.canSupport) redirect("/");

  const [
    { tickets, error: tErr },
    { alerts, error: aErr },
    { customers },
    { chats, error: chatErr },
  ] = await Promise.all([
    getOpenTickets(),
    getActiveAlerts(),
    getCustomers(),
    getActiveChats(),
  ]);

  return (
    <div style={{ padding: "28px 32px", maxWidth: "1600px", margin: "0 auto" }}>
      <h1 style={{ margin: "0 0 4px", fontSize: "22px", fontWeight: 700, color: "#f1f5f9" }}>
        Support Desk
      </h1>
      <p style={{ margin: "0 0 24px", color: "#64748b", fontSize: "13px" }}>
        Live monitoring · Inline tickets · Remote support · Time tracking
      </p>

      {/* Error banner for ticket fetch */}
      {tErr && (
        <div style={{ background: "#1e293b", border: "1px solid #f8717144", borderRadius: "8px", padding: "10px 16px", color: "#f87171", fontSize: "13px", marginBottom: "16px" }}>
          ⚠ Zammad: {tErr}
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "3fr 4.5fr 2.5fr", gap: "20px", alignItems: "start" }}>

        {/* ── Column 1: TRMM Alerts with create-ticket action ────────────── */}
        <AlertPanel alerts={alerts} error={aErr} />

        {/* ── Column 2: Expandable tickets with inline reply ─────────────── */}
        <TicketPanel tickets={tickets} />

        {/* ── Column 3: RustDesk + Chat + Time + Links ───────────────────── */}
        <section>
          {/* RustDesk remote access panel */}
          <RustDeskPanel />

          {/* Active chat sessions */}
          {chats.length > 0 && (
            <div
              style={{
                background: "#1e293b",
                border: "1px solid #334155",
                borderRadius: "10px",
                padding: "12px 16px",
                marginBottom: "12px",
              }}
            >
              <h2 style={{ margin: "0 0 8px", fontSize: "13px", fontWeight: 600, color: "#e2e8f0" }}>
                💬 Active Chats ({chats.length})
              </h2>
              {chats.map((c) => (
                <a
                  key={c.id}
                  href="https://tickets.kecktech.net/#chat"
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    display: "block",
                    padding: "6px 8px",
                    borderRadius: "6px",
                    fontSize: "12px",
                    color: "#cbd5e1",
                    textDecoration: "none",
                    background: "#0f172a",
                    border: "1px solid #1e293b",
                    marginBottom: "4px",
                  }}
                >
                  {c.name || `Chat #${c.id}`}
                </a>
              ))}
            </div>
          )}
          {chatErr && (
            <div style={{ fontSize: "12px", color: "#475569", marginBottom: "8px", padding: "8px", background: "#1e293b", borderRadius: "8px" }}>
              Chat not enabled
            </div>
          )}

          {/* Zammad chat iframe */}
          <div
            style={{
              background: "#1e293b",
              border: "1px solid #334155",
              borderRadius: "10px",
              overflow: "hidden",
              marginBottom: "16px",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 16px", borderBottom: "1px solid #334155" }}>
              <h2 style={{ margin: 0, fontSize: "14px", fontWeight: 600, color: "#e2e8f0" }}>
                💬 Live Chat — Zammad
              </h2>
              <a
                href="https://tickets.kecktech.net/#chat"
                target="_blank"
                rel="noopener noreferrer"
                style={{ fontSize: "12px", color: "#3b82f6", flexShrink: 0 }}
              >
                Open full view ↗
              </a>
            </div>
            <iframe
              src="https://tickets.kecktech.net/#chat"
              title="Zammad Live Chat"
              style={{
                width: "100%",
                height: "420px",
                border: "none",
                display: "block",
                background: "#0f172a",
              }}
              allow="same-origin"
            />
          </div>

          {/* Time Entry */}
          <div
            style={{
              background: "#1e293b",
              border: "1px solid #334155",
              borderRadius: "10px",
              padding: "16px",
              marginBottom: "16px",
            }}
          >
            <h2 style={{ margin: "0 0 14px", fontSize: "14px", fontWeight: 600, color: "#e2e8f0" }}>
              ⏱ Log Time
            </h2>
            <TimeEntryForm customers={customers} />
          </div>

          {/* Quick Links */}
          <div
            style={{
              background: "#1e293b",
              border: "1px solid #334155",
              borderRadius: "10px",
              padding: "16px",
            }}
          >
            <h2 style={{ margin: "0 0 12px", fontSize: "14px", fontWeight: 600, color: "#e2e8f0" }}>
              🔗 Quick Access
            </h2>
            <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
              {[
                { href: "https://rmm.kecktech.net", label: "Tactical RMM", icon: "🖥️" },
                { href: "https://tickets.kecktech.net", label: "Zammad (Tickets)", icon: "🎧" },
                { href: "https://vault.kecktech.net", label: "Vaultwarden (Client Profiles)", icon: "🔑" },
                { href: "https://ops.kecktech.net", label: "ERPNext (Timesheets)", icon: "📋" },
                { href: "https://help.kecktech.net/books/support-processes", label: "Support Processes", icon: "📖" },
              ].map((item) => (
                <a
                  key={item.href}
                  href={item.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    padding: "8px 10px",
                    borderRadius: "6px",
                    fontSize: "13px",
                    color: "#cbd5e1",
                    textDecoration: "none",
                    background: "#0f172a",
                    border: "1px solid #1e293b",
                  }}
                >
                  <span>{item.icon}</span>
                  {item.label}
                </a>
              ))}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
