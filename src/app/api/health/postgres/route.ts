
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const rows = await prisma.$queryRaw<Array<{ version: string }>>`SELECT version() AS version`;

    return NextResponse.json({
      success: true,
      database: "PostgreSQL",
      status: "Connected",
      version: rows[0]?.version ?? 'Unknown',
    });
  } catch (error) {
    console.error("PostgreSQL health check failed:", error);

    return NextResponse.json(
      {
        success: false,
        database: "PostgreSQL",
        status: "Disconnected",
        message: "Database connection failed",
      },
      { status: 503 }
    );
  }
}
