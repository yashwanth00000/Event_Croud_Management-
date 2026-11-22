
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getMongoClient } from "@/lib/mongodb";

export async function GET() {
  const result = await Promise.allSettled([
    prisma.$queryRaw`SELECT 1`,
    Promise.resolve().then(() => getMongoClient()).then(client => client.db(process.env.MONGODB_DATABASE || 'eventcrowd').command({ ping: 1 })),
  ]);
  const postgresConnected = result[0].status === "fulfilled";
  const mongoConnected = result[1].status === "fulfilled";

  return NextResponse.json(
    {
      success: postgresConnected && mongoConnected,
      application: "EventCrowd",
      databases: {
        postgresql: postgresConnected ? "Connected" : "Disconnected",
        mongodb: mongoConnected ? "Connected" : "Disconnected",
      },
      timestamp: new Date().toISOString(),
    },
    { status: postgresConnected && mongoConnected ? 200 : 503 }
  );
}
