"use client";

import { useState } from "react";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
} from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy, useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { Lead, Opportunity } from "@/lib/erpnext";

const STAGES = ["New", "Open", "Replied", "Opportunity", "Quotation", "Interested"];
const STAGE_COLORS: Record<string, string> = {
  New: "#60a5fa",
  Open: "#a78bfa",
  Replied: "#34d399",
  Opportunity: "#fbbf24",
  Quotation: "#fb923c",
  Interested: "#f472b6",
  Converted: "#4ade80",
};

const SOURCE_COLORS: Record<string, string> = {
  "WordPress Form": "#38bdf8",
  Referral: "#a78bfa",
  "RMM Alert": "#fb923c",
  Manual: "#64748b",
  "Cold Call": "#34d399",
  Other: "#94a3b8",
};

const OPP_STAGES = ["Prospecting", "Qualification", "Proposal", "Negotiation", "Won", "Lost"];

function daysSince(dateStr: string) {
  if (!dateStr) return 0;
  return Math.floor((Date.now() - new Date(dateStr).getTime()) / 86_400_000);
}

function inputStyle(): React.CSSProperties {
  return { background: "#0f172a", border: "1px solid #334155", borderRadius: "6px", color: "#e2e8f0", padding: "7px 10px", fontSize: "13px", width: "100%", boxSizing: "border-box" };
}

function btnStyle(primary = true): React.CSSProperties {
  return { background: primary ? "#C07810" : "transparent", color: primary ? "#fff" : "#64748b", border: primary ? "none" : "1px solid #334155", borderRadius: "6px", padding: "7px 16px", fontSize: "13px", fontWeight: 600, cursor: "pointer" };
}

// ── Lead Drawer ────────────────────────────────────────────────────────────────

function LeadDrawer({ lead, onClose, onNoteAdded, onOpportunityCreated }: {
  lead: Lead;
  onClose: () => void;
  onNoteAdded: (leadName: string, note: string) => void;
  onOpportunityCreated: (leadName: string) => void;
}) {
  const [note, setNote] = useState("");
  const [addingNote, setAddingNote] = useState(false);
  const [noteErr, setNoteErr] = useState("");
  const [noteDone, setNoteDone] = useState(false);
  const [creatingOpp, setCreatingOpp] = useState(false);
  const [oppErr, setOppErr] = useState("");

  async function handleAddNote() {
    if (!note.trim()) return;
    setAddingNote(true);
    setNoteErr("");
    const res = await fetch(`/api/leads/${lead.name}/notes`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ note }),
    });
    const data = await res.json();
    setAddingNote(false);
    if (!res.ok) setNoteErr(data.error || "Failed");
    else { setNoteDone(true); onNoteAdded(lead.name, note); setNote(""); setTimeout(() => setNoteDone(false), 2000); }
  }

  async function handleCreateOpportunity() {
    setCreatingOpp(true);
    setOppErr("");
    const res = await fetch("/api/opportunities", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ leadId: lead.name, customerName: lead.company_name || lead.lead_name }),
    });
    const data = await res.json();
    setCreatingOpp(false);
    if (!res.ok) setOppErr(data.error || "Failed");
    else { onOpportunityCreated(lead.name); }
  }

  const stageColor = STAGE_COLORS[lead.status] || "#64748b";
  const days = daysSince(lead.modified);

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 200, display: "flex" }}>
      {/* Overlay */}
      <div style={{ flex: 1, background: "rgba(0,0,0,0.5)" }} onClick={onClose} />
      {/* Drawer */}
      <div style={{ width: "420px", background: "#1e293b", borderLeft: "1px solid #334155", padding: "24px", overflowY: "auto", display: "flex", flexDirection: "column", gap: "16px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div>
            <h2 style={{ margin: "0 0 4px", fontSize: "18px", fontWeight: 700, color: "#f1f5f9" }}>{lead.lead_name}</h2>
            {lead.company_name && <div style={{ fontSize: "14px", color: "#64748b" }}>{lead.company_name}</div>}
          </div>
          <button onClick={onClose} style={{ background: "transparent", border: "none", color: "#64748b", fontSize: "20px", cursor: "pointer" }}>×</button>
        </div>

        <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
          <span style={{ fontSize: "11px", padding: "2px 8px", borderRadius: "999px", background: `${stageColor}22`, color: stageColor, border: `1px solid ${stageColor}44` }}>{lead.status}</span>
          {lead.utm_source && (
            <span style={{ fontSize: "11px", padding: "2px 8px", borderRadius: "999px", background: `${SOURCE_COLORS[lead.utm_source] || "#64748b"}22`, color: SOURCE_COLORS[lead.utm_source] || "#64748b", border: `1px solid ${SOURCE_COLORS[lead.utm_source] || "#64748b"}44` }}>
              {lead.utm_source}
            </span>
          )}
          <span style={{ fontSize: "11px", color: "#475569" }}>Last activity: {days}d ago</span>
        </div>

        {/* Contact info */}
        <div style={{ background: "#0f172a", borderRadius: "8px", padding: "12px", fontSize: "13px", display: "flex", flexDirection: "column", gap: "6px" }}>
          {lead.email_id && <div style={{ color: "#94a3b8" }}>📧 {lead.email_id}</div>}
          {lead.phone && <div style={{ color: "#94a3b8" }}>📞 {lead.phone}</div>}
          <div style={{ color: "#64748b" }}>Created: {new Date(lead.creation).toLocaleDateString()}</div>
        </div>

        {/* Notes */}
        <div>
          <div style={{ fontSize: "13px", fontWeight: 600, color: "#e2e8f0", marginBottom: "8px" }}>Notes</div>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Add a note…"
            rows={3}
            style={{ ...inputStyle(), resize: "vertical" }}
          />
          {noteErr && <div style={{ color: "#f87171", fontSize: "12px", marginTop: "4px" }}>{noteErr}</div>}
          {noteDone && <div style={{ color: "#34d399", fontSize: "12px", marginTop: "4px" }}>✓ Note added</div>}
          <button onClick={handleAddNote} disabled={addingNote || !note.trim()} style={{ ...btnStyle(), marginTop: "8px", opacity: addingNote || !note.trim() ? 0.6 : 1 }}>
            {addingNote ? "Saving…" : "Add Note"}
          </button>
        </div>

        {/* Actions */}
        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          <div style={{ fontSize: "13px", fontWeight: 600, color: "#e2e8f0" }}>Actions</div>
          <button
            onClick={handleCreateOpportunity}
            disabled={creatingOpp || lead.status === "Opportunity" || lead.status === "Converted"}
            style={{ ...btnStyle(), background: "#7c3aed", opacity: creatingOpp || lead.status === "Opportunity" ? 0.6 : 1 }}
          >
            {creatingOpp ? "Converting…" : "→ Convert to Opportunity"}
          </button>
          {oppErr && <div style={{ color: "#f87171", fontSize: "12px" }}>{oppErr}</div>}
          <a
            href={`https://ops.kecktech.net/app/crm-lead/${lead.name}`}
            target="_blank"
            rel="noopener noreferrer"
            style={{ ...btnStyle(false), textDecoration: "none", textAlign: "center" as const, display: "block" }}
          >
            Open in CRM ↗
          </a>
          <a
            href={`https://ops.kecktech.net/app/quotation/new?lead=${encodeURIComponent(lead.name)}`}
            target="_blank"
            rel="noopener noreferrer"
            style={{ ...btnStyle(false), textDecoration: "none", textAlign: "center" as const, display: "block" }}
          >
            Create Quote in ERPNext ↗
          </a>
        </div>
      </div>
    </div>
  );
}

// ── Draggable Card ──────────────────────────────────────────────────────────────

function LeadCard({ lead, onClick }: { lead: Lead; onClick: () => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: lead.name });
  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    background: "#0f172a",
    border: `1px solid ${daysSince(lead.modified) >= 3 ? "#fb923c44" : "#1e293b"}`,
    borderRadius: "6px",
    padding: "10px",
    marginBottom: "6px",
    cursor: "grab",
  };
  const src = lead.utm_source;
  const srcColor = SOURCE_COLORS[src] || "#64748b";
  const days = daysSince(lead.modified);

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners} onClick={onClick}>
      <div style={{ fontSize: "13px", fontWeight: 600, color: "#f1f5f9", marginBottom: "3px" }}>{lead.lead_name}</div>
      {lead.company_name && <div style={{ fontSize: "11px", color: "#64748b", marginBottom: "4px" }}>{lead.company_name}</div>}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        {src ? (
          <span style={{ fontSize: "10px", padding: "1px 6px", borderRadius: "999px", background: `${srcColor}22`, color: srcColor, border: `1px solid ${srcColor}44` }}>
            {src}
          </span>
        ) : <span />}
        <span style={{ fontSize: "10px", color: days >= 3 ? "#fb923c" : "#475569" }}>{days}d</span>
      </div>
    </div>
  );
}

// ── Opportunity Section ─────────────────────────────────────────────────────────

function OppPipeline({ opportunities }: { opportunities: Opportunity[] }) {
  const byStage: Record<string, Opportunity[]> = {};
  for (const s of OPP_STAGES) byStage[s] = [];
  for (const opp of opportunities) {
    const s = opp.sales_stage || "Prospecting";
    if (byStage[s]) byStage[s].push(opp);
    else byStage["Prospecting"].push(opp);
  }

  const totalWeighted = opportunities
    .filter((o) => !["Won", "Lost"].includes(o.status))
    .reduce((s, o) => s + ((o.opportunity_amount || 0) * (o.probability || 0)) / 100, 0);

  const fmtCur = (n: number) => n.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });

  return (
    <section style={{ marginTop: "32px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px" }}>
        <h2 style={{ margin: 0, fontSize: "16px", fontWeight: 600, color: "#e2e8f0" }}>💼 Opportunity Pipeline</h2>
        <div style={{ fontSize: "13px", color: "#a78bfa", fontWeight: 600 }}>
          Weighted Forecast: {fmtCur(totalWeighted)}
        </div>
      </div>
      <div style={{ display: "flex", gap: "10px", overflowX: "auto", paddingBottom: "8px" }}>
        {OPP_STAGES.map((stage) => {
          const stageCols: Record<string, string> = { Prospecting: "#60a5fa", Qualification: "#a78bfa", Proposal: "#fbbf24", Negotiation: "#fb923c", Won: "#34d399", Lost: "#f87171" };
          const color = stageCols[stage] || "#64748b";
          const opps = byStage[stage] || [];
          return (
            <div key={stage} style={{ minWidth: "180px", flex: "0 0 auto", background: "#1e293b", border: "1px solid #334155", borderTop: `3px solid ${color}`, borderRadius: "10px", padding: "12px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
                <span style={{ fontSize: "12px", fontWeight: 600, color }}>{stage}</span>
                <span style={{ fontSize: "11px", background: `${color}22`, color, border: `1px solid ${color}44`, borderRadius: "999px", padding: "1px 7px" }}>{opps.length}</span>
              </div>
              {opps.length === 0 && <div style={{ fontSize: "12px", color: "#334155", textAlign: "center", padding: "12px 0" }}>—</div>}
              {opps.map((o) => (
                <div key={o.name} style={{ background: "#0f172a", border: "1px solid #1e293b", borderRadius: "6px", padding: "8px", marginBottom: "6px" }}>
                  <div style={{ fontSize: "12px", fontWeight: 600, color: "#f1f5f9", marginBottom: "2px" }}>{o.customer_name}</div>
                  <div style={{ fontSize: "11px", color: "#64748b" }}>
                    {fmtCur(o.opportunity_amount || 0)} · {o.probability}%
                  </div>
                  {o.expected_closing && (
                    <div style={{ fontSize: "10px", color: "#475569", marginTop: "2px" }}>Close: {o.expected_closing}</div>
                  )}
                </div>
              ))}
            </div>
          );
        })}
      </div>
    </section>
  );
}

// ── Main Board ──────────────────────────────────────────────────────────────────

export function SalesBoard({ leads: initialLeads, opportunities }: { leads: Lead[]; opportunities: Opportunity[] }) {
  const [leads, setLeads] = useState(initialLeads);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [drawerLead, setDrawerLead] = useState<Lead | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  );

  const byStage: Record<string, Lead[]> = {};
  for (const stage of STAGES) byStage[stage] = [];
  for (const lead of leads) {
    const s = lead.status || "New";
    if (byStage[s]) byStage[s].push(lead);
    else byStage["New"].push(lead);
  }

  function handleDragStart(event: DragStartEvent) {
    setActiveId(String(event.active.id));
  }

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    setActiveId(null);
    if (!over) return;

    // over.id is either a stage name (column drop zone) or a lead.name
    const leadName = String(active.id);
    const overId = String(over.id);

    // Find the target stage
    let targetStage = STAGES.find((s) => s === overId);
    if (!targetStage) {
      // over.id is another lead — find its stage
      for (const [stage, stageLeads] of Object.entries(byStage)) {
        if (stageLeads.some((l) => l.name === overId)) {
          targetStage = stage;
          break;
        }
      }
    }
    if (!targetStage) return;

    const movingLead = leads.find((l) => l.name === leadName);
    if (!movingLead || movingLead.status === targetStage) return;

    // Optimistic update
    setLeads((prev) => prev.map((l) => l.name === leadName ? { ...l, status: targetStage! } : l));

    // Persist to ERPNext
    await fetch(`/api/leads/${leadName}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: targetStage }),
    });
  }

  const activeLead = activeId ? leads.find((l) => l.name === activeId) : null;

  return (
    <>
      {drawerLead && (
        <LeadDrawer
          lead={drawerLead}
          onClose={() => setDrawerLead(null)}
          onNoteAdded={() => {}}
          onOpportunityCreated={(name) => {
            setLeads((prev) => prev.map((l) => l.name === name ? { ...l, status: "Opportunity" } : l));
            setDrawerLead(null);
          }}
        />
      )}

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
        <div style={{ display: "flex", gap: "10px", overflowX: "auto", paddingBottom: "8px" }}>
          {STAGES.map((stage) => {
            const stageLeads = byStage[stage] || [];
            const color = STAGE_COLORS[stage] || "#64748b";
            return (
              <div
                key={stage}
                id={stage}
                style={{ minWidth: "180px", flex: "0 0 auto", background: "#1e293b", border: "1px solid #334155", borderTop: `3px solid ${color}`, borderRadius: "10px", padding: "12px" }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
                  <span style={{ fontSize: "12px", fontWeight: 600, color }}>{stage}</span>
                  <span style={{ fontSize: "11px", background: `${color}22`, color, border: `1px solid ${color}44`, borderRadius: "999px", padding: "1px 7px" }}>
                    {stageLeads.length}
                  </span>
                </div>
                {stageLeads.length === 0 && (
                  <div style={{ fontSize: "12px", color: "#334155", textAlign: "center", padding: "12px 0" }}>—</div>
                )}
                <SortableContext items={stageLeads.map((l) => l.name)} strategy={verticalListSortingStrategy}>
                  {stageLeads.map((lead) => (
                    <LeadCard
                      key={lead.name}
                      lead={lead}
                      onClick={() => setDrawerLead(lead)}
                    />
                  ))}
                </SortableContext>
              </div>
            );
          })}
        </div>

        <DragOverlay>
          {activeLead && (
            <div style={{ background: "#0f172a", border: "1px solid #60a5fa44", borderRadius: "6px", padding: "10px", opacity: 0.9 }}>
              <div style={{ fontSize: "13px", fontWeight: 600, color: "#f1f5f9" }}>{activeLead.lead_name}</div>
            </div>
          )}
        </DragOverlay>
      </DndContext>

      <OppPipeline opportunities={opportunities} />
    </>
  );
}
