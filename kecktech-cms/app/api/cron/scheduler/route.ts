import { NextRequest, NextResponse } from "next/server";
import { SchedulerService } from "@/lib/scheduler-service";

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get("Authorization");
    const cronSecret = process.env.CRON_SECRET;

    if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const stats = await SchedulerService.publishScheduledContent();

    return NextResponse.json({
      success: true,
      message: "Scheduled content processed",
      stats,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Error in cron scheduler:", error);
    return NextResponse.json(
      { error: "Failed to process scheduled content" },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("Authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return NextResponse.json({
    message: "Scheduler active",
    endpoint: "/api/cron/scheduler",
  });
}
