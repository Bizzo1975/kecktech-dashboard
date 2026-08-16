import { NextResponse } from "next/server";
import { SERVICES } from "@/lib/services";
import { checkHealth } from "@/lib/checkHealth";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const serviceName = searchParams.get("service");

  if (serviceName) {
    const def = SERVICES.find((s) => s.name.toLowerCase() === serviceName.toLowerCase());
    if (def) {
      const result = await checkOne(def);
      return NextResponse.json(result);
    }
  }

  const results = await Promise.all(SERVICES.map(checkOne));

  return NextResponse.json({
    timestamp: new Date().toISOString(),
    services: results,
    summary: {
      total: results.length,
      up: results.filter((r) => r.status === "up").length,
      down: results.filter((r) => r.status === "down").length,
    },
  });
}

async function checkOne(def: {
  name: string;
  healthUrl: string;
  healthHost?: string;
  noHealthCheck?: boolean;
}) {
  if (def.noHealthCheck) {
    return { name: def.name, status: "up" as const, latency: 0, statusCode: 0 };
  }
  const h = await checkHealth(def.healthUrl, def.healthHost);
  return {
    name: def.name,
    status: h.status,
    latency: h.latency,
    statusCode: h.statusCode,
  };
}
