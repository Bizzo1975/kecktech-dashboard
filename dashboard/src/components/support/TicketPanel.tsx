"use client";

import { useState, useTransition } from "react";
import type { ZammadTicket } from "@/lib/zammad";
import { useRemoteSessionRequest } from "./RustDeskPanel";

const PRIORITY_COLOR: Record<string, string> = {
  high: "#f87171",
  normal: "#fbbf24",
  low: "#64748b",
};

const STATE_OPTIONS = [
  { id: 1, label: "New" },
  { id: 2, label: "Open" },
  { id: 3, label: "Pending" },
  { id: 4, label: "Closed" },
  { id: 7, label: "Pending Close" },
];

const PRIORITY_OPTIONS = [
  { id: 1, label: "Low" },
  { id: 2, label: "Normal" },
  { id: 3, label: "High" },
];

function elapsed(hours: number): string {
  if (hours < 1) return "< 1 hr";
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

function Badge({ label, color }: { label: string; color: string }) {
  return (
    <span
      style={{
        display: "inline-block",
        padding: "2px 8px",
        borderRadius: "999px",
        fontSize: "11px",
        fontWeight: 600,
        background: `${color}22`,
        color,
        border: `1px solid ${color}44`,
      }}
    >
      {label}
    </span>
  );
}

type Article = {
  id: number;
  body: string;
  from: string;
  created_at: string;
  internal: boolean;
};

function TicketRow({ ticket }: { ticket: ZammadTicket }) {
  const [expanded, setExpanded] = useState(false);
  const [articles, setArticles] = useState<Article[]>([]);
  const [loadingArticles, setLoadingArticles] = useState(false);
  const [reply, setReply] = useState("");
  const [isInternal, setIsInternal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [replyError, setReplyError] = useState("");
  const [stateId, setStateId] = useState(ticket.state_id);
  const [, startTransition] = useTransition();
  const { sending: rdSending, sent: rdSent, reqError: rdError, triggerRequest } = useRemoteSessionRequest();

  const priorityColor = PRIORITY_COLOR[ticket.priority] || "#64748b";
  const stateColor = stateId <= 2 ? "#34d399" : "#94a3b8";

  async function handleExpand() {
    if (expanded) {
      setExpanded(false);
      return;
    }
    setExpanded(true);
    if (articles.length === 0) {
      setLoadingArticles(true);
      try {
        const res = await fetch(`/api/tickets/${ticket.id}`);
        const data = await res.json();
        setArticles(data.ticket?.articles ?? []);
      } catch {
        // silently ignore
      } finally {
        setLoadingArticles(false);
      }
    }
  }

  async function handleReply() {
    if (!reply.trim()) return;
    setSubmitting(true);
    setReplyError("");
    try {
      const res = await fetch(`/api/tickets/${ticket.id}/reply`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body: reply, internal: isInternal }),
      });
      const data = await res.json();
      if (!res.ok) {
        setReplyError(data.error || "Failed to send reply");
      } else {
        setArticles((prev) => [
          ...prev,
          {
            id: data.id,
            body: reply,
            from: "You",
            created_at: new Date().toISOString(),
            internal: isInternal,
          },
        ]);
        setReply("");
      }
    } catch (e) {
      setReplyError(String(e));
    } finally {
      setSubmitting(false);
    }
  }

  async function handleStateChange(newStateId: number) {
    setStateId(newStateId);
    startTransition(async () => {
      await fetch(`/api/tickets/${ticket.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ state_id: newStateId }),
      });
    });
  }

  // SLA countdown based on priority
  const slaHours: Record<string, number> = { high: 4, normal: 24, low: 72 };
  const slaLimit = slaHours[ticket.priority] ?? 24;
  const remaining = slaLimit - ticket.elapsedHours;
  const slaColor = remaining < 0 ? "#f87171" : remaining < slaLimit * 0.25 ? "#fbbf24" : "#34d399";
  const slaLabel = remaining < 0 ? `SLA +${Math.abs(remaining)}h overdue` : `${remaining}h SLA remaining`;

  return (
    <div
      style={{
        background: "#1e293b",
        border: "1px solid #334155",
        borderLeft: ticket.priority === "high" ? "4px solid #f87171" : "1px solid #334155",
        borderRadius: "10px",
        marginBottom: "8px",
        overflow: "hidden",
      }}
    >
      {/* Header row — always visible */}
      <div
        onClick={handleExpand}
        style={{ padding: "12px 16px", cursor: "pointer", userSelect: "none" }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "4px" }}>
          <span style={{ fontSize: "14px", fontWeight: 600, color: "#f1f5f9" }}>
            #{ticket.number} {ticket.title}
          </span>
          <div style={{ display: "flex", gap: "6px", alignItems: "center", flexShrink: 0, marginLeft: "8px" }}>
            <Badge label={STATE_OPTIONS.find(s => s.id === stateId)?.label ?? ticket.state} color={stateColor} />
            <Badge label={ticket.priority} color={priorityColor} />
            <span style={{ fontSize: "11px", color: "#475569" }}>{elapsed(ticket.elapsedHours)}</span>
            <span style={{ fontSize: "12px", color: "#64748b" }}>{expanded ? "▲" : "▼"}</span>
          </div>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ fontSize: "12px", color: "#64748b" }}>
            {ticket.customerName}{ticket.customerEmail ? ` · ${ticket.customerEmail}` : ""}{ticket.group ? ` · ${ticket.group}` : ""}
          </span>
          <span style={{ fontSize: "11px", color: slaColor, fontWeight: 600 }}>{slaLabel}</span>
        </div>
      </div>

      {/* Expanded detail */}
      {expanded && (
        <div style={{ borderTop: "1px solid #334155", padding: "14px 16px", background: "#0f172a" }}>
          {/* State + Priority controls */}
          <div style={{ display: "flex", gap: "10px", marginBottom: "14px", flexWrap: "wrap", alignItems: "center" }}>
            <select
              value={stateId}
              onChange={(e) => handleStateChange(Number(e.target.value))}
              style={{ background: "#1e293b", color: "#e2e8f0", border: "1px solid #334155", borderRadius: "6px", padding: "4px 8px", fontSize: "12px" }}
            >
              {STATE_OPTIONS.map((s) => (
                <option key={s.id} value={s.id}>{s.label}</option>
              ))}
            </select>
            <a
              href={`https://tickets.kecktech.net/#ticket/zoom/${ticket.id}`}
              target="_blank"
              rel="noopener noreferrer"
              style={{ fontSize: "12px", color: "#3b82f6", border: "1px solid #334155", borderRadius: "6px", padding: "4px 10px", textDecoration: "none" }}
            >
              Open in Zammad ↗
            </a>
            <a
              href="https://vault.kecktech.net"
              target="_blank"
              rel="noopener noreferrer"
              style={{ fontSize: "12px", color: "#94a3b8", border: "1px solid #334155", borderRadius: "6px", padding: "4px 10px", textDecoration: "none" }}
            >
              🔑 Vault
            </a>
            {/* RustDesk: Request Remote Session */}
            <button
              onClick={() => triggerRequest(ticket.id)}
              disabled={rdSending}
              title="Send RustDesk connection instructions to the customer via this ticket"
              style={{
                background: rdSent === ticket.id ? "#166534" : "#7c2d12",
                color: rdSent === ticket.id ? "#86efac" : "#fed7aa",
                border: "1px solid #334155",
                borderRadius: "6px",
                padding: "4px 10px",
                fontSize: "12px",
                fontWeight: 600,
                cursor: rdSending ? "not-allowed" : "pointer",
                opacity: rdSending ? 0.6 : 1,
                whiteSpace: "nowrap",
              }}
            >
              {rdSending ? "Sending…" : rdSent === ticket.id ? "✓ Sent Remote Request" : "🖥️ Request Remote Session"}
            </button>
            {rdError && (
              <span style={{ fontSize: "11px", color: "#f87171" }}>{rdError}</span>
            )}
          </div>

          {/* Article thread */}
          {loadingArticles && <div style={{ fontSize: "12px", color: "#475569", marginBottom: "12px" }}>Loading thread…</div>}
          {articles.map((a) => (
            <div
              key={a.id}
              style={{
                background: a.internal ? "#1c1a2e" : "#1e293b",
                border: `1px solid ${a.internal ? "#7c3aed44" : "#334155"}`,
                borderRadius: "8px",
                padding: "10px 12px",
                marginBottom: "8px",
                fontSize: "13px",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
                <span style={{ color: "#94a3b8", fontWeight: 600 }}>{a.from}</span>
                <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                  {a.internal && <Badge label="Internal Note" color="#7c3aed" />}
                  <span style={{ fontSize: "11px", color: "#475569" }}>
                    {new Date(a.created_at).toLocaleString("en-US", { timeZone: "America/Chicago" })}
                  </span>
                </div>
              </div>
              <div style={{ color: "#cbd5e1", whiteSpace: "pre-wrap", lineHeight: 1.5 }}
                dangerouslySetInnerHTML={{ __html: a.body.replace(/<[^>]+>/g, " ") }}
              />
            </div>
          ))}

          {/* Reply composer */}
          <div style={{ marginTop: "12px" }}>
            <textarea
              value={reply}
              onChange={(e) => setReply(e.target.value)}
              placeholder="Write a reply or internal note…"
              rows={3}
              style={{
                width: "100%",
                background: "#1e293b",
                border: "1px solid #334155",
                borderRadius: "8px",
                color: "#e2e8f0",
                padding: "10px",
                fontSize: "13px",
                resize: "vertical",
                boxSizing: "border-box",
              }}
            />
            {replyError && <div style={{ color: "#f87171", fontSize: "12px", marginTop: "4px" }}>{replyError}</div>}
            <div style={{ display: "flex", gap: "8px", marginTop: "8px", alignItems: "center" }}>
              <button
                onClick={handleReply}
                disabled={submitting || !reply.trim()}
                style={{
                  background: isInternal ? "#7c3aed" : "#C07810",
                  color: "#fff",
                  border: "none",
                  borderRadius: "6px",
                  padding: "7px 16px",
                  fontSize: "13px",
                  fontWeight: 600,
                  cursor: submitting ? "not-allowed" : "pointer",
                  opacity: submitting || !reply.trim() ? 0.6 : 1,
                }}
              >
                {submitting ? "Sending…" : isInternal ? "Add Internal Note" : "Send Reply"}
              </button>
              <label style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "12px", color: "#94a3b8", cursor: "pointer" }}>
                <input
                  type="checkbox"
                  checked={isInternal}
                  onChange={(e) => setIsInternal(e.target.checked)}
                />
                Internal only
              </label>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export function TicketPanel({ tickets }: { tickets: ZammadTicket[] }) {
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newBody, setNewBody] = useState("");
  const [newGroup, setNewGroup] = useState("MSP Support");
  const [newEmail, setNewEmail] = useState("");
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState("");
  const [created, setCreated] = useState<number | null>(null);

  async function handleCreate() {
    if (!newTitle.trim() || !newBody.trim() || !newEmail.trim()) return;
    setCreating(true);
    setCreateError("");
    try {
      const res = await fetch("/api/tickets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: newTitle, body: newBody, groupName: newGroup, customerEmail: newEmail }),
      });
      const data = await res.json();
      if (!res.ok) {
        setCreateError(data.error || "Failed to create ticket");
      } else {
        setCreated(data.id);
        setNewTitle("");
        setNewBody("");
        setNewEmail("");
        setShowCreateForm(false);
      }
    } catch (e) {
      setCreateError(String(e));
    } finally {
      setCreating(false);
    }
  }

  const GROUPS = ["MSP Support", "HaaS", "Senior Care", "Internal"];

  return (
    <section>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
        <h2 style={{ margin: 0, fontSize: "15px", fontWeight: 600, color: "#e2e8f0" }}>
          🎧 Open Tickets {tickets.length > 0 && `(${tickets.length})`}
        </h2>
        <div style={{ display: "flex", gap: "8px" }}>
          {created && (
            <a
              href={`https://tickets.kecktech.net/#ticket/zoom/${created}`}
              target="_blank"
              rel="noopener noreferrer"
              style={{ fontSize: "12px", color: "#34d399" }}
            >
              ✓ Created #{created}
            </a>
          )}
          <button
            onClick={() => setShowCreateForm(!showCreateForm)}
            style={{
              background: "#C07810",
              color: "#fff",
              border: "none",
              borderRadius: "6px",
              padding: "5px 12px",
              fontSize: "12px",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            + New Ticket
          </button>
          <a href="https://tickets.kecktech.net" target="_blank" rel="noopener noreferrer"
            style={{ fontSize: "12px", color: "#3b82f6" }}>Zammad ↗</a>
        </div>
      </div>

      {/* Create ticket form */}
      {showCreateForm && (
        <div style={{ background: "#1e293b", border: "1px solid #334155", borderRadius: "10px", padding: "16px", marginBottom: "12px" }}>
          <h3 style={{ margin: "0 0 12px", fontSize: "13px", fontWeight: 600, color: "#e2e8f0" }}>Create New Ticket</h3>
          <input
            type="text"
            placeholder="Subject"
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            style={{ width: "100%", background: "#0f172a", border: "1px solid #334155", borderRadius: "6px", color: "#e2e8f0", padding: "8px", fontSize: "13px", marginBottom: "8px", boxSizing: "border-box" }}
          />
          <input
            type="email"
            placeholder="Customer email"
            value={newEmail}
            onChange={(e) => setNewEmail(e.target.value)}
            style={{ width: "100%", background: "#0f172a", border: "1px solid #334155", borderRadius: "6px", color: "#e2e8f0", padding: "8px", fontSize: "13px", marginBottom: "8px", boxSizing: "border-box" }}
          />
          <select
            value={newGroup}
            onChange={(e) => setNewGroup(e.target.value)}
            style={{ width: "100%", background: "#0f172a", border: "1px solid #334155", borderRadius: "6px", color: "#e2e8f0", padding: "8px", fontSize: "13px", marginBottom: "8px", boxSizing: "border-box" }}
          >
            {GROUPS.map((g) => <option key={g} value={g}>{g}</option>)}
          </select>
          <textarea
            placeholder="Description…"
            value={newBody}
            onChange={(e) => setNewBody(e.target.value)}
            rows={3}
            style={{ width: "100%", background: "#0f172a", border: "1px solid #334155", borderRadius: "6px", color: "#e2e8f0", padding: "8px", fontSize: "13px", resize: "vertical", boxSizing: "border-box" }}
          />
          {createError && <div style={{ color: "#f87171", fontSize: "12px", marginTop: "4px" }}>{createError}</div>}
          <div style={{ display: "flex", gap: "8px", marginTop: "10px" }}>
            <button
              onClick={handleCreate}
              disabled={creating}
              style={{ background: "#C07810", color: "#fff", border: "none", borderRadius: "6px", padding: "7px 16px", fontSize: "13px", fontWeight: 600, cursor: creating ? "not-allowed" : "pointer", opacity: creating ? 0.6 : 1 }}
            >
              {creating ? "Creating…" : "Create Ticket"}
            </button>
            <button
              onClick={() => setShowCreateForm(false)}
              style={{ background: "transparent", color: "#64748b", border: "1px solid #334155", borderRadius: "6px", padding: "7px 12px", fontSize: "13px", cursor: "pointer" }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {tickets.length === 0 && (
        <div style={{ background: "#1e293b", border: "1px solid #334155", borderRadius: "10px", padding: "24px", textAlign: "center", color: "#475569", fontSize: "13px" }}>
          ✅ No open tickets
        </div>
      )}
      {tickets.map((t) => <TicketRow key={t.id} ticket={t} />)}
    </section>
  );
}
