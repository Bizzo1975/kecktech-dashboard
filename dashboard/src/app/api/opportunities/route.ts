import { NextRequest, NextResponse } from "next/server";
import { createOpportunity, updateLeadStatus } from "@/lib/erpnext";

export async function POST(req: NextRequest) {
  try {
    const { leadId, customerName, opportunityAmount, probability, expectedClosing } = await req.json();
    if (!customerName) {
      return NextResponse.json({ error: "customerName is required" }, { status: 400 });
    }
    const { name, error } = await createOpportunity({
      lead: leadId,
      customer_name: customerName,
      opportunity_amount: opportunityAmount,
      probability,
      expected_closing: expectedClosing,
    });
    if (error) return NextResponse.json({ error }, { status: 502 });

    // Mark the source lead as converted if a leadId was provided
    if (leadId) {
      await updateLeadStatus(leadId, "Opportunity");
    }

    return NextResponse.json({ name });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
