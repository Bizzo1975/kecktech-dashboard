"use client";

import { useState } from "react";

type Props = { customers: { name: string; customer_name: string }[] };

export function TimeEntryForm({ customers }: Props) {
  const today = new Date().toISOString().slice(0, 10);
  const [customer, setCustomer] = useState("");
  const [hours, setHours] = useState("0.5");
  const [description, setDescription] = useState("");
  const [date, setDate] = useState(today);
  const [status, setStatus] = useState<"idle" | "saving" | "ok" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!customer || !hours) return;
    setStatus("saving");
    setErrorMsg("");
    try {
      const res = await fetch("/api/timesheet", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ customer, hours: parseFloat(hours), description, date }),
      });
      const data = await res.json();
      if (!res.ok || data.error) {
        setStatus("error");
        setErrorMsg(data.error || "Unknown error");
      } else {
        setStatus("ok");
        setDescription("");
        setHours("0.5");
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
      <div>
        <label style={labelStyle}>Customer</label>
        <select value={customer} onChange={(e) => setCustomer(e.target.value)} style={inputStyle} required>
          <option value="">Select customer…</option>
          {customers.map((c) => (
            <option key={c.name} value={c.name}>{c.customer_name}</option>
          ))}
        </select>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
        <div>
          <label style={labelStyle}>Hours</label>
          <select value={hours} onChange={(e) => setHours(e.target.value)} style={inputStyle}>
            {["0.25","0.5","0.75","1","1.5","2","2.5","3","4","5","6","7","8"].map((h) => (
              <option key={h} value={h}>{h} hr{parseFloat(h) !== 1 ? "s" : ""}</option>
            ))}
          </select>
        </div>
        <div>
          <label style={labelStyle}>Date</label>
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} style={inputStyle} />
        </div>
      </div>

      <div>
        <label style={labelStyle}>Description</label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="What did you do?"
          rows={2}
          style={{ ...inputStyle, resize: "vertical" }}
        />
      </div>

      <button
        type="submit"
        disabled={status === "saving" || !customer}
        style={{
          background: status === "ok" ? "#16a34a" : "#3b82f6",
          color: "#fff",
          border: "none",
          borderRadius: "6px",
          padding: "8px 0",
          fontSize: "13px",
          fontWeight: 600,
          cursor: status === "saving" || !customer ? "not-allowed" : "pointer",
          opacity: status === "saving" || !customer ? 0.6 : 1,
        }}
      >
        {status === "saving" ? "Saving…" : status === "ok" ? "✓ Saved" : "Log Time"}
      </button>

      {status === "error" && (
        <div style={{ fontSize: "12px", color: "#f87171" }}>⚠ {errorMsg}</div>
      )}
    </form>
  );
}
