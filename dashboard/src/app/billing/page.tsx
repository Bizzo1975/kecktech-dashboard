import { getUser } from "@/lib/auth";
import {
  getOpenInvoices,
  getPurchaseInvoices,
  getTimesheets,
  getSubscriptions,
  getCustomers,
  getSuppliers,
  getProjects,
} from "@/lib/erpnext";
import {
  NewInvoiceButton,
  RecordPaymentButton,
  NewBillButton,
  MarkAPPaidButton,
  BillUnbilledButton,
} from "@/components/billing/InvoiceActions";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function fmt(n: number) {
  return n.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
}

function fmtFull(n: number) {
  return n.toLocaleString("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 2 });
}

function daysDiff(dateStr: string) {
  if (!dateStr) return 0;
  return Math.floor((Date.now() - new Date(dateStr).getTime()) / 86_400_000);
}

function KpiCard({ label, value, sub, color }: { label: string; value: string; sub?: string; color?: string }) {
  return (
    <div style={{ background: "#1e293b", border: "1px solid #334155", borderRadius: "10px", padding: "18px 20px", flex: 1, minWidth: 0 }}>
      <div style={{ fontSize: "11px", color: "#64748b", fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "6px" }}>{label}</div>
      <div style={{ fontSize: "24px", fontWeight: 700, color: color || "#f1f5f9" }}>{value}</div>
      {sub && <div style={{ fontSize: "12px", color: "#64748b", marginTop: "2px" }}>{sub}</div>}
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h2 style={{ margin: "0 0 14px", fontSize: "16px", fontWeight: 600, color: "#e2e8f0" }}>{children}</h2>;
}

function ErrorCard({ msg }: { msg: string }) {
  return (
    <div style={{ background: "#1e293b", border: "1px solid #334155", borderRadius: "10px", padding: "16px", color: "#f87171", fontSize: "13px", marginBottom: "16px" }}>
      ⚠ {msg}
    </div>
  );
}

export default async function BillingPage() {
  const user = await getUser();
  if (!user.canBilling) redirect("/");

  const [
    { invoices: arInvoices, error: arErr },
    { invoices: apInvoices, error: apErr },
    { timesheets, error: tsErr },
    { mrr, arr, error: subErr },
    { customers },
    { suppliers },
    { projects },
  ] = await Promise.all([
    getOpenInvoices(),
    getPurchaseInvoices(),
    getTimesheets(),
    getSubscriptions(),
    getCustomers(),
    getSuppliers(),
    getProjects(),
  ]);

  // AR metrics
  const totalAR = arInvoices.reduce((s, i) => s + (i.outstanding_amount || 0), 0);
  const totalAP = apInvoices.reduce((s, i) => s + (i.outstanding_amount || 0), 0);
  const netPosition = totalAR - totalAP;

  const now = Date.now();
  const thirtyDays = 30 * 86_400_000;
  const projectedCollections = arInvoices
    .filter((i) => new Date(i.due_date).getTime() < now + thirtyDays)
    .reduce((s, i) => s + i.outstanding_amount, 0);

  // AR aging buckets
  const aging = { current: 0, d30: 0, d60: 0, d90: 0 };
  for (const inv of arInvoices) {
    const days = daysDiff(inv.due_date);
    if (days <= 0) aging.current += inv.outstanding_amount;
    else if (days <= 30) aging.d30 += inv.outstanding_amount;
    else if (days <= 60) aging.d60 += inv.outstanding_amount;
    else aging.d90 += inv.outstanding_amount;
  }

  const unbilledHours = timesheets.filter((t) => t.docstatus === 0).reduce((s, t) => s + (t.total_hours || 0), 0);
  const overdueInvoices = arInvoices.filter((i) => daysDiff(i.due_date) > 0);

  // Supplier balance roll-up for AP
  const supplierBalances: Record<string, number> = {};
  for (const inv of apInvoices) {
    supplierBalances[inv.supplier] = (supplierBalances[inv.supplier] || 0) + inv.outstanding_amount;
  }

  return (
    <div style={{ padding: "28px 32px", maxWidth: "1400px", margin: "0 auto" }}>
      <h1 style={{ margin: "0 0 4px", fontSize: "22px", fontWeight: 700, color: "#f1f5f9" }}>Billing & Revenue</h1>
      <p style={{ margin: "0 0 28px", color: "#64748b", fontSize: "13px" }}>
        AR · AP · Timesheets · Subscriptions · Projects
      </p>

      {/* ── KPI Row ─────────────────────────────────────────────────────────── */}
      <div style={{ display: "flex", gap: "14px", marginBottom: "24px", flexWrap: "wrap" }}>
        <KpiCard label="MRR" value={fmt(mrr)} sub={subErr ? `⚠ ${subErr}` : "Monthly recurring"} />
        <KpiCard label="ARR" value={fmt(arr)} sub="Annual run rate" />
        <KpiCard label="Outstanding AR" value={fmt(totalAR)} color={totalAR > 0 ? "#fbbf24" : "#34d399"} sub={`${arInvoices.length} open invoices`} />
        <KpiCard label="Unbilled Hours" value={`${unbilledHours.toFixed(1)}h`} color={unbilledHours > 0 ? "#fb923c" : "#34d399"} sub="Draft timesheets" />
        <KpiCard label="Net AR–AP" value={fmt(netPosition)} color={netPosition >= 0 ? "#34d399" : "#f87171"} sub="Cash flow position" />
        <KpiCard label="30-Day Collections" value={fmt(projectedCollections)} sub="Due within 30 days" color="#60a5fa" />
      </div>

      {/* ── AR section ────────────────────────────────────────────────────────── */}
      <section style={{ marginBottom: "32px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px", flexWrap: "wrap", gap: "8px" }}>
          <SectionTitle>📤 Accounts Receivable</SectionTitle>
          <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
            <BillUnbilledButton timesheets={timesheets} customers={customers} />
            <NewInvoiceButton customers={customers} />
          </div>
        </div>

        {arErr && <ErrorCard msg={arErr} />}

        {/* Aging summary */}
        <div style={{ display: "flex", gap: "12px", marginBottom: "16px", flexWrap: "wrap" }}>
          {[
            { label: "Current", amount: aging.current, color: "#34d399" },
            { label: "1–30 days", amount: aging.d30, color: "#fbbf24" },
            { label: "31–60 days", amount: aging.d60, color: "#fb923c" },
            { label: "61+ days", amount: aging.d90, color: "#f87171" },
          ].map((b) => (
            <div key={b.label} style={{ flex: 1, minWidth: "140px", background: "#1e293b", border: `1px solid ${b.color}33`, borderTop: `3px solid ${b.color}`, borderRadius: "8px", padding: "12px 14px" }}>
              <div style={{ fontSize: "11px", color: "#64748b", marginBottom: "4px" }}>{b.label}</div>
              <div style={{ fontSize: "18px", fontWeight: 700, color: b.amount > 0 ? b.color : "#475569" }}>{fmt(b.amount)}</div>
            </div>
          ))}
        </div>

        {/* Overdue follow-up queue */}
        {overdueInvoices.length > 0 && (
          <div style={{ background: "#1c0a0a", border: "1px solid #f8717144", borderRadius: "10px", padding: "14px 16px", marginBottom: "16px" }}>
            <div style={{ fontSize: "13px", fontWeight: 600, color: "#f87171", marginBottom: "10px" }}>
              ⚠ {overdueInvoices.length} Overdue Invoice{overdueInvoices.length > 1 ? "s" : ""} — Follow Up Required
            </div>
            {overdueInvoices.map((inv) => {
              const days = daysDiff(inv.due_date);
              const subject = `Overdue Invoice ${inv.name}`;
              const body = `Dear ${inv.customer},\n\nThis is a reminder that invoice ${inv.name} for ${fmtFull(inv.outstanding_amount)} was due on ${inv.due_date} (${days} days ago).\n\nPlease remit payment at your earliest convenience.\n\nThank you,\nKecktech IT Solutions`;
              const mailto = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
              return (
                <div key={inv.name} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "6px 0", borderBottom: "1px solid #1e293b", gap: "12px" }}>
                  <span style={{ fontSize: "13px", color: "#e2e8f0" }}>{inv.customer} · {inv.name} · {fmtFull(inv.outstanding_amount)}</span>
                  <div style={{ display: "flex", gap: "8px", flexShrink: 0 }}>
                    <span style={{ fontSize: "11px", color: "#f87171" }}>+{days}d overdue</span>
                    <a href={mailto} style={{ fontSize: "11px", color: "#60a5fa", textDecoration: "none", border: "1px solid #334155", borderRadius: "4px", padding: "2px 8px" }}>
                      Send Reminder
                    </a>
                    <RecordPaymentButton invoice={inv} />
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Invoice table */}
        {!arErr && arInvoices.length > 0 && (
          <div style={{ background: "#1e293b", border: "1px solid #334155", borderRadius: "10px", overflow: "hidden" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
              <thead>
                <tr style={{ borderBottom: "1px solid #334155" }}>
                  {["Customer", "Invoice #", "Total", "Outstanding", "Due Date", "Status", ""].map((h) => (
                    <th key={h} style={{ padding: "10px 14px", textAlign: "left", color: "#64748b", fontWeight: 500, fontSize: "11px", textTransform: "uppercase" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {arInvoices.map((inv) => {
                  const days = daysDiff(inv.due_date);
                  const overdue = days > 0;
                  return (
                    <tr key={inv.name} style={{ borderBottom: "1px solid #0f172a", background: overdue ? "#1c0a0a22" : "transparent" }}>
                      <td style={{ padding: "10px 14px", color: "#e2e8f0" }}>{inv.customer}</td>
                      <td style={{ padding: "10px 14px" }}>
                        <a href={`https://ops.kecktech.net/app/sales-invoice/${inv.name}`} target="_blank" rel="noopener noreferrer" style={{ color: "#3b82f6", textDecoration: "none" }}>
                          {inv.name}
                        </a>
                      </td>
                      <td style={{ padding: "10px 14px", color: "#94a3b8" }}>{fmtFull(inv.grand_total)}</td>
                      <td style={{ padding: "10px 14px", color: overdue ? "#f87171" : "#34d399", fontWeight: 600 }}>{fmtFull(inv.outstanding_amount)}</td>
                      <td style={{ padding: "10px 14px", color: "#94a3b8" }}>{inv.due_date}</td>
                      <td style={{ padding: "10px 14px" }}>
                        <span style={{ fontSize: "11px", padding: "2px 8px", borderRadius: "999px", background: `${overdue ? "#f87171" : "#34d399"}22`, color: overdue ? "#f87171" : "#34d399", border: `1px solid ${overdue ? "#f87171" : "#34d399"}44` }}>
                          {overdue ? `+${days}d` : inv.status}
                        </span>
                      </td>
                      <td style={{ padding: "10px 14px" }}>
                        <RecordPaymentButton invoice={inv} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        {!arErr && arInvoices.length === 0 && (
          <div style={{ background: "#1e293b", border: "1px solid #334155", borderRadius: "10px", padding: "24px", textAlign: "center", color: "#475569", fontSize: "13px" }}>
            ✅ No open receivables
          </div>
        )}
      </section>

      {/* ── Timesheets ─────────────────────────────────────────────────────────── */}
      <section style={{ marginBottom: "32px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px" }}>
          <SectionTitle>⏱ Billable Time</SectionTitle>
          <a href="https://ops.kecktech.net/app/timesheet" target="_blank" rel="noopener noreferrer" style={{ fontSize: "12px", color: "#3b82f6" }}>
            Open ERPNext ↗
          </a>
        </div>
        {tsErr && <ErrorCard msg={tsErr} />}
        {!tsErr && timesheets.length > 0 && (
          <div style={{ background: "#1e293b", border: "1px solid #334155", borderRadius: "10px", overflow: "hidden" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
              <thead>
                <tr style={{ borderBottom: "1px solid #334155" }}>
                  {["Date", "Tech", "Customer", "Hours", "Notes", "Billed?"].map((h) => (
                    <th key={h} style={{ padding: "10px 14px", textAlign: "left", color: "#64748b", fontWeight: 500, fontSize: "11px", textTransform: "uppercase" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {timesheets.map((ts) => (
                  <tr key={ts.name} style={{ borderBottom: "1px solid #0f172a" }}>
                    <td style={{ padding: "10px 14px", color: "#94a3b8", whiteSpace: "nowrap" }}>{ts.start_date}</td>
                    <td style={{ padding: "10px 14px", color: "#e2e8f0" }}>{ts.employee_name || "—"}</td>
                    <td style={{ padding: "10px 14px", color: "#e2e8f0" }}>{ts.customer || "—"}</td>
                    <td style={{ padding: "10px 14px", color: "#f1f5f9", fontWeight: 600 }}>{(ts.total_hours || 0).toFixed(2)}</td>
                    <td style={{ padding: "10px 14px", color: "#64748b", maxWidth: "200px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{ts.note || "—"}</td>
                    <td style={{ padding: "10px 14px" }}>
                      <span style={{ fontSize: "11px", padding: "2px 8px", borderRadius: "999px", background: ts.docstatus === 1 ? "#34d39922" : "#fb923c22", color: ts.docstatus === 1 ? "#34d399" : "#fb923c", border: `1px solid ${ts.docstatus === 1 ? "#34d39944" : "#fb923c44"}` }}>
                        {ts.docstatus === 1 ? "Billed" : "Draft"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {!tsErr && timesheets.length === 0 && (
          <div style={{ background: "#1e293b", border: "1px solid #334155", borderRadius: "10px", padding: "24px", textAlign: "center", color: "#475569", fontSize: "13px" }}>
            No timesheet entries found
          </div>
        )}
      </section>

      {/* ── AP section ─────────────────────────────────────────────────────────── */}
      <section style={{ marginBottom: "32px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px", flexWrap: "wrap", gap: "8px" }}>
          <SectionTitle>📥 Accounts Payable</SectionTitle>
          <div style={{ display: "flex", gap: "8px" }}>
            <a href="https://ops.kecktech.net/app/purchase-invoice" target="_blank" rel="noopener noreferrer" style={{ fontSize: "12px", color: "#3b82f6" }}>Open ERPNext ↗</a>
            <NewBillButton suppliers={suppliers} />
          </div>
        </div>

        {/* Supplier balance summary */}
        {Object.keys(supplierBalances).length > 0 && (
          <div style={{ display: "flex", gap: "10px", marginBottom: "14px", flexWrap: "wrap" }}>
            {Object.entries(supplierBalances).map(([sup, bal]) => (
              <div key={sup} style={{ background: "#1e293b", border: "1px solid #334155", borderRadius: "8px", padding: "10px 14px", minWidth: "140px" }}>
                <div style={{ fontSize: "11px", color: "#64748b", marginBottom: "4px" }}>{sup}</div>
                <div style={{ fontSize: "16px", fontWeight: 700, color: "#fbbf24" }}>{fmt(bal)}</div>
              </div>
            ))}
          </div>
        )}

        {apErr && <ErrorCard msg={apErr} />}
        {!apErr && apInvoices.length === 0 && (
          <div style={{ background: "#1e293b", border: "1px solid #334155", borderRadius: "10px", padding: "24px", textAlign: "center", color: "#475569", fontSize: "13px" }}>
            ✅ No open payables
          </div>
        )}
        {!apErr && apInvoices.length > 0 && (
          <div style={{ background: "#1e293b", border: "1px solid #334155", borderRadius: "10px", overflow: "hidden" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
              <thead>
                <tr style={{ borderBottom: "1px solid #334155" }}>
                  {["Vendor", "Invoice #", "Amount", "Outstanding", "Due Date", "Status", ""].map((h) => (
                    <th key={h} style={{ padding: "10px 14px", textAlign: "left", color: "#64748b", fontWeight: 500, fontSize: "11px", textTransform: "uppercase" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {apInvoices.map((inv) => {
                  const overdue = daysDiff(inv.due_date) > 0;
                  return (
                    <tr key={inv.name} style={{ borderBottom: "1px solid #0f172a", background: overdue ? "#1c0a0a22" : "transparent" }}>
                      <td style={{ padding: "10px 14px", color: "#e2e8f0" }}>{inv.supplier}</td>
                      <td style={{ padding: "10px 14px" }}>
                        <a href={`https://ops.kecktech.net/app/purchase-invoice/${inv.name}`} target="_blank" rel="noopener noreferrer" style={{ color: "#3b82f6", textDecoration: "none" }}>
                          {inv.name}
                        </a>
                      </td>
                      <td style={{ padding: "10px 14px", color: "#94a3b8" }}>{fmtFull(inv.grand_total)}</td>
                      <td style={{ padding: "10px 14px", color: overdue ? "#f87171" : "#34d399", fontWeight: 600 }}>{fmtFull(inv.outstanding_amount)}</td>
                      <td style={{ padding: "10px 14px", color: "#94a3b8" }}>{inv.due_date}</td>
                      <td style={{ padding: "10px 14px" }}>
                        <span style={{ fontSize: "11px", padding: "2px 8px", borderRadius: "999px", background: "#fbbf2422", color: "#fbbf24", border: "1px solid #fbbf2444" }}>
                          {inv.status}
                        </span>
                      </td>
                      <td style={{ padding: "10px 14px" }}>
                        <MarkAPPaidButton invoice={inv} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* ── Projects / AI Dev Milestones ──────────────────────────────────────── */}
      <section>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px" }}>
          <SectionTitle>🤖 AI Dev Projects</SectionTitle>
          <a href="https://ops.kecktech.net/app/project" target="_blank" rel="noopener noreferrer" style={{ fontSize: "12px", color: "#3b82f6" }}>
            Open ERPNext ↗
          </a>
        </div>
        {projects.length === 0 && (
          <div style={{ background: "#1e293b", border: "1px solid #334155", borderRadius: "10px", padding: "24px", textAlign: "center", color: "#475569", fontSize: "13px" }}>
            No open projects — <a href="https://ops.kecktech.net/app/project/new" target="_blank" rel="noopener noreferrer" style={{ color: "#3b82f6" }}>Create one in ERPNext ↗</a>
          </div>
        )}
        {projects.length > 0 && (
          <div style={{ background: "#1e293b", border: "1px solid #334155", borderRadius: "10px", overflow: "hidden" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
              <thead>
                <tr style={{ borderBottom: "1px solid #334155" }}>
                  {["Project", "Customer", "% Complete", "Target Date", "Status", ""].map((h) => (
                    <th key={h} style={{ padding: "10px 14px", textAlign: "left", color: "#64748b", fontWeight: 500, fontSize: "11px", textTransform: "uppercase" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {projects.map((p) => {
                  const pct = p.percent_complete || 0;
                  const pctColor = pct >= 75 ? "#34d399" : pct >= 40 ? "#fbbf24" : "#60a5fa";
                  return (
                    <tr key={p.name} style={{ borderBottom: "1px solid #0f172a" }}>
                      <td style={{ padding: "10px 14px" }}>
                        <a href={`https://ops.kecktech.net/app/project/${p.name}`} target="_blank" rel="noopener noreferrer" style={{ color: "#3b82f6", textDecoration: "none" }}>
                          {p.project_name}
                        </a>
                      </td>
                      <td style={{ padding: "10px 14px", color: "#e2e8f0" }}>{p.customer || "—"}</td>
                      <td style={{ padding: "10px 14px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                          <div style={{ flex: 1, height: "6px", background: "#334155", borderRadius: "3px", overflow: "hidden" }}>
                            <div style={{ width: `${pct}%`, height: "100%", background: pctColor, borderRadius: "3px" }} />
                          </div>
                          <span style={{ fontSize: "11px", color: pctColor, minWidth: "32px" }}>{pct}%</span>
                        </div>
                      </td>
                      <td style={{ padding: "10px 14px", color: "#94a3b8" }}>{p.expected_end_date || "—"}</td>
                      <td style={{ padding: "10px 14px" }}>
                        <span style={{ fontSize: "11px", padding: "2px 8px", borderRadius: "999px", background: "#60a5fa22", color: "#60a5fa", border: "1px solid #60a5fa44" }}>
                          {p.status}
                        </span>
                      </td>
                      <td style={{ padding: "10px 14px" }}>
                        <a
                          href={`https://ops.kecktech.net/app/sales-invoice/new?project=${encodeURIComponent(p.name)}&customer=${encodeURIComponent(p.customer || "")}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{ fontSize: "11px", color: "#C07810", border: "1px solid #C0781044", borderRadius: "4px", padding: "2px 8px", textDecoration: "none", whiteSpace: "nowrap" }}
                        >
                          + Milestone Invoice
                        </a>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
