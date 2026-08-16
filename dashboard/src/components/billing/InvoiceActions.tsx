"use client";

import { useState } from "react";
import type { Invoice, Customer, Supplier, PurchaseInvoice, TimesheetEntry } from "@/lib/erpnext";

const SERVICE_ITEMS = [
  { code: "SVC-MSP", name: "White Glove Managed IT", rate: 199 },
  { code: "SVC-HAAS", name: "HaaS Device Subscription", rate: 149 },
  { code: "SVC-SENIOR", name: "Senior Technology Concierge", rate: 79 },
  { code: "SVC-HOSTING", name: "Sovereign Private Hosting", rate: 49 },
  { code: "SVC-AIAPP", name: "AI Custom App Build", rate: 3000 },
  { code: "SVC-REMOTE", name: "Remote Support (hourly)", rate: 45 },
  { code: "SVC-HOME", name: "In-Home Support (hourly)", rate: 85 },
  { code: "SVC-MSP-SEC", name: "Managed Security Add-on", rate: 49 },
];

function inputStyle(extra?: React.CSSProperties): React.CSSProperties {
  return {
    background: "#0f172a",
    border: "1px solid #334155",
    borderRadius: "6px",
    color: "#e2e8f0",
    padding: "7px 10px",
    fontSize: "13px",
    width: "100%",
    boxSizing: "border-box",
    ...extra,
  };
}

function btnStyle(primary = true): React.CSSProperties {
  return {
    background: primary ? "#C07810" : "transparent",
    color: primary ? "#fff" : "#64748b",
    border: primary ? "none" : "1px solid #334155",
    borderRadius: "6px",
    padding: "7px 16px",
    fontSize: "13px",
    fontWeight: 600,
    cursor: "pointer",
  };
}

// ── New Invoice Modal ──────────────────────────────────────────────────────────

type LineItem = { item_code: string; item_name: string; qty: number; rate: number };

export function NewInvoiceButton({ customers }: { customers: Customer[] }) {
  const [open, setOpen] = useState(false);
  const [customer, setCustomer] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [items, setItems] = useState<LineItem[]>([{ item_code: "SVC-MSP", item_name: "White Glove Managed IT", qty: 1, rate: 199 }]);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{ name?: string; error?: string } | null>(null);

  function addItem() {
    setItems((prev) => [...prev, { item_code: "SVC-MSP", item_name: "White Glove Managed IT", qty: 1, rate: 199 }]);
  }

  function updateItem(i: number, field: keyof LineItem, value: string | number) {
    setItems((prev) => {
      const next = [...prev];
      if (field === "item_code") {
        const svc = SERVICE_ITEMS.find((s) => s.code === value);
        next[i] = { ...next[i], item_code: String(value), item_name: svc?.name ?? String(value), rate: svc?.rate ?? next[i].rate };
      } else {
        (next[i] as Record<string, unknown>)[field] = value;
      }
      return next;
    });
  }

  const total = items.reduce((s, it) => s + it.qty * it.rate, 0);

  async function submit() {
    if (!customer) return;
    setSubmitting(true);
    setResult(null);
    const res = await fetch("/api/invoices", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ customer, items, due_date: dueDate || undefined }),
    });
    const data = await res.json();
    setResult(data);
    setSubmitting(false);
    if (res.ok) {
      setTimeout(() => { setOpen(false); setResult(null); }, 1500);
    }
  }

  return (
    <>
      <button onClick={() => setOpen(true)} style={btnStyle()}>+ New Invoice</button>

      {open && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ background: "#1e293b", border: "1px solid #334155", borderRadius: "12px", padding: "24px", width: "560px", maxHeight: "90vh", overflowY: "auto" }}>
            <h2 style={{ margin: "0 0 16px", fontSize: "16px", fontWeight: 700, color: "#f1f5f9" }}>New Sales Invoice</h2>

            <div style={{ marginBottom: "12px" }}>
              <label style={{ fontSize: "12px", color: "#64748b", display: "block", marginBottom: "4px" }}>Customer *</label>
              <select value={customer} onChange={(e) => setCustomer(e.target.value)} style={inputStyle()}>
                <option value="">— Select customer —</option>
                {customers.map((c) => <option key={c.name} value={c.name}>{c.customer_name}</option>)}
              </select>
            </div>

            <div style={{ marginBottom: "16px" }}>
              <label style={{ fontSize: "12px", color: "#64748b", display: "block", marginBottom: "4px" }}>Due Date</label>
              <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} style={inputStyle()} />
            </div>

            <div style={{ marginBottom: "8px" }}>
              <label style={{ fontSize: "12px", color: "#64748b", display: "block", marginBottom: "8px" }}>Line Items</label>
              {items.map((item, i) => (
                <div key={i} style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr auto", gap: "6px", marginBottom: "6px", alignItems: "center" }}>
                  <select value={item.item_code} onChange={(e) => updateItem(i, "item_code", e.target.value)} style={inputStyle()}>
                    {SERVICE_ITEMS.map((s) => <option key={s.code} value={s.code}>{s.name}</option>)}
                  </select>
                  <input type="number" min="1" value={item.qty} onChange={(e) => updateItem(i, "qty", Number(e.target.value))} placeholder="Qty" style={inputStyle()} />
                  <input type="number" step="0.01" value={item.rate} onChange={(e) => updateItem(i, "rate", Number(e.target.value))} placeholder="Rate" style={inputStyle()} />
                  <button onClick={() => setItems((p) => p.filter((_, j) => j !== i))} style={{ background: "transparent", border: "none", color: "#f87171", cursor: "pointer", fontSize: "16px" }}>×</button>
                </div>
              ))}
              <button onClick={addItem} style={{ ...btnStyle(false), fontSize: "12px", padding: "4px 10px", marginTop: "4px" }}>+ Add Item</button>
            </div>

            <div style={{ textAlign: "right", fontSize: "16px", fontWeight: 700, color: "#f1f5f9", marginBottom: "16px" }}>
              Total: ${total.toLocaleString("en-US", { minimumFractionDigits: 2 })}
            </div>

            {result?.error && <div style={{ color: "#f87171", fontSize: "12px", marginBottom: "8px" }}>⚠ {result.error}</div>}
            {result?.name && <div style={{ color: "#34d399", fontSize: "12px", marginBottom: "8px" }}>✓ Created: {result.name}</div>}

            <div style={{ display: "flex", gap: "8px" }}>
              <button onClick={submit} disabled={submitting || !customer} style={{ ...btnStyle(), opacity: submitting || !customer ? 0.6 : 1 }}>
                {submitting ? "Creating…" : "Create Invoice"}
              </button>
              <button onClick={() => setOpen(false)} style={btnStyle(false)}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// ── Record Payment Modal ───────────────────────────────────────────────────────

export function RecordPaymentButton({ invoice }: { invoice: Invoice }) {
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState(String(invoice.outstanding_amount));
  const [mode, setMode] = useState("Bank");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{ name?: string; error?: string } | null>(null);

  async function submit() {
    setSubmitting(true);
    const res = await fetch(`/api/invoices/${invoice.name}/payment`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ amount: Number(amount), mode, customer: invoice.customer, referenceDate: date }),
    });
    const data = await res.json();
    setResult(data);
    setSubmitting(false);
    if (res.ok) setTimeout(() => { setOpen(false); setResult(null); }, 1500);
  }

  return (
    <>
      <button onClick={() => setOpen(true)} style={{ background: "#0D6E6E", color: "#fff", border: "none", borderRadius: "5px", padding: "3px 10px", fontSize: "11px", fontWeight: 600, cursor: "pointer" }}>
        Record Payment
      </button>
      {open && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ background: "#1e293b", border: "1px solid #334155", borderRadius: "12px", padding: "24px", width: "400px" }}>
            <h2 style={{ margin: "0 0 16px", fontSize: "15px", fontWeight: 700, color: "#f1f5f9" }}>Record Payment</h2>
            <div style={{ fontSize: "13px", color: "#94a3b8", marginBottom: "16px" }}>
              {invoice.name} · {invoice.customer} · Outstanding: ${invoice.outstanding_amount.toLocaleString()}
            </div>
            <div style={{ marginBottom: "10px" }}>
              <label style={{ fontSize: "12px", color: "#64748b", display: "block", marginBottom: "4px" }}>Amount *</label>
              <input type="number" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} style={inputStyle()} />
            </div>
            <div style={{ marginBottom: "10px" }}>
              <label style={{ fontSize: "12px", color: "#64748b", display: "block", marginBottom: "4px" }}>Mode</label>
              <select value={mode} onChange={(e) => setMode(e.target.value)} style={inputStyle()}>
                {["Bank", "Cash", "Stripe", "ACH", "Check"].map((m) => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>
            <div style={{ marginBottom: "16px" }}>
              <label style={{ fontSize: "12px", color: "#64748b", display: "block", marginBottom: "4px" }}>Date</label>
              <input type="date" value={date} onChange={(e) => setDate(e.target.value)} style={inputStyle()} />
            </div>
            {result?.error && <div style={{ color: "#f87171", fontSize: "12px", marginBottom: "8px" }}>⚠ {result.error}</div>}
            {result?.name && <div style={{ color: "#34d399", fontSize: "12px", marginBottom: "8px" }}>✓ Payment recorded</div>}
            <div style={{ display: "flex", gap: "8px" }}>
              <button onClick={submit} disabled={submitting} style={{ ...btnStyle(), opacity: submitting ? 0.6 : 1 }}>
                {submitting ? "Saving…" : "Record Payment"}
              </button>
              <button onClick={() => setOpen(false)} style={btnStyle(false)}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// ── New Bill (AP) Modal ────────────────────────────────────────────────────────

export function NewBillButton({ suppliers }: { suppliers: Supplier[] }) {
  const [open, setOpen] = useState(false);
  const [supplier, setSupplier] = useState("");
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{ name?: string; error?: string } | null>(null);

  async function submit() {
    if (!supplier || !description || !amount) return;
    setSubmitting(true);
    const res = await fetch("/api/purchase-invoices", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        supplier,
        due_date: dueDate || undefined,
        items: [{ item_code: "Expense", item_name: description, qty: 1, rate: Number(amount), description }],
      }),
    });
    const data = await res.json();
    setResult(data);
    setSubmitting(false);
    if (res.ok) setTimeout(() => { setOpen(false); setResult(null); }, 1500);
  }

  return (
    <>
      <button onClick={() => setOpen(true)} style={btnStyle()}>+ New Bill</button>
      {open && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ background: "#1e293b", border: "1px solid #334155", borderRadius: "12px", padding: "24px", width: "440px" }}>
            <h2 style={{ margin: "0 0 16px", fontSize: "15px", fontWeight: 700, color: "#f1f5f9" }}>New Vendor Bill</h2>
            <div style={{ marginBottom: "10px" }}>
              <label style={{ fontSize: "12px", color: "#64748b", display: "block", marginBottom: "4px" }}>Vendor *</label>
              <select value={supplier} onChange={(e) => setSupplier(e.target.value)} style={inputStyle()}>
                <option value="">— Select vendor —</option>
                {suppliers.map((s) => <option key={s.name} value={s.name}>{s.supplier_name}</option>)}
              </select>
            </div>
            <div style={{ marginBottom: "10px" }}>
              <label style={{ fontSize: "12px", color: "#64748b", display: "block", marginBottom: "4px" }}>Description *</label>
              <input type="text" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="e.g. Monthly hosting fee" style={inputStyle()} />
            </div>
            <div style={{ marginBottom: "10px" }}>
              <label style={{ fontSize: "12px", color: "#64748b", display: "block", marginBottom: "4px" }}>Amount *</label>
              <input type="number" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} style={inputStyle()} />
            </div>
            <div style={{ marginBottom: "16px" }}>
              <label style={{ fontSize: "12px", color: "#64748b", display: "block", marginBottom: "4px" }}>Due Date</label>
              <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} style={inputStyle()} />
            </div>
            {result?.error && <div style={{ color: "#f87171", fontSize: "12px", marginBottom: "8px" }}>⚠ {result.error}</div>}
            {result?.name && <div style={{ color: "#34d399", fontSize: "12px", marginBottom: "8px" }}>✓ Created: {result.name}</div>}
            <div style={{ display: "flex", gap: "8px" }}>
              <button onClick={submit} disabled={submitting} style={{ ...btnStyle(), opacity: submitting ? 0.6 : 1 }}>
                {submitting ? "Creating…" : "Create Bill"}
              </button>
              <button onClick={() => setOpen(false)} style={btnStyle(false)}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// ── Mark AP Paid ───────────────────────────────────────────────────────────────

export function MarkAPPaidButton({ invoice }: { invoice: PurchaseInvoice }) {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState("Bank");
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [err, setErr] = useState("");

  async function submit() {
    setSubmitting(true);
    const res = await fetch(`/api/purchase-invoices/${invoice.name}/payment`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ amount: invoice.outstanding_amount, mode, supplier: invoice.supplier }),
    });
    const data = await res.json();
    setSubmitting(false);
    if (!res.ok) setErr(data.error || "Failed");
    else { setDone(true); setTimeout(() => setOpen(false), 1000); }
  }

  return (
    <>
      <button onClick={() => setOpen(true)} style={{ background: "#0D6E6E", color: "#fff", border: "none", borderRadius: "5px", padding: "3px 10px", fontSize: "11px", fontWeight: 600, cursor: "pointer" }}>
        Mark Paid
      </button>
      {open && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ background: "#1e293b", border: "1px solid #334155", borderRadius: "12px", padding: "24px", width: "360px" }}>
            <h2 style={{ margin: "0 0 12px", fontSize: "14px", fontWeight: 700, color: "#f1f5f9" }}>Mark Bill Paid</h2>
            <div style={{ fontSize: "13px", color: "#94a3b8", marginBottom: "14px" }}>
              {invoice.name} · {invoice.supplier} · ${invoice.outstanding_amount.toLocaleString()}
            </div>
            <select value={mode} onChange={(e) => setMode(e.target.value)} style={{ ...inputStyle(), marginBottom: "16px" }}>
              {["Bank", "Cash", "ACH", "Check"].map((m) => <option key={m}>{m}</option>)}
            </select>
            {err && <div style={{ color: "#f87171", fontSize: "12px", marginBottom: "8px" }}>⚠ {err}</div>}
            {done && <div style={{ color: "#34d399", fontSize: "12px", marginBottom: "8px" }}>✓ Payment recorded</div>}
            <div style={{ display: "flex", gap: "8px" }}>
              <button onClick={submit} disabled={submitting} style={{ ...btnStyle(), opacity: submitting ? 0.6 : 1 }}>
                {submitting ? "Saving…" : "Confirm Payment"}
              </button>
              <button onClick={() => setOpen(false)} style={btnStyle(false)}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// ── Bill Unbilled Hours Button ─────────────────────────────────────────────────

export function BillUnbilledButton({ timesheets, customers }: { timesheets: TimesheetEntry[]; customers: Customer[] }) {
  const [open, setOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{ name?: string; error?: string } | null>(null);

  const unbilledByCustomer: Record<string, { hours: number; sheets: TimesheetEntry[] }> = {};
  for (const ts of timesheets.filter((t) => t.docstatus === 0)) {
    const c = ts.customer || "Unknown";
    if (!unbilledByCustomer[c]) unbilledByCustomer[c] = { hours: 0, sheets: [] };
    unbilledByCustomer[c].hours += ts.total_hours;
    unbilledByCustomer[c].sheets.push(ts);
  }

  const customerList = Object.keys(unbilledByCustomer);

  async function submit() {
    if (!selectedCustomer) return;
    const bucket = unbilledByCustomer[selectedCustomer];
    if (!bucket) return;
    setSubmitting(true);
    const rate = 45; // SVC-REMOTE default
    const res = await fetch("/api/invoices", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        customer: selectedCustomer,
        items: [{ item_code: "SVC-REMOTE", item_name: "Remote Support", qty: bucket.hours, rate }],
      }),
    });
    const data = await res.json();
    setResult(data);
    setSubmitting(false);
    if (res.ok) setTimeout(() => { setOpen(false); setResult(null); }, 1500);
  }

  if (customerList.length === 0) return null;

  return (
    <>
      <button onClick={() => setOpen(true)} style={{ ...btnStyle(), background: "#0D6E6E" }}>
        Bill Unbilled Hours ({customerList.length})
      </button>
      {open && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ background: "#1e293b", border: "1px solid #334155", borderRadius: "12px", padding: "24px", width: "420px" }}>
            <h2 style={{ margin: "0 0 16px", fontSize: "15px", fontWeight: 700, color: "#f1f5f9" }}>Bill Unbilled Hours</h2>
            <select value={selectedCustomer} onChange={(e) => setSelectedCustomer(e.target.value)} style={{ ...inputStyle(), marginBottom: "12px" }}>
              <option value="">— Select customer —</option>
              {customerList.map((c) => (
                <option key={c} value={c}>{c} ({unbilledByCustomer[c].hours.toFixed(2)}h)</option>
              ))}
            </select>
            {selectedCustomer && unbilledByCustomer[selectedCustomer] && (
              <div style={{ fontSize: "13px", color: "#94a3b8", marginBottom: "14px" }}>
                {unbilledByCustomer[selectedCustomer].hours.toFixed(2)}h × $45/hr = ${(unbilledByCustomer[selectedCustomer].hours * 45).toFixed(2)}
              </div>
            )}
            {result?.error && <div style={{ color: "#f87171", fontSize: "12px", marginBottom: "8px" }}>⚠ {result.error}</div>}
            {result?.name && <div style={{ color: "#34d399", fontSize: "12px", marginBottom: "8px" }}>✓ Invoice created: {result.name}</div>}
            <div style={{ display: "flex", gap: "8px" }}>
              <button onClick={submit} disabled={submitting || !selectedCustomer} style={{ ...btnStyle(), opacity: submitting || !selectedCustomer ? 0.6 : 1 }}>
                {submitting ? "Creating…" : "Create Invoice"}
              </button>
              <button onClick={() => setOpen(false)} style={btnStyle(false)}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
