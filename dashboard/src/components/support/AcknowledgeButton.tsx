"use client";

import { useState } from "react";

export function AcknowledgeButton({ alertId }: { alertId: number }) {
  const [state, setState] = useState<"idle" | "loading" | "done" | "error">("idle");

  async function acknowledge() {
    setState("loading");
    try {
      const res = await fetch(`/api/trmm-alert/${alertId}`, { method: "PATCH" });
      setState(res.ok ? "done" : "error");
    } catch {
      setState("error");
    }
  }

  const label =
    state === "done" ? "✓ Acknowledged" :
    state === "loading" ? "…" :
    state === "error" ? "⚠ Failed — Retry" :
    "Acknowledge";

  const color =
    state === "done" ? "#34d399" :
    state === "error" ? "#f87171" :
    "#64748b";

  return (
    <button
      onClick={acknowledge}
      disabled={state === "loading" || state === "done"}
      style={{
        fontSize: "11px",
        color,
        background: "none",
        border: `1px solid ${state === "error" ? "#f8717144" : "#334155"}`,
        borderRadius: "4px",
        padding: "2px 8px",
        cursor: state === "loading" || state === "done" ? "default" : "pointer",
        marginTop: "8px",
      }}
    >
      {label}
    </button>
  );
}
