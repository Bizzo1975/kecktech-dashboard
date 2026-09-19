import { NextResponse } from "next/server";
import { SERVICES } from "@/lib/services";
import { checkHealth } from "@/lib/checkHealth.mjs";
import { HEALTH_CONTRACT_VERSION, summarizeHealth } from "@/lib/healthContract.mjs";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const serviceName = searchParams.get("service");

  if (serviceName) {
    const def = SERVICES.find((s) => s.name.toLowerCase() === serviceName.toLowerCase());
    if (def) {
      const result = await checkOne(def);
      return NextResponse.json({ contractVersion: HEALTH_CONTRACT_VERSION, evidenceAt: new Date().toISOString(), service: result });
    }
  }

  const results = await Promise.all(SERVICES.map(checkOne));

  return NextResponse.json({
    contractVersion: HEALTH_CONTRACT_VERSION,
    evidenceAt: new Date().toISOString(),
    services: results,
    summary: summarizeHealth(results),
  });
}

async function checkOne(def: {
  name: string;
  healthUrl: string;
  healthHost?: string;
  healthSuccess?: "ready" | "application_available" | "reachable";
  noHealthCheck?: boolean;
}) {
  if (def.noHealthCheck) {
    return { name: def.name, status: "not_monitored" as const, reason: "not_monitored" as const, latency: 0, statusCode: 0 };
  }
  const h = await checkHealth(def.healthUrl, def.healthHost, 5000, def.healthSuccess);
  return {
    name: def.name,
    status: h.status,
    reason: h.reason,
    latency: h.latency,
    statusCode: h.statusCode,
  };
}
