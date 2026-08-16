import https from "https";
import http from "http";

const RAW_URL = process.env.TRMM_URL || "https://api.kecktech.net";
const KEY = process.env.TRMM_API_KEY || "";

function trmmRequest<T>(
  path: string,
  method: "GET" | "PATCH" | "POST" = "GET",
  body?: object
): Promise<{ data: T | null; status: number; error?: string }> {
  return new Promise((resolve) => {
    if (!KEY) {
      resolve({ data: null, status: 0, error: "TRMM_API_KEY not configured" });
      return;
    }

    const url = new URL(RAW_URL + path);
    const isHttps = url.protocol === "https:";
    const port = url.port ? parseInt(url.port) : isHttps ? 443 : 80;
    const bodyStr = body ? JSON.stringify(body) : undefined;

    const options: https.RequestOptions = {
      hostname: url.hostname,
      port,
      path: url.pathname + url.search,
      method,
      headers: {
        "X-API-KEY": KEY,
        "Content-Type": "application/json",
        ...(bodyStr ? { "Content-Length": String(Buffer.byteLength(bodyStr)) } : {}),
      },
    };

    const req = (isHttps ? https : http).request(options, (res) => {
      let raw = "";
      res.on("data", (chunk) => (raw += chunk));
      res.on("end", () => {
        const status = res.statusCode ?? 0;
        if (status >= 400) {
          resolve({ data: null, status, error: `TRMM HTTP ${status}` });
          return;
        }
        try {
          resolve({ data: JSON.parse(raw) as T, status });
        } catch {
          resolve({ data: null, status, error: "TRMM invalid JSON" });
        }
      });
    });

    req.on("error", (e) => resolve({ data: null, status: 0, error: String(e) }));
    if (bodyStr) req.write(bodyStr);
    req.end();
  });
}

export type TRMMAlert = {
  id: number;
  hostname: string;
  alert_type: string;
  severity: string;
  message: string;
  alert_time: string;
  resolved: boolean;
  snoozed: boolean;
  agent?: { hostname?: string };
};

export type TRMMAgent = {
  id: number;
  hostname: string;
  description: string;
  client_name: string;
  site_name: string;
  status: string;
  last_seen: string;
  operating_system: string;
  pending_actions_count: number;
};

export type ClientGroup = {
  client_name: string;
  agents: TRMMAgent[];
  online: number;
  offline: number;
  alerts: TRMMAlert[];
};

export async function getActiveAlerts(): Promise<{ alerts: TRMMAlert[]; error?: string }> {
  const { data, error } = await trmmRequest<{ alerts: TRMMAlert[] }>(
    "/alerts/",
    "PATCH",
    { top: 50 }
  );
  const raw: TRMMAlert[] = data?.alerts ?? [];
  return {
    alerts: raw.map((a) => ({
      ...a,
      hostname: a.agent?.hostname || a.hostname || "Unknown",
    })),
    error,
  };
}

export async function acknowledgeAlert(id: number): Promise<{ error?: string }> {
  const { error } = await trmmRequest(`/alerts/${id}/`, "PATCH", { acknowledged: true });
  return { error };
}

export async function getAgents(): Promise<{ agents: TRMMAgent[]; error?: string }> {
  const { data, error } = await trmmRequest<TRMMAgent[]>("/agents/");
  return { agents: Array.isArray(data) ? data : [], error };
}

export type TRMMAgentDetail = TRMMAgent & {
  total_ram_mb?: number;
  used_ram_mb?: number;
  boot_time?: string;
  logged_in_username?: string;
  cpu_model?: string;
  patches_pending?: number;
  disks?: Array<{ free: number; total: number; device: string }>;
};

export async function getAgentDetail(id: number): Promise<{ agent: TRMMAgentDetail | null; error?: string }> {
  const { data, error } = await trmmRequest<TRMMAgentDetail>(`/agents/${id}/`);
  return { agent: data, error };
}

export async function getClientGroups(): Promise<{ groups: ClientGroup[]; error?: string }> {
  const [{ agents, error: aErr }, { alerts, error: alErr }] = await Promise.all([
    getAgents(),
    getActiveAlerts(),
  ]);

  const error = aErr || alErr;

  const alertsByHost: Record<string, TRMMAlert[]> = {};
  for (const alert of alerts) {
    const h = alert.hostname;
    if (!alertsByHost[h]) alertsByHost[h] = [];
    alertsByHost[h].push(alert);
  }

  const clientMap: Record<string, ClientGroup> = {};
  for (const agent of agents) {
    const cn = agent.client_name || "Unknown Client";
    if (!clientMap[cn]) {
      clientMap[cn] = { client_name: cn, agents: [], online: 0, offline: 0, alerts: [] };
    }
    clientMap[cn].agents.push(agent);
    if (agent.status === "online") clientMap[cn].online++;
    else clientMap[cn].offline++;
    clientMap[cn].alerts.push(...(alertsByHost[agent.hostname] ?? []));
  }

  const groups = Object.values(clientMap).sort((a, b) => {
    const aScore = (a.offline > 0 ? 2 : 0) + (a.alerts.length > 0 ? 1 : 0);
    const bScore = (b.offline > 0 ? 2 : 0) + (b.alerts.length > 0 ? 1 : 0);
    return bScore - aScore;
  });

  return { groups, error };
}
