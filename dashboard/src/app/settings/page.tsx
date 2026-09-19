"use client";

import { useEffect, useState } from "react";
import { ICON_LIBRARY } from "@/components/AppTile";
import { Wrench } from "lucide-react";

const ICON_OPTIONS = Object.keys(ICON_LIBRARY).sort();

interface BaseTile {
  name: string;
  description: string;
  icon: string;
}

interface Override {
  displayName?: string;
  description?: string;
  icon?: string;
  hidden?: boolean;
}

export default function SettingsPage() {
  const [base, setBase] = useState<BaseTile[]>([]);
  const [overrides, setOverrides] = useState<Record<string, Override>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/tiles")
      .then((r) => r.json())
      .then((d) => {
        setBase(d.base ?? []);
        setOverrides(d.overrides ?? {});
        setLoading(false);
      });
  }, []);

  function updateOverride(name: string, patch: Partial<Override>) {
    setOverrides((prev) => ({ ...prev, [name]: { ...prev[name], ...patch } }));
  }

  async function save() {
    setSaving(true);
    await fetch("/api/tiles", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ overrides }),
    });
    setSaving(false);
    setSavedAt(new Date().toLocaleTimeString());
  }

  const visibleCount = base.filter((t) => !overrides[t.name]?.hidden).length;

  if (loading) {
    return <div style={{ padding: 32, color: "#94a3b8" }}>Loading tiles…</div>;
  }

  return (
    <div style={{ background: "#0f172a", minHeight: "100vh", padding: "32px" }}>
      <div style={{ maxWidth: 1200, margin: "0 auto" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
          <div>
            <h1 style={{ color: "#f1f5f9", fontSize: 24, fontWeight: 700, margin: 0 }}>Edit Tiles</h1>
            <p style={{ color: "#94a3b8", fontSize: 14, margin: "4px 0 0" }}>
              {visibleCount} of {base.length} tiles visible on the dashboard · {ICON_OPTIONS.length} icons available
            </p>
          </div>
          <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
            {savedAt && <span style={{ color: "#34d399", fontSize: 13 }}>Saved {savedAt}</span>}
            <a href="/" style={{ color: "#94a3b8", fontSize: 14, textDecoration: "none" }}>← Back to dashboard</a>
            <button
              onClick={save}
              disabled={saving}
              style={{
                background: "#10b981",
                color: "#0f172a",
                fontWeight: 600,
                border: "none",
                borderRadius: 8,
                padding: "10px 20px",
                cursor: saving ? "default" : "pointer",
                opacity: saving ? 0.6 : 1,
              }}
            >
              {saving ? "Saving…" : "Save Changes"}
            </button>
          </div>
        </div>

        <div style={{ background: "#1e293b", borderRadius: 12, border: "1px solid #334155", overflow: "hidden" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ borderBottom: "1px solid #334155", textAlign: "left" }}>
                {["Visible", "Original Name", "Display Name", "Description", "Icon"].map((h) => (
                  <th key={h} style={{ padding: "10px 14px", color: "#94a3b8", fontSize: 12, fontWeight: 600, textTransform: "uppercase" }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {base.map((tile) => {
                const ov = overrides[tile.name] ?? {};
                const currentIconKey = ov.icon ?? tile.icon;
                const CurrentIcon = ICON_LIBRARY[currentIconKey] || Wrench;
                return (
                  <tr key={tile.name} style={{ borderBottom: "1px solid #27354a" }}>
                    <td style={{ padding: "10px 14px" }}>
                      <input
                        type="checkbox"
                        checked={!ov.hidden}
                        onChange={(e) => updateOverride(tile.name, { hidden: !e.target.checked })}
                      />
                    </td>
                    <td style={{ padding: "10px 14px", color: "#64748b", fontSize: 13 }}>{tile.name}</td>
                    <td style={{ padding: "10px 14px" }}>
                      <input
                        value={ov.displayName ?? ""}
                        placeholder={tile.name}
                        onChange={(e) => updateOverride(tile.name, { displayName: e.target.value })}
                        style={{ background: "#0f172a", border: "1px solid #334155", borderRadius: 6, padding: "6px 10px", color: "#f1f5f9", width: "100%" }}
                      />
                    </td>
                    <td style={{ padding: "10px 14px" }}>
                      <input
                        value={ov.description ?? ""}
                        placeholder={tile.description}
                        onChange={(e) => updateOverride(tile.name, { description: e.target.value })}
                        style={{ background: "#0f172a", border: "1px solid #334155", borderRadius: 6, padding: "6px 10px", color: "#f1f5f9", width: "100%" }}
                      />
                    </td>
                    <td style={{ padding: "10px 14px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <div style={{ width: 28, height: 28, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", background: "#0f172a", border: "1px solid #334155", borderRadius: 6 }}>
                          <CurrentIcon size={16} color="#94a3b8" />
                        </div>
                        <select
                          value={currentIconKey}
                          onChange={(e) => updateOverride(tile.name, { icon: e.target.value })}
                          style={{ background: "#0f172a", border: "1px solid #334155", borderRadius: 6, padding: "6px 10px", color: "#f1f5f9" }}
                        >
                          {ICON_OPTIONS.map((i) => (
                            <option key={i} value={i}>{i}</option>
                          ))}
                        </select>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
