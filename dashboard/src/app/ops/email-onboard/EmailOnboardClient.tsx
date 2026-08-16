"use client";

import { useCallback, useEffect, useState } from "react";

type DomainRow = {
  domain: string;
  primary: string;
  brandName: string;
  autoReply: boolean;
  newsletter: boolean;
  aliases: string[];
};

type OnboardResult = {
  ok: boolean;
  checklist?: string[];
  cli?: string;
  applyM365?: string;
  owa?: string;
  humanGates?: string[];
  aliases?: string[];
  registryPath?: string;
  error?: string;
};

export default function EmailOnboardPage() {
  const [domains, setDomains] = useState<DomainRow[]>([]);
  const [sharedMailbox, setSharedMailbox] = useState("support@kecktech.net");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<OnboardResult | null>(null);

  const [domain, setDomain] = useState("");
  const [primary, setPrimary] = useState("");
  const [brandName, setBrandName] = useState("");
  const [aliases, setAliases] = useState("info,noreply");
  const [autoReply, setAutoReply] = useState(true);
  const [newsletter, setNewsletter] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/ops/email-onboard");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load registry");
      setDomains(data.domains || []);
      setSharedMailbox(data.sharedMailbox || "support@kecktech.net");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Load failed");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    const d = domain.trim().toLowerCase();
    if (!d) return;
    if (!primary) setPrimary(`hello@${d}`);
  }, [domain]); // eslint-disable-line react-hooks/exhaustive-deps

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setResult(null);
    try {
      const res = await fetch("/api/ops/email-onboard", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          domain,
          primary,
          brandName: brandName || undefined,
          aliases,
          autoReply,
          newsletter,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Save failed");
      setResult(data);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  const inputStyle: React.CSSProperties = {
    width: "100%",
    background: "#0f172a",
    border: "1px solid #334155",
    borderRadius: 8,
    color: "#e2e8f0",
    padding: "10px 12px",
    fontSize: 14,
  };

  const labelStyle: React.CSSProperties = {
    display: "block",
    fontSize: 12,
    fontWeight: 600,
    color: "#94a3b8",
    marginBottom: 6,
  };

  return (
    <div style={{ padding: "28px 32px", maxWidth: 980, margin: "0 auto" }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap", marginBottom: 20 }}>
        <div>
          <h1 style={{ margin: "0 0 4px", fontSize: 22, fontWeight: 700, color: "#f1f5f9" }}>
            Email domain onboard
          </h1>
          <p style={{ margin: 0, color: "#64748b", fontSize: 13 }}>
            Registry-driven aliases for shared mailbox <code style={{ color: "#94a3b8" }}>{sharedMailbox}</code>
          </p>
        </div>
        <a href="/ops" style={{ color: "#60a5fa", fontSize: 13, alignSelf: "center" }}>← Operations</a>
      </div>

      {error && (
        <div style={{ background: "#2b1414", border: "1px solid #f87171", color: "#fecaca", padding: 12, borderRadius: 8, marginBottom: 16, fontSize: 13 }}>
          {error}
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "1.1fr 0.9fr", gap: 16 }}>
        <form onSubmit={onSubmit} style={{ background: "#1e293b", border: "1px solid #334155", borderRadius: 10, padding: 20 }}>
          <h2 style={{ margin: "0 0 14px", fontSize: 15, color: "#e2e8f0" }}>Add / update domain</h2>

          <div style={{ marginBottom: 12 }}>
            <label style={labelStyle}>Domain</label>
            <input required style={inputStyle} placeholder="example.com" value={domain} onChange={(e) => setDomain(e.target.value)} />
          </div>
          <div style={{ marginBottom: 12 }}>
            <label style={labelStyle}>Primary contact email</label>
            <input required type="email" style={inputStyle} placeholder="hello@example.com" value={primary} onChange={(e) => setPrimary(e.target.value)} />
          </div>
          <div style={{ marginBottom: 12 }}>
            <label style={labelStyle}>Brand name (optional)</label>
            <input style={inputStyle} placeholder="Example Co" value={brandName} onChange={(e) => setBrandName(e.target.value)} />
          </div>
          <div style={{ marginBottom: 12 }}>
            <label style={labelStyle}>Extra aliases (comma-separated)</label>
            <input style={inputStyle} placeholder="info,noreply,sales" value={aliases} onChange={(e) => setAliases(e.target.value)} />
          </div>

          <label style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 8, color: "#cbd5e1", fontSize: 13 }}>
            <input type="checkbox" checked={autoReply} onChange={(e) => setAutoReply(e.target.checked)} />
            Graph contact-form auto-reply (brand From)
          </label>
          <label style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 16, color: "#cbd5e1", fontSize: 13 }}>
            <input type="checkbox" checked={newsletter} onChange={(e) => setNewsletter(e.target.checked)} />
            Newsletter / Listmonk later
          </label>

          <button
            type="submit"
            disabled={saving}
            style={{
              background: "#C07810",
              color: "#fff",
              border: "none",
              borderRadius: 8,
              padding: "10px 16px",
              fontWeight: 700,
              fontSize: 13,
              cursor: saving ? "wait" : "pointer",
              opacity: saving ? 0.7 : 1,
            }}
          >
            {saving ? "Saving…" : "Save to registry + print checklist"}
          </button>
          <p style={{ margin: "12px 0 0", fontSize: 12, color: "#64748b" }}>
            M365 Apply and Cloudflare cutover stay human-gated (TXT verify + mail RRsets only). No LAN DNS changes.
          </p>
        </form>

        <div style={{ background: "#1e293b", border: "1px solid #334155", borderRadius: 10, padding: 20 }}>
          <h2 style={{ margin: "0 0 14px", fontSize: 15, color: "#e2e8f0" }}>Current brands</h2>
          {loading ? (
            <p style={{ color: "#64748b", fontSize: 13 }}>Loading…</p>
          ) : (
            <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>
              {domains.map((d) => (
                <li key={d.domain} style={{ borderBottom: "1px solid #334155", padding: "10px 0" }}>
                  <div style={{ color: "#f1f5f9", fontWeight: 600, fontSize: 13 }}>{d.domain}</div>
                  <div style={{ color: "#94a3b8", fontSize: 12 }}>{d.primary}</div>
                  <div style={{ color: "#64748b", fontSize: 11, marginTop: 4 }}>
                    {d.autoReply ? "auto-reply" : "no auto-reply"}
                    {d.newsletter ? " · newsletter" : ""}
                    {" · "}
                    {d.aliases.length} addresses
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {result?.ok && (
        <div style={{ marginTop: 18, background: "#0d2b1e", border: "1px solid #22c55e55", borderRadius: 10, padding: 18 }}>
          <h2 style={{ margin: "0 0 10px", fontSize: 15, color: "#86efac" }}>Checklist ready</h2>
          <pre style={{ whiteSpace: "pre-wrap", color: "#d1fae5", fontSize: 12, margin: "0 0 12px", lineHeight: 1.45 }}>
            {(result.checklist || []).join("\n")}
          </pre>
          {result.cli && (
            <div style={{ marginBottom: 10 }}>
              <div style={{ fontSize: 11, color: "#86efac", marginBottom: 4 }}>CLI (emit Cloudflare + registry sync)</div>
              <code style={{ display: "block", background: "#052e1b", padding: 10, borderRadius: 6, fontSize: 12, color: "#ecfdf5" }}>{result.cli}</code>
            </div>
          )}
          {result.applyM365 && (
            <div style={{ marginBottom: 10 }}>
              <div style={{ fontSize: 11, color: "#86efac", marginBottom: 4 }}>After M365 domain verified</div>
              <code style={{ display: "block", background: "#052e1b", padding: 10, borderRadius: 6, fontSize: 12, color: "#ecfdf5" }}>{result.applyM365}</code>
            </div>
          )}
          {result.owa && (
            <a href={result.owa} target="_blank" rel="noopener noreferrer" style={{ color: "#86efac", fontSize: 13 }}>
              Open shared mailbox in OWA ↗
            </a>
          )}
        </div>
      )}
    </div>
  );
}
