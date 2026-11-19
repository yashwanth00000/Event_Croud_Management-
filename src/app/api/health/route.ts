
import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json(
    {
      success: true,
      application: "EventCrowd",
      status: "Running",
      version: "1.0.0",
      timestamp: new Date().toISOString(),
    },
    { status: 200 }
  );
}
