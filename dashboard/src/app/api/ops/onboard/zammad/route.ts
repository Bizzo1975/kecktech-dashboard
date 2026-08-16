import { NextRequest, NextResponse } from "next/server";

const ZAMMAD_BASE = process.env.ZAMMAD_URL || "https://tickets.kecktech.net";
const ZAMMAD_TOKEN = process.env.ZAMMAD_API_TOKEN || "";

async function zammadFetch<T>(
  method: string,
  path: string,
  body?: unknown
): Promise<{ data: T; status: number }> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);
  try {
    const res = await fetch(`${ZAMMAD_BASE}/api/v1${path}`, {
      method,
      headers: {
        Authorization: `Token token=${ZAMMAD_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: body ? JSON.stringify(body) : undefined,
      signal: controller.signal,
      cache: "no-store",
    });
    clearTimeout(timeout);
    const data = res.status === 204 ? ({} as T) : await res.json() as T;
    return { data, status: res.status };
  } finally {
    clearTimeout(timeout);
  }
}

/** Find Zammad Organization ID by name. Returns null if not found. */
async function findOrg(company: string): Promise<number | null> {
  const { data } = await zammadFetch<{ id: number; name: string }[]>(
    "GET",
    `/organizations/search?query=${encodeURIComponent(company)}&limit=5`
  );
  const match = Array.isArray(data)
    ? data.find((o) => o.name.toLowerCase() === company.toLowerCase())
    : null;
  return match ? match.id : null;
}

/** Find Zammad User by email. Returns existing user or null. */
async function findUser(email: string): Promise<{ id: number; login: string } | null> {
  const { data } = await zammadFetch<{ id: number; login: string }[]>(
    "GET",
    `/users/search?query=${encodeURIComponent(email)}&limit=5`
  );
  const match = Array.isArray(data)
    ? data.find((u) => u.login.toLowerCase() === email.toLowerCase())
    : null;
  return match ?? null;
}

export async function POST(req: NextRequest) {
  if (!ZAMMAD_TOKEN) {
    return NextResponse.json({ error: "ZAMMAD_API_TOKEN not configured" }, { status: 503 });
  }

  try {
    const { email, displayName, company } = await req.json() as {
      email: string;
      displayName: string;
      company: string;
    };

    if (!email || !displayName) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // Check if user already exists
    const existing = await findUser(email);
    if (existing) {
      return NextResponse.json({
        success: true,
        userId: existing.id,
        alreadyExisted: true,
      });
    }

    // Look up organization
    const orgId = company ? await findOrg(company) : null;

    // Create user with Customer role
    const payload: Record<string, unknown> = {
      firstname: displayName.split(" ")[0] || displayName,
      lastname: displayName.split(" ").slice(1).join(" ") || "",
      email,
      login: email,
      roles: ["Customer"],
      verified: true,
    };
    if (orgId) payload.organization_id = orgId;

    const { data: created, status } = await zammadFetch<{ id: number; login: string }>(
      "POST",
      "/users",
      payload
    );

    if (status < 200 || status >= 300) {
      return NextResponse.json(
        { error: `Zammad returned HTTP ${status}` },
        { status: 502 }
      );
    }

    return NextResponse.json({
      success: true,
      userId: created.id,
      alreadyExisted: false,
      orgId,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
