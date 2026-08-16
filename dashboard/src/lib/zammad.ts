const BASE = process.env.ZAMMAD_URL || "https://tickets.kecktech.net";
const TOKEN = process.env.ZAMMAD_API_TOKEN || "";

function zammadHeaders() {
  return {
    Authorization: `Token token=${TOKEN}`,
    "Content-Type": "application/json",
  };
}

async function zammadFetch<T>(
  path: string
): Promise<{ data: T | null; error?: string }> {
  if (!TOKEN) return { data: null, error: "Zammad API token not configured" };
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);
    const res = await fetch(`${BASE}${path}`, {
      headers: zammadHeaders(),
      cache: "no-store",
      signal: controller.signal,
    });
    clearTimeout(timeout);
    if (!res.ok) return { data: null, error: `Zammad HTTP ${res.status}` };
    const json = await res.json();
    return { data: json };
  } catch (e) {
    return { data: null, error: String(e) };
  }
}

// ── Types ────────────────────────────────────────────────────────────────────

export type ZammadTicket = {
  id: number;
  number: number;
  title: string;
  state_id: number;
  state: string;          // resolved from state_id
  priority_id: number;
  priority: string;       // resolved from priority_id
  group_id: number;
  group: string;          // resolved from group_id
  customer_id: number;
  customerName: string;
  customerEmail: string;
  created_at: string;
  updated_at: string;
  elapsedHours: number;
};

// Zammad REST API state_id map (default states)
const STATE_NAMES: Record<number, string> = {
  1: "new",
  2: "open",
  3: "pending reminder",
  4: "closed",
  5: "merged",
  6: "removed",
  7: "pending close",
};

// Zammad REST API priority_id map (default priorities)
const PRIORITY_NAMES: Record<number, string> = {
  1: "low",
  2: "normal",
  3: "high",
};

// ── Raw API shapes ────────────────────────────────────────────────────────────

type RawTicket = {
  id: number;
  number: number;
  title: string;
  state_id: number;
  priority_id: number;
  group_id: number;
  customer_id: number;
  created_at: string;
  updated_at: string;
};

type RawUser = {
  id: number;
  firstname: string;
  lastname: string;
  email: string;
};

type RawGroup = {
  id: number;
  name: string;
};

// ── API functions ─────────────────────────────────────────────────────────────

export async function getOpenTickets(): Promise<{
  tickets: ZammadTicket[];
  error?: string;
}> {
  // Fetch open tickets (state_id 1=new, 2=open, 3=pending reminder)
  const { data: raw, error } = await zammadFetch<RawTicket[]>(
    "/api/v1/tickets?state_id[]=1&state_id[]=2&state_id[]=3&per_page=50&expand=false"
  );
  if (!raw || error) return { tickets: [], error };

  // Collect unique customer_ids and group_ids for expansion
  const customerIds = [...new Set(raw.map((t) => t.customer_id))];
  const groupIds = [...new Set(raw.map((t) => t.group_id))];

  // Fetch users and groups in parallel
  const [userMap, groupMap] = await Promise.all([
    resolveUsers(customerIds),
    resolveGroups(groupIds),
  ]);

  const now = Date.now();
  const tickets: ZammadTicket[] = raw.map((t) => {
    const user = userMap[t.customer_id];
    const elapsedHours = Math.round(
      (now - new Date(t.created_at).getTime()) / 3_600_000
    );
    return {
      id: t.id,
      number: t.number,
      title: t.title,
      state_id: t.state_id,
      state: STATE_NAMES[t.state_id] || "unknown",
      priority_id: t.priority_id,
      priority: PRIORITY_NAMES[t.priority_id] || "normal",
      group_id: t.group_id,
      group: groupMap[t.group_id] || "Support",
      customer_id: t.customer_id,
      customerName: user
        ? `${user.firstname} ${user.lastname}`.trim() || user.email
        : "Unknown",
      customerEmail: user?.email || "",
      created_at: t.created_at,
      updated_at: t.updated_at,
      elapsedHours,
    };
  });

  // Sort: high priority first, then by updated_at desc
  tickets.sort((a, b) => {
    if (b.priority_id !== a.priority_id) return b.priority_id - a.priority_id;
    return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
  });

  return { tickets };
}

async function resolveUsers(ids: number[]): Promise<Record<number, RawUser>> {
  const map: Record<number, RawUser> = {};
  await Promise.all(
    ids.map(async (id) => {
      const { data } = await zammadFetch<RawUser>(`/api/v1/users/${id}`);
      if (data) map[id] = data;
    })
  );
  return map;
}

async function resolveGroups(ids: number[]): Promise<Record<number, string>> {
  const map: Record<number, string> = {};
  await Promise.all(
    ids.map(async (id) => {
      const { data } = await zammadFetch<RawGroup>(`/api/v1/groups/${id}`);
      if (data) map[id] = data.name;
    })
  );
  return map;
}

// ── Ticket write operations ───────────────────────────────────────────────────

async function zammadPost<T>(path: string, body: object): Promise<{ data: T | null; error?: string }> {
  if (!TOKEN) return { data: null, error: "Zammad API token not configured" };
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);
    const res = await fetch(`${BASE}${path}`, {
      method: "POST",
      headers: zammadHeaders(),
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    clearTimeout(timeout);
    if (!res.ok) return { data: null, error: `Zammad HTTP ${res.status}: ${await res.text()}` };
    return { data: await res.json() };
  } catch (e) {
    return { data: null, error: String(e) };
  }
}

async function zammadPut<T>(path: string, body: object): Promise<{ data: T | null; error?: string }> {
  if (!TOKEN) return { data: null, error: "Zammad API token not configured" };
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);
    const res = await fetch(`${BASE}${path}`, {
      method: "PUT",
      headers: zammadHeaders(),
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    clearTimeout(timeout);
    if (!res.ok) return { data: null, error: `Zammad HTTP ${res.status}: ${await res.text()}` };
    return { data: await res.json() };
  } catch (e) {
    return { data: null, error: String(e) };
  }
}

export type ZammadArticle = {
  id: number;
  ticket_id: number;
  body: string;
  content_type: string;
  from: string;
  to: string;
  created_at: string;
  internal: boolean;
  type: string;
};

export type ZammadTicketDetail = ZammadTicket & {
  articles: ZammadArticle[];
};

export async function getTicketDetail(id: number): Promise<{
  ticket: ZammadTicketDetail | null;
  error?: string;
}> {
  const [{ data: raw, error: tErr }, { data: articles, error: aErr }] = await Promise.all([
    zammadFetch<RawTicket & { customer_id: number; group_id: number }>(`/api/v1/tickets/${id}`),
    zammadFetch<ZammadArticle[]>(`/api/v1/ticket_articles/by_ticket/${id}`),
  ]);
  if (!raw || tErr) return { ticket: null, error: tErr };
  const [userMap, groupMap] = await Promise.all([
    resolveUsers([raw.customer_id]),
    resolveGroups([raw.group_id]),
  ]);
  const user = userMap[raw.customer_id];
  const now = Date.now();
  const elapsedHours = Math.round((now - new Date(raw.created_at).getTime()) / 3_600_000);
  const ticket: ZammadTicketDetail = {
    id: raw.id,
    number: raw.number,
    title: raw.title,
    state_id: raw.state_id,
    state: STATE_NAMES[raw.state_id] || "unknown",
    priority_id: raw.priority_id,
    priority: PRIORITY_NAMES[raw.priority_id] || "normal",
    group_id: raw.group_id,
    group: groupMap[raw.group_id] || "Support",
    customer_id: raw.customer_id,
    customerName: user ? `${user.firstname} ${user.lastname}`.trim() || user.email : "Unknown",
    customerEmail: user?.email || "",
    created_at: raw.created_at,
    updated_at: raw.updated_at,
    elapsedHours,
    articles: articles ?? [],
  };
  return { ticket, error: aErr };
}

export async function createTicket(payload: {
  title: string;
  body: string;
  groupName: string;
  customerEmail: string;
  priority?: string;
}): Promise<{ id?: number; error?: string }> {
  const { data, error } = await zammadPost<{ id: number }>("/api/v1/tickets", {
    title: payload.title,
    group: payload.groupName,
    customer: payload.customerEmail,
    article: {
      subject: payload.title,
      body: payload.body,
      type: "note",
      internal: false,
      content_type: "text/plain",
    },
  });
  return { id: data?.id, error };
}

export async function replyToTicket(
  ticketId: number,
  body: string,
  internal = false
): Promise<{ id?: number; error?: string }> {
  const { data, error } = await zammadPost<{ id: number }>("/api/v1/ticket_articles", {
    ticket_id: ticketId,
    body,
    type: "note",
    internal,
    content_type: "text/plain",
  });
  return { id: data?.id, error };
}

export async function updateTicket(
  id: number,
  patch: { state_id?: number; priority_id?: number; group?: string }
): Promise<{ error?: string }> {
  const { error } = await zammadPut<unknown>(`/api/v1/tickets/${id}`, patch);
  return { error };
}

// ── SLA Reporting ─────────────────────────────────────────────────────────────

export type ZammadClosedTicket = {
  id: number;
  number: number;
  title: string;
  state: string;
  priority: string;
  group: string;
  customerName: string;
  customerEmail: string;
  created_at: string;
  updated_at: string;
  close_at?: string;
  firstResponseAt?: string;
};

/** Fetch closed tickets for a date range for SLA compliance calculation */
export async function getClosedTickets(
  dateFrom: string,
  dateTo: string,
  page = 1,
  perPage = 100
): Promise<{ tickets: ZammadClosedTicket[]; error?: string }> {
  const params = new URLSearchParams({
    "state_id[]": "4",
    per_page: String(perPage),
    page: String(page),
  });
  const { data: raw, error } = await zammadFetch<RawTicket[]>(
    `/api/v1/tickets?${params.toString()}&expand=false`
  );
  if (!raw || error) return { tickets: [], error };

  const customerIds = [...new Set(raw.map((t) => t.customer_id))];
  const groupIds = [...new Set(raw.map((t) => t.group_id))];
  const [userMap, groupMap] = await Promise.all([resolveUsers(customerIds), resolveGroups(groupIds)]);

  const from = new Date(dateFrom).getTime();
  const to = new Date(dateTo).getTime();

  const tickets: ZammadClosedTicket[] = raw
    .filter((t) => {
      const updated = new Date(t.updated_at).getTime();
      return updated >= from && updated <= to;
    })
    .map((t) => {
      const user = userMap[t.customer_id];
      return {
        id: t.id,
        number: t.number,
        title: t.title,
        state: STATE_NAMES[t.state_id] || "closed",
        priority: PRIORITY_NAMES[t.priority_id] || "normal",
        group: groupMap[t.group_id] || "Support",
        customerName: user ? `${user.firstname} ${user.lastname}`.trim() || user.email : "Unknown",
        customerEmail: user?.email || "",
        created_at: t.created_at,
        updated_at: t.updated_at,
      };
    });

  return { tickets };
}

// ── Live Chat ─────────────────────────────────────────────────────────────────

export type ZammadChat = {
  id: number;
  name: string;
  created_at: string;
  updated_at: string;
};

export async function getActiveChats(): Promise<{
  chats: ZammadChat[];
  error?: string;
}> {
  const { data, error } = await zammadFetch<ZammadChat[]>("/api/v1/chats");
  if (error) return { chats: [], error };
  return { chats: data ?? [] };
}
