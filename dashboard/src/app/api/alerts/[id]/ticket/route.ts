import { NextRequest, NextResponse } from "next/server";
import { createTicket } from "@/lib/zammad";

type Params = { params: Promise<{ id: string }> };

export async function POST(req: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    const { hostname, message, severity, alert_type } = await req.json();

    const priorityMap: Record<string, string> = {
      critical: "3",
      high: "3",
      error: "3",
      warning: "2",
      info: "1",
    };
    const priority = priorityMap[(severity || "warning").toLowerCase()] ?? "2";

    const title = `[TRMM Alert] ${hostname}: ${(message || "").slice(0, 80)}`;
    const body = [
      `**Automated alert from Tactical RMM**`,
      ``,
      `- **Host:** ${hostname}`,
      `- **Severity:** ${severity}`,
      `- **Type:** ${alert_type}`,
      `- **Alert ID:** ${id}`,
      ``,
      `**Message:**`,
      message,
    ].join("\n");

    const { id: ticketId, error } = await createTicket({
      title,
      body,
      groupName: "MSP Support",
      customerEmail: "support@kecktech.net",
      priority,
    });

    if (error) return NextResponse.json({ error }, { status: 502 });
    return NextResponse.json({ ticketId });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
