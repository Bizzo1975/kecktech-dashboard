const BASE = process.env.ERPNEXT_URL || "https://ops.kecktech.net";
const KEY = process.env.ERPNEXT_API_KEY || "";
const SECRET = process.env.ERPNEXT_API_SECRET || "";

function authHeader() {
  return {
    Authorization: `token ${KEY}:${SECRET}`,
    "Content-Type": "application/json",
  };
}

export type Invoice = {
  name: string;
  customer: string;
  status: string;
  grand_total: number;
  outstanding_amount: number;
  due_date: string;
  posting_date: string;
};

export type PurchaseInvoice = {
  name: string;
  supplier: string;
  status: string;
  grand_total: number;
  outstanding_amount: number;
  due_date: string;
  posting_date: string;
};

export type Lead = {
  name: string;
  lead_name: string;
  company_name: string;
  email_id: string;
  phone: string;
  status: string;
  utm_source: string;
  creation: string;
  modified: string;
};

export type Customer = {
  name: string;
  customer_name: string;
};

export type TimesheetEntry = {
  name: string;
  employee_name: string;
  customer: string;
  total_hours: number;
  start_date: string;
  docstatus: number; // 0=draft, 1=submitted/billed
  note?: string;
};

export type Subscription = {
  name: string;
  party: string;
  status: string;
};

async function erpFetch<T>(path: string): Promise<{ data: T | null; error?: string }> {
  if (!KEY || !SECRET) return { data: null, error: "ERPNext credentials not configured" };
  try {
    const res = await fetch(`${BASE}${path}`, { headers: authHeader(), cache: "no-store" });
    if (!res.ok) return { data: null, error: `ERPNext HTTP ${res.status}` };
    const json = await res.json();
    return { data: json.data ?? json };
  } catch (e) {
    return { data: null, error: String(e) };
  }
}

// ── Sales Invoices (AR) ───────────────────────────────────────────────────────

export async function getOpenInvoices(): Promise<{ invoices: Invoice[]; error?: string }> {
  const filters = encodeURIComponent(JSON.stringify([["status", "in", ["Unpaid", "Overdue", "Partly Paid"]]]));
  const fields = encodeURIComponent(JSON.stringify(["name","customer","status","grand_total","outstanding_amount","due_date","posting_date"]));
  const { data, error } = await erpFetch<Invoice[]>(`/api/resource/Sales Invoice?filters=${filters}&fields=${fields}&limit=100&order_by=due_date asc`);
  return { invoices: data ?? [], error };
}

// ── Purchase Invoices (AP) ────────────────────────────────────────────────────

export async function getPurchaseInvoices(): Promise<{ invoices: PurchaseInvoice[]; error?: string }> {
  const filters = encodeURIComponent(JSON.stringify([["status", "!=", "Paid"]]));
  const fields = encodeURIComponent(JSON.stringify(["name","supplier","status","grand_total","outstanding_amount","due_date","posting_date"]));
  const { data, error } = await erpFetch<PurchaseInvoice[]>(`/api/resource/Purchase Invoice?filters=${filters}&fields=${fields}&limit=50&order_by=due_date asc`);
  return { invoices: data ?? [], error };
}

// ── Timesheets ────────────────────────────────────────────────────────────────

export async function getTimesheets(): Promise<{ timesheets: TimesheetEntry[]; error?: string }> {
  const fields = encodeURIComponent(JSON.stringify(["name","employee_name","customer","total_hours","start_date","docstatus","note"]));
  const { data, error } = await erpFetch<TimesheetEntry[]>(`/api/resource/Timesheet?fields=${fields}&limit=100&order_by=start_date desc`);
  return { timesheets: data ?? [], error };
}

export async function createTimesheet(payload: {
  customer: string;
  hours: number;
  description: string;
  date: string;
}): Promise<{ name?: string; error?: string }> {
  if (!KEY || !SECRET) return { error: "ERPNext credentials not configured" };
  try {
    const body = {
      doctype: "Timesheet",
      customer: payload.customer,
      start_date: payload.date,
      time_logs: [
        {
          activity_type: "Support",
          from_time: `${payload.date} 08:00:00`,
          to_time: (() => {
            const totalMins = Math.round(payload.hours * 60);
            const h = 8 + Math.floor(totalMins / 60);
            const m = totalMins % 60;
            return `${payload.date} ${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:00`;
          })(),
          hours: payload.hours,
          description: payload.description,
        },
      ],
    };
    const res = await fetch(`${BASE}/api/resource/Timesheet`, {
      method: "POST",
      headers: authHeader(),
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const txt = await res.text();
      return { error: `ERPNext HTTP ${res.status}: ${txt.slice(0, 200)}` };
    }
    const data = await res.json();
    return { name: data.data?.name };
  } catch (e) {
    return { error: String(e) };
  }
}

// ── Customers ─────────────────────────────────────────────────────────────────

export async function getCustomers(): Promise<{ customers: Customer[]; error?: string }> {
  const fields = encodeURIComponent(JSON.stringify(["name","customer_name"]));
  const { data, error } = await erpFetch<Customer[]>(`/api/resource/Customer?fields=${fields}&limit=200&order_by=customer_name asc`);
  return { customers: data ?? [], error };
}

// ── Leads ─────────────────────────────────────────────────────────────────────

export async function getLeads(): Promise<{ leads: Lead[]; error?: string }> {
  const fields = encodeURIComponent(JSON.stringify(["name","lead_name","company_name","email_id","phone","status","utm_source","creation","modified"]));
  const { data, error } = await erpFetch<Lead[]>(`/api/resource/Lead?fields=${fields}&limit=100&order_by=modified desc`);
  return { leads: data ?? [], error };
}

export async function createLead(payload: {
  lead_name: string;
  company_name?: string;
  phone?: string;
  email_id?: string;
  source?: string;
  notes?: string;
}): Promise<{ name?: string; error?: string }> {
  if (!KEY || !SECRET) return { error: "ERPNext credentials not configured" };
  try {
    const body = { doctype: "Lead", ...payload };
    const res = await fetch(`${BASE}/api/resource/Lead`, {
      method: "POST",
      headers: authHeader(),
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const txt = await res.text();
      return { error: `ERPNext HTTP ${res.status}: ${txt.slice(0, 200)}` };
    }
    const data = await res.json();
    return { name: data.data?.name };
  } catch (e) {
    return { error: String(e) };
  }
}

export async function updateLead(
  name: string,
  patch: { status?: string; notes?: string }
): Promise<{ error?: string }> {
  if (!KEY || !SECRET) return { error: "ERPNext credentials not configured" };
  try {
    const res = await fetch(`${BASE}/api/resource/Lead/${encodeURIComponent(name)}`, {
      method: "PUT",
      headers: authHeader(),
      body: JSON.stringify(patch),
    });
    if (!res.ok) return { error: `ERPNext HTTP ${res.status}` };
    return {};
  } catch (e) {
    return { error: String(e) };
  }
}

// ── Projects ──────────────────────────────────────────────────────────────────

export type Project = {
  name: string;
  project_name: string;
  customer: string;
  status: string;
  percent_complete: number;
  expected_end_date: string;
  creation: string;
};

export async function getProjects(): Promise<{ projects: Project[]; error?: string }> {
  const filters = encodeURIComponent(JSON.stringify([["status", "in", ["Open", "Completed"]]]));
  const fields = encodeURIComponent(JSON.stringify(["name","project_name","customer","status","percent_complete","expected_end_date","creation"]));
  const { data, error } = await erpFetch<Project[]>(`/api/resource/Project?filters=${filters}&fields=${fields}&limit=50&order_by=creation desc`);
  return { projects: data ?? [], error };
}

// ── Assets (HaaS leased hardware) ─────────────────────────────────────────────

export type AssetRecord = {
  name: string;
  asset_name: string;
  asset_category: string;
  customer: string;
  purchase_date: string;
  status: string;
  is_existing_asset: number;
};

export async function getHaasAssets(): Promise<{ assets: AssetRecord[]; error?: string }> {
  const filters = encodeURIComponent(JSON.stringify([["asset_category", "=", "Leased Hardware"]]));
  const fields = encodeURIComponent(JSON.stringify(["name","asset_name","asset_category","customer","purchase_date","status","is_existing_asset"]));
  const { data, error } = await erpFetch<AssetRecord[]>(`/api/resource/Asset?filters=${filters}&fields=${fields}&limit=200&order_by=purchase_date asc`);
  return { assets: data ?? [], error };
}

// ── Suppliers ─────────────────────────────────────────────────────────────────

export type Supplier = {
  name: string;
  supplier_name: string;
};

export async function getSuppliers(): Promise<{ suppliers: Supplier[]; error?: string }> {
  const fields = encodeURIComponent(JSON.stringify(["name","supplier_name"]));
  const { data, error } = await erpFetch<Supplier[]>(`/api/resource/Supplier?fields=${fields}&limit=200&order_by=supplier_name asc`);
  return { suppliers: data ?? [], error };
}

// ── Lead detail + write operations ────────────────────────────────────────────

export type LeadDetail = Lead & {
  notes?: string;
  lead_owner?: string;
  source?: string;
  industry?: string;
  website?: string;
  no_of_employees?: string;
};

export async function getLeadDetail(id: string): Promise<{ lead: LeadDetail | null; error?: string }> {
  const { data, error } = await erpFetch<LeadDetail>(`/api/resource/Lead/${encodeURIComponent(id)}`);
  return { lead: data, error };
}

export async function updateLeadStatus(
  id: string,
  status: string
): Promise<{ error?: string }> {
  if (!KEY || !SECRET) return { error: "ERPNext credentials not configured" };
  try {
    const res = await fetch(`${BASE}/api/resource/Lead/${encodeURIComponent(id)}`, {
      method: "PUT",
      headers: authHeader(),
      body: JSON.stringify({ status }),
    });
    if (!res.ok) return { error: `ERPNext HTTP ${res.status}` };
    return {};
  } catch (e) {
    return { error: String(e) };
  }
}

// ── Opportunities ─────────────────────────────────────────────────────────────

export type Opportunity = {
  name: string;
  lead_name?: string;
  customer_name: string;
  opportunity_amount: number;
  probability: number;
  status: string;
  sales_stage: string;
  expected_closing: string;
  creation: string;
  modified: string;
};

export async function getOpportunities(): Promise<{ opportunities: Opportunity[]; error?: string }> {
  const filters = encodeURIComponent(JSON.stringify([["status", "not in", ["Closed", "Lost"]]]));
  const fields = encodeURIComponent(JSON.stringify(["name","lead_name","customer_name","opportunity_amount","probability","status","sales_stage","expected_closing","creation","modified"]));
  const { data, error } = await erpFetch<Opportunity[]>(`/api/resource/Opportunity?filters=${filters}&fields=${fields}&limit=100&order_by=modified desc`);
  return { opportunities: data ?? [], error };
}

export async function createOpportunity(payload: {
  lead?: string;
  customer_name: string;
  opportunity_amount?: number;
  probability?: number;
  expected_closing?: string;
}): Promise<{ name?: string; error?: string }> {
  if (!KEY || !SECRET) return { error: "ERPNext credentials not configured" };
  try {
    const body = {
      doctype: "Opportunity",
      opportunity_from: payload.lead ? "Lead" : "Customer",
      party_name: payload.lead || payload.customer_name,
      customer_name: payload.customer_name,
      opportunity_amount: payload.opportunity_amount ?? 0,
      probability: payload.probability ?? 20,
      expected_closing: payload.expected_closing ?? new Date(Date.now() + 30 * 86_400_000).toISOString().split("T")[0],
    };
    const res = await fetch(`${BASE}/api/resource/Opportunity`, {
      method: "POST",
      headers: authHeader(),
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const txt = await res.text();
      return { error: `ERPNext HTTP ${res.status}: ${txt.slice(0, 200)}` };
    }
    const data = await res.json();
    return { name: data.data?.name };
  } catch (e) {
    return { error: String(e) };
  }
}

// ── Sales Invoice write operations ────────────────────────────────────────────

export type InvoiceLineItem = {
  item_code: string;
  item_name?: string;
  qty: number;
  rate: number;
  description?: string;
};

export async function createInvoice(payload: {
  customer: string;
  items: InvoiceLineItem[];
  due_date?: string;
  project?: string;
}): Promise<{ name?: string; error?: string }> {
  if (!KEY || !SECRET) return { error: "ERPNext credentials not configured" };
  try {
    const dueDate = payload.due_date ?? new Date(Date.now() + 30 * 86_400_000).toISOString().split("T")[0];
    const body = {
      doctype: "Sales Invoice",
      customer: payload.customer,
      due_date: dueDate,
      project: payload.project,
      items: payload.items.map((item) => ({
        item_code: item.item_code,
        item_name: item.item_name ?? item.item_code,
        qty: item.qty,
        rate: item.rate,
        description: item.description,
      })),
    };
    const res = await fetch(`${BASE}/api/resource/Sales Invoice`, {
      method: "POST",
      headers: authHeader(),
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const txt = await res.text();
      return { error: `ERPNext HTTP ${res.status}: ${txt.slice(0, 200)}` };
    }
    const data = await res.json();
    return { name: data.data?.name };
  } catch (e) {
    return { error: String(e) };
  }
}

export async function submitDoc(doctype: string, name: string): Promise<{ error?: string }> {
  if (!KEY || !SECRET) return { error: "ERPNext credentials not configured" };
  try {
    const res = await fetch(
      `${BASE}/api/resource/${encodeURIComponent(doctype)}/${encodeURIComponent(name)}/submit`,
      { method: "POST", headers: authHeader() }
    );
    if (!res.ok) {
      const txt = await res.text();
      return { error: `ERPNext HTTP ${res.status}: ${txt.slice(0, 200)}` };
    }
    return {};
  } catch (e) {
    return { error: String(e) };
  }
}

export async function createPaymentEntry(payload: {
  invoiceName: string;
  amount: number;
  paymentType: "Receive" | "Pay";
  partyType: "Customer" | "Supplier";
  party: string;
  mode?: string;
  referenceDate?: string;
}): Promise<{ name?: string; error?: string }> {
  if (!KEY || !SECRET) return { error: "ERPNext credentials not configured" };
  try {
    const refDate = payload.referenceDate ?? new Date().toISOString().split("T")[0];
    const doctype = payload.partyType === "Customer" ? "Sales Invoice" : "Purchase Invoice";
    const body = {
      doctype: "Payment Entry",
      payment_type: payload.paymentType,
      party_type: payload.partyType,
      party: payload.party,
      paid_amount: payload.amount,
      received_amount: payload.amount,
      mode_of_payment: payload.mode ?? "Bank",
      reference_date: refDate,
      posting_date: refDate,
      references: [
        {
          reference_doctype: doctype,
          reference_name: payload.invoiceName,
          allocated_amount: payload.amount,
        },
      ],
    };
    const res = await fetch(`${BASE}/api/resource/Payment Entry`, {
      method: "POST",
      headers: authHeader(),
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const txt = await res.text();
      return { error: `ERPNext HTTP ${res.status}: ${txt.slice(0, 200)}` };
    }
    const data = await res.json();
    return { name: data.data?.name };
  } catch (e) {
    return { error: String(e) };
  }
}

export async function createPurchaseInvoice(payload: {
  supplier: string;
  items: InvoiceLineItem[];
  due_date?: string;
}): Promise<{ name?: string; error?: string }> {
  if (!KEY || !SECRET) return { error: "ERPNext credentials not configured" };
  try {
    const dueDate = payload.due_date ?? new Date(Date.now() + 30 * 86_400_000).toISOString().split("T")[0];
    const body = {
      doctype: "Purchase Invoice",
      supplier: payload.supplier,
      due_date: dueDate,
      items: payload.items.map((item) => ({
        item_code: item.item_code,
        item_name: item.item_name ?? item.item_code,
        qty: item.qty,
        rate: item.rate,
        description: item.description,
      })),
    };
    const res = await fetch(`${BASE}/api/resource/Purchase Invoice`, {
      method: "POST",
      headers: authHeader(),
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const txt = await res.text();
      return { error: `ERPNext HTTP ${res.status}: ${txt.slice(0, 200)}` };
    }
    const data = await res.json();
    return { name: data.data?.name };
  } catch (e) {
    return { error: String(e) };
  }
}

export async function addLeadNote(
  leadId: string,
  note: string
): Promise<{ error?: string }> {
  if (!KEY || !SECRET) return { error: "ERPNext credentials not configured" };
  try {
    const res = await fetch(`${BASE}/api/resource/CRM Note`, {
      method: "POST",
      headers: authHeader(),
      body: JSON.stringify({
        doctype: "CRM Note",
        note,
        reference_doctype: "Lead",
        reference_docname: leadId,
      }),
    });
    if (!res.ok) {
      // fallback: update the notes field on the Lead document
      const patchRes = await fetch(`${BASE}/api/resource/Lead/${encodeURIComponent(leadId)}`, {
        method: "PUT",
        headers: authHeader(),
        body: JSON.stringify({ notes: note }),
      });
      if (!patchRes.ok) return { error: `ERPNext HTTP ${patchRes.status}` };
    }
    return {};
  } catch (e) {
    return { error: String(e) };
  }
}

export async function getSubscriptionsByParty(): Promise<{
  byParty: Record<string, Array<{ name: string; plans: string; mrr: number }>>;
  error?: string;
}> {
  const filters = encodeURIComponent(JSON.stringify([["status", "=", "Active"]]));
  const fields = encodeURIComponent(JSON.stringify(["name","party","status"]));
  const { data, error } = await erpFetch<Array<{ name: string; party: string; status: string }>>(
    `/api/resource/Subscription?filters=${filters}&fields=${fields}&limit=200`
  );
  if (!data) return { byParty: {}, error };

  const byParty: Record<string, Array<{ name: string; plans: string; mrr: number }>> = {};
  for (const sub of data) {
    if (!byParty[sub.party]) byParty[sub.party] = [];
    byParty[sub.party].push({ name: sub.name, plans: "", mrr: 0 });
  }
  return { byParty, error };
}

// Known monthly prices per Subscription Plan name (matches ERPNext items)
const PLAN_PRICES: Record<string, number> = {
  "SVC-MSP": 199,
  "SVC-HAAS": 149,
  "SVC-SENIOR": 79,
  "SVC-HOSTING": 49,
  "SVC-MSP-SEC": 49,
};

// ── Subscriptions (MRR / ARR) ─────────────────────────────────────────────────

export async function getSubscriptions(): Promise<{ subscriptions: Subscription[]; mrr: number; arr: number; error?: string }> {
  const filters = encodeURIComponent(JSON.stringify([["status", "=", "Active"]]));
  const fields = encodeURIComponent(JSON.stringify(["name","party","status"]));
  const { data, error } = await erpFetch<Subscription[]>(`/api/resource/Subscription?filters=${filters}&fields=${fields}&limit=200`);
  const subscriptions = data ?? [];

  if (subscriptions.length === 0 || !KEY || !SECRET) {
    return { subscriptions, mrr: 0, arr: 0, error };
  }

  // Fetch each subscription document to get the plans child table (list API omits child tables)
  let mrr = 0;
  try {
    const docs = await Promise.all(
      subscriptions.map((s) =>
        fetch(`${BASE}/api/resource/Subscription/${encodeURIComponent(s.name)}`, {
          headers: authHeader(),
          cache: "no-store",
        })
          .then((r) => r.json())
          .then((j) => j.data ?? null)
          .catch(() => null)
      )
    );
    for (const doc of docs) {
      if (!doc?.plans) continue;
      for (const line of doc.plans as Array<{ plan: string; qty: number }>) {
        const price = PLAN_PRICES[line.plan] ?? 0;
        mrr += price * (line.qty ?? 1);
      }
    }
  } catch {
    // If individual fetches fail, fall back to zero rather than crashing
  }

  return { subscriptions, mrr, arr: mrr * 12, error };
}
