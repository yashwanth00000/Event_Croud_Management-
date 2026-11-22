-- CreateEnum
CREATE TYPE "ScanType" AS ENUM ('ENTRY', 'EXIT');

-- CreateEnum
CREATE TYPE "ScanResult" AS ENUM ('ACCEPTED', 'REJECTED');

-- CreateTable
CREATE TABLE "GateScan" (
    "id" UUID NOT NULL,
    "ticketId" UUID NOT NULL,
    "gateId" UUID NOT NULL,
    "eventId" UUID NOT NULL,
    "scannedById" UUID NOT NULL,
    "scanType" "ScanType" NOT NULL,
    "result" "ScanResult" NOT NULL DEFAULT 'ACCEPTED',
    "scannedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GateScan_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "GateScan_ticketId_scannedAt_idx" ON "GateScan"("ticketId", "scannedAt");

-- CreateIndex
CREATE INDEX "GateScan_eventId_gateId_scannedAt_idx" ON "GateScan"("eventId", "gateId", "scannedAt");

-- CreateIndex
CREATE INDEX "GateScan_scannedById_idx" ON "GateScan"("scannedById");

-- AddForeignKey
ALTER TABLE "GateScan" ADD CONSTRAINT "GateScan_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "Ticket"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GateScan" ADD CONSTRAINT "GateScan_gateId_fkey" FOREIGN KEY ("gateId") REFERENCES "Gate"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GateScan" ADD CONSTRAINT "GateScan_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GateScan" ADD CONSTRAINT "GateScan_scannedById_fkey" FOREIGN KEY ("scannedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
