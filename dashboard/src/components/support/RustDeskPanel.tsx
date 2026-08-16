"use client";

import { useState, useEffect } from "react";

type RustDeskInfo = {
  serverHost: string;
  publicKey: string;
  idPort: number;
  relayPort: number;
  downloadUrl: string;
  configured: boolean;
};

function CopyButton({ text, label }: { text: string; label: string }) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback: select text in an input
    }
  }

  return (
    <button
      onClick={handleCopy}
      title={`Copy ${label}`}
      style={{
        background: copied ? "#166534" : "#1e3a5f",
        color: copied ? "#86efac" : "#94a3b8",
        border: "1px solid #334155",
        borderRadius: "4px",
        padding: "2px 8px",
        fontSize: "11px",
        cursor: "pointer",
        whiteSpace: "nowrap",
        transition: "all 0.15s",
      }}
    >
      {copied ? "✓ Copied" : "Copy"}
    </button>
  );
}

function ConfigRow({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "6px 0", borderBottom: "1px solid #1e293b" }}>
      <span style={{ fontSize: "12px", color: "#64748b", minWidth: "80px" }}>{label}</span>
      <span style={{ fontSize: "12px", color: "#cbd5e1", fontFamily: "monospace", flex: 1, marginLeft: "8px", wordBreak: "break-all" }}>{value}</span>
      <CopyButton text={value} label={label} />
    </div>
  );
}

export function RustDeskPanel() {
  const [info, setInfo] = useState<RustDeskInfo | null>(null);
  const [error, setError] = useState("");
  const [copiedAll, setCopiedAll] = useState(false);

  useEffect(() => {
    fetch("/api/rustdesk/info")
      .then((r) => r.json())
      .then((d) => setInfo(d))
      .catch((e) => setError(String(e)));
  }, []);

  async function handleCopyAll() {
    if (!info?.configured) return;
    const text = `ID Server: ${info.serverHost}\nRelay Server: ${info.serverHost}\nKey: ${info.publicKey}`;
    try {
      await navigator.clipboard.writeText(text);
      setCopiedAll(true);
      setTimeout(() => setCopiedAll(false), 2500);
    } catch {
      // ignore
    }
  }

  return (
    <div
      style={{
        background: "#1e293b",
        border: "1px solid #334155",
        borderLeft: "4px solid #e05c28",
        borderRadius: "10px",
        padding: "14px 16px",
        marginBottom: "12px",
      }}
    >
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
        <h2 style={{ margin: 0, fontSize: "14px", fontWeight: 600, color: "#e2e8f0" }}>
          🖥️ RustDesk — Remote Access
        </h2>
        <a
          href="https://rustdesk.io/"
          target="_blank"
          rel="noopener noreferrer"
          style={{ fontSize: "12px", color: "#e05c28", textDecoration: "none", fontWeight: 600 }}
        >
          Download ↗
        </a>
      </div>

      {error && (
        <div style={{ fontSize: "12px", color: "#f87171", marginBottom: "8px" }}>
          Could not load RustDesk config: {error}
        </div>
      )}

      {!info && !error && (
        <div style={{ fontSize: "12px", color: "#475569" }}>Loading…</div>
      )}

      {info && !info.configured && (
        <div style={{ fontSize: "12px", color: "#fbbf24", padding: "8px", background: "#422006", borderRadius: "6px", marginBottom: "8px" }}>
          ⚠ Not configured — run{" "}
          <code style={{ fontSize: "11px", color: "#fde68a" }}>docker exec rustdesk-id cat /root/id_ed25519.pub</code>
          {" "}then set <code style={{ fontSize: "11px", color: "#fde68a" }}>RUSTDESK_SERVER_HOST</code> and{" "}
          <code style={{ fontSize: "11px", color: "#fde68a" }}>RUSTDESK_PUBLIC_KEY</code> in docker/.env
        </div>
      )}

      {info?.configured && (
        <>
          {/* Config rows */}
          <div style={{ background: "#0f172a", borderRadius: "6px", padding: "4px 10px", marginBottom: "10px" }}>
            <ConfigRow label="ID Server" value={info.serverHost} />
            <ConfigRow label="Relay" value={info.serverHost} />
            <ConfigRow label="Key" value={info.publicKey} />
            <ConfigRow label="ID Port" value={String(info.idPort)} />
            <ConfigRow label="Relay Port" value={String(info.relayPort)} />
          </div>

          {/* Copy-all button */}
          <button
            onClick={handleCopyAll}
            style={{
              width: "100%",
              background: copiedAll ? "#166534" : "#1E3A5F",
              color: copiedAll ? "#86efac" : "#e2e8f0",
              border: "1px solid #334155",
              borderRadius: "6px",
              padding: "8px",
              fontSize: "12px",
              fontWeight: 600,
              cursor: "pointer",
              transition: "all 0.15s",
            }}
          >
            {copiedAll ? "✓ Server Config Copied!" : "Copy Client Config (for Settings → Network)"}
          </button>
        </>
      )}

      {/* How to use note */}
      {info?.configured && (
        <div style={{ marginTop: "10px", fontSize: "11px", color: "#475569", lineHeight: 1.5 }}>
          Staff: paste config into RustDesk desktop app → Settings → Network → ID/Relay Server.
          Use <strong style={{ color: "#94a3b8" }}>Request Remote Session</strong> on any ticket to send instructions to the customer.
        </div>
      )}
    </div>
  );
}

/**
 * Standalone "Request Remote Session" action — can be called from TicketPanel rows.
 * Returns { sending, sent, error } state; call triggerRequest(ticketId) to fire.
 */
export function useRemoteSessionRequest() {
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState<number | null>(null);
  const [reqError, setReqError] = useState("");

  async function triggerRequest(ticketId: number) {
    setSending(true);
    setReqError("");
    try {
      // Fetch server config
      const infoRes = await fetch("/api/rustdesk/info");
      const info: RustDeskInfo = await infoRes.json();

      let note: string;
      if (!info.configured) {
        note =
          "Remote session requested, but RustDesk is not yet configured on this server. " +
          "Please contact your admin to set RUSTDESK_SERVER_HOST and RUSTDESK_PUBLIC_KEY in docker/.env.";
      } else {
        note = `--- Remote Support Session Request ---

To allow your Kecktech technician to access your device:

1. Download RustDesk (free): ${info.downloadUrl}

2. Install and open RustDesk, then go to Settings (gear icon) → Network → ID/Relay Server and enter:
   ID Server:    ${info.serverHost}
   Relay Server: ${info.serverHost}
   Key:          ${info.publicKey}

3. Share your 9-digit RustDesk ID (shown on the RustDesk main screen) as a reply to this ticket.

Your technician will connect — you will see a permission prompt. Click "Accept" to begin the session.`;
      }

      const replyRes = await fetch(`/api/tickets/${ticketId}/reply`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body: note, internal: false }),
      });

      if (!replyRes.ok) {
        const d = await replyRes.json();
        setReqError(d.error || "Failed to post session request");
      } else {
        setSent(ticketId);
        setTimeout(() => setSent(null), 4000);
      }
    } catch (e) {
      setReqError(String(e));
    } finally {
      setSending(false);
    }
  }

  return { sending, sent, reqError, triggerRequest };
}
