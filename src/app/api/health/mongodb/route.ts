
import { NextResponse } from "next/server";
import { getMongoClient } from "@/lib/mongodb";

export async function GET() {
  try {
    const client = await getMongoClient();

    const buildInfo = await client.db("admin").command({ buildInfo: 1 });

    return NextResponse.json({
      success: true,
      database: "MongoDB",
      status: "Connected",
      version: typeof buildInfo.version === 'string' ? buildInfo.version : 'Unknown',
    });
  } catch (error) {
    console.error("MongoDB health check failed:", error);

    return NextResponse.json(
      {
        success: false,
        database: "MongoDB",
        status: "Disconnected",
        message: "Database connection failed",
      },
      { status: 503 }
    );
  }
}
