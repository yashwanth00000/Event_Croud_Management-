CREATE TABLE "CrowdObservation" (
    "id" UUID NOT NULL,
    "eventId" UUID NOT NULL,
    "zoneId" UUID,
    "occupancy" INTEGER NOT NULL,
    "capacity" INTEGER NOT NULL,
    "percentage" INTEGER NOT NULL,
    "source" TEXT NOT NULL DEFAULT 'staff',
    "observedBy" UUID,
    "observedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CrowdObservation_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "CrowdObservation_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "CrowdObservation_zoneId_fkey" FOREIGN KEY ("zoneId") REFERENCES "Zone"("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "CrowdObservation_observedBy_fkey" FOREIGN KEY ("observedBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE INDEX "CrowdObservation_eventId_observedAt_idx" ON "CrowdObservation"("eventId", "observedAt");
CREATE INDEX "CrowdObservation_zoneId_observedAt_idx" ON "CrowdObservation"("zoneId", "observedAt");

CREATE TABLE "ContactMessage" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'NEW',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ContactMessage_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "ContactMessage_createdAt_idx" ON "ContactMessage"("createdAt");
CREATE INDEX "ContactMessage_status_createdAt_idx" ON "ContactMessage"("status", "createdAt");
