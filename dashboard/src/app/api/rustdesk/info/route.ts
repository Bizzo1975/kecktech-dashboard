import { NextResponse } from "next/server";
import { getRustDeskInfo } from "@/lib/rustdesk";

export async function GET() {
  const info = getRustDeskInfo();
  return NextResponse.json(info);
}
