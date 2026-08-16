import { NextRequest, NextResponse } from "next/server";

const ERP_BASE = process.env.ERPNEXT_URL || "https://ops.kecktech.net";
const ERP_KEY = process.env.ERPNEXT_API_KEY || "";
const ERP_SECRET = process.env.ERPNEXT_API_SECRET || "";

async function erpFetch<T>(path: string): Promise<{ data: T; status: number }> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);
  try {
    const res = await fetch(`${ERP_BASE}${path}`, {
      headers: {
        Authorization: `token ${ERP_KEY}:${ERP_SECRET}`,
        "Content-Type": "application/json",
      },
      signal: controller.signal,
      cache: "no-store",
    });
    clearTimeout(timeout);
    const json = await res.json() as T;
    return { data: json, status: res.status };
  } finally {
    clearTimeout(timeout);
  }
}

export async function GET(req: NextRequest) {
  const company = req.nextUrl.searchParams.get("company");
  if (!company) {
    return NextResponse.json({ error: "Missing company parameter" }, { status: 400 });
  }
  if (!ERP_KEY || !ERP_SECRET) {
    return NextResponse.json({ error: "ERPNext credentials not configured" }, { status: 503 });
  }

  try {
    const filters = encodeURIComponent(JSON.stringify([["customer_name", "=", company]]));
    const fields = encodeURIComponent(JSON.stringify(["name", "customer_name", "customer_group", "territory"]));
    const { data, status } = await erpFetch<{ data: { name: string; customer_name: string }[] }>(
      `/api/resource/Customer?filters=${filters}&fields=${fields}&limit=5`
    );

    if (status !== 200) {
      return NextResponse.json(
        { found: false, error: `ERPNext returned HTTP ${status}` },
        { status: 502 }
      );
    }

    const customers = Array.isArray(data?.data) ? data.data : [];
    const match = customers.find(
      (c) => c.customer_name.toLowerCase() === company.toLowerCase()
    );

    const erpNewUrl = `https://ops.kecktech.net/app/customer/new-customer-1?customer_name=${encodeURIComponent(company)}`;

    return NextResponse.json({
      found: !!match,
      customer: match ?? null,
      erpNewUrl,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ found: false, error: message }, { status: 502 });
  }
}
