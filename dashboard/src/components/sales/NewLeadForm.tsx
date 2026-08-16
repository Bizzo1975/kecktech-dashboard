"use client";

import { useState } from "react";

const LEAD_SOURCES = ["Manual", "WordPress Form", "Referral", "RMM Alert", "Cold Call", "Other"];

type Props = { onCreated?: () => void };

export function NewLeadForm({ onCreated }: Props) {
  const [form, setForm] = useState({
    lead_name: "",
    company_name: "",
    phone: "",
    email_id: "",
    utm_source: "Manual",
    notes: "",
  });
  const [status, setStatus] = useState<"idle" | "saving" | "ok" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");

  function set(field: string, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.lead_name) return;
    setStatus("saving");
    setErrorMsg("");
    try {
      const res = await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok || data.error) {
        setStatus("error");
        setErrorMsg(data.error || "Unknown error");
      } else {
        setStatus("ok");
        setForm({ lead_name: "", company_name: "", phone: "", email_id: "", utm_source: "Manual", notes: "" });
        onCreated?.();
        setTimeout(() => setStatus("idle"), 3000);
      }
    } catch (err) {
      setStatus("error");
      setErrorMsg(String(err));
    }
  }

  const inputStyle: React.CSSProperties = {
    width: "100%",
    background: "#0f172a",
    border: "1px solid #334155",
    borderRadius: "6px",
    padding: "7px 10px",
    color: "#e2e8f0",
    fontSize: "13px",
  };

  const labelStyle: React.CSSProperties = {
    display: "block",
    fontSize: "11px",
    color: "#64748b",
    marginBottom: "4px",
    fontWeight: 500,
    textTransform: "uppercase",
    letterSpacing: "0.05em",
  };

  return (
    <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
        <div>
          <label style={labelStyle}>Name *</label>
          <input
            type="text"
            value={form.lead_name}
            onChange={(e) => set("lead_name", e.target.value)}
            placeholder="Full name"
            style={inputStyle}
            required
          />
        </div>
        <div>
          <label style={labelStyle}>Company</label>
          <input
            type="text"
            value={form.company_name}
            onChange={(e) => set("company_name", e.target.value)}
            placeholder="Company"
            style={inputStyle}
          />
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
        <div>
          <label style={labelStyle}>Phone</label>
          <input
            type="tel"
            value={form.phone}
            onChange={(e) => set("phone", e.target.value)}
            placeholder="(555) 000-0000"
            style={inputStyle}
          />
        </div>
        <div>
          <label style={labelStyle}>Email</label>
          <input
            type="email"
            value={form.email_id}
            onChange={(e) => set("email_id", e.target.value)}
            placeholder="email@example.com"
            style={inputStyle}
          />
        </div>
      </div>

      <div>
        <label style={labelStyle}>Source</label>
        <select value={form.utm_source} onChange={(e) => set("utm_source", e.target.value)} style={inputStyle}>
          {LEAD_SOURCES.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
      </div>

      <div>
        <label style={labelStyle}>Notes</label>
        <textarea
          value={form.notes}
          onChange={(e) => set("notes", e.target.value)}
          placeholder="How did they find us? What are they looking for?"
          rows={2}
          style={{ ...inputStyle, resize: "vertical" }}
        />
      </div>

      <button
        type="submit"
        disabled={status === "saving" || !form.lead_name}
        style={{
          background: status === "ok" ? "#16a34a" : "#3b82f6",
          color: "#fff",
          border: "none",
          borderRadius: "6px",
          padding: "8px 0",
          fontSize: "13px",
          fontWeight: 600,
          cursor: status === "saving" || !form.lead_name ? "not-allowed" : "pointer",
          opacity: status === "saving" || !form.lead_name ? 0.6 : 1,
        }}
      >
        {status === "saving" ? "Creating…" : status === "ok" ? "✓ Lead Created" : "Add Lead"}
      </button>

      {status === "error" && (
        <div style={{ fontSize: "12px", color: "#f87171" }}>⚠ {errorMsg}</div>
      )}
    </form>
  );
}
