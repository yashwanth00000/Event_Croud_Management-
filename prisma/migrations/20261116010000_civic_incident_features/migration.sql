-- Civic issue-management features: categorization, immutable history,
-- complaints, feedback, notifications, PostgreSQL text search and Qdrant outbox.

CREATE TABLE "Department" (
  "id" UUID NOT NULL,
  "name" TEXT NOT NULL,
  "isActive" BOOLEAN NOT NULL DEFAULT TRUE,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Department_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "Department_name_key" ON "Department"("name");

CREATE TABLE "IncidentCategory" (
  "id" UUID NOT NULL,
  "departmentId" UUID NOT NULL,
  "name" TEXT NOT NULL,
  "isActive" BOOLEAN NOT NULL DEFAULT TRUE,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "IncidentCategory_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "IncidentCategory_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "Department"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "IncidentCategory_departmentId_name_key" ON "IncidentCategory"("departmentId", "name");

ALTER TABLE "User" ADD COLUMN "departmentId" UUID;
ALTER TABLE "User" ADD COLUMN "isDepartmentManager" BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE "User" ADD CONSTRAINT "User_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "Department"("id") ON DELETE SET NULL ON UPDATE CASCADE;
CREATE UNIQUE INDEX "User_one_department_manager_idx" ON "User"("departmentId") WHERE "departmentId" IS NOT NULL AND "isDepartmentManager" = TRUE;
ALTER TABLE "Incident" ADD COLUMN "categoryId" UUID;
ALTER TABLE "Incident" ADD CONSTRAINT "Incident_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "IncidentCategory"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "IncidentStatusHistory" (
  "id" UUID NOT NULL,
  "incidentId" UUID NOT NULL,
  "changedById" UUID,
  "oldStatus" "IncidentStatus",
  "newStatus" "IncidentStatus" NOT NULL,
  "remarks" TEXT,
  "changedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "IncidentStatusHistory_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "IncidentStatusHistory_incidentId_fkey" FOREIGN KEY ("incidentId") REFERENCES "Incident"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "IncidentStatusHistory_changedById_fkey" FOREIGN KEY ("changedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE INDEX "IncidentStatusHistory_incidentId_changedAt_idx" ON "IncidentStatusHistory"("incidentId", "changedAt");

CREATE TABLE "IncidentAssignment" (
  "id" UUID NOT NULL,
  "incidentId" UUID NOT NULL,
  "officerId" UUID NOT NULL,
  "assignedById" UUID NOT NULL,
  "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "IncidentAssignment_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "IncidentAssignment_incidentId_fkey" FOREIGN KEY ("incidentId") REFERENCES "Incident"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "IncidentAssignment_officerId_fkey" FOREIGN KEY ("officerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "IncidentAssignment_assignedById_fkey" FOREIGN KEY ("assignedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "IncidentAssignment_incidentId_officerId_key" ON "IncidentAssignment"("incidentId", "officerId");
CREATE INDEX "IncidentAssignment_officerId_assignedAt_idx" ON "IncidentAssignment"("officerId", "assignedAt");

CREATE TABLE "IncidentFeedback" (
  "id" UUID NOT NULL,
  "incidentId" UUID NOT NULL,
  "submittedById" UUID NOT NULL,
  "rating" INTEGER NOT NULL,
  "comment" TEXT,
  "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "IncidentFeedback_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "IncidentFeedback_rating_check" CHECK ("rating" BETWEEN 1 AND 5),
  CONSTRAINT "IncidentFeedback_incidentId_fkey" FOREIGN KEY ("incidentId") REFERENCES "Incident"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "IncidentFeedback_submittedById_fkey" FOREIGN KEY ("submittedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "IncidentFeedback_incidentId_submittedById_key" ON "IncidentFeedback"("incidentId", "submittedById");
CREATE INDEX "IncidentFeedback_incidentId_submittedAt_idx" ON "IncidentFeedback"("incidentId", "submittedAt");

CREATE TABLE "IncidentComplaint" (
  "id" UUID NOT NULL,
  "incidentId" UUID NOT NULL,
  "submittedById" UUID NOT NULL,
  "reason" TEXT NOT NULL,
  "category" TEXT NOT NULL DEFAULT 'GENERAL',
  "status" TEXT NOT NULL DEFAULT 'OPEN',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "IncidentComplaint_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "IncidentComplaint_incidentId_fkey" FOREIGN KEY ("incidentId") REFERENCES "Incident"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "IncidentComplaint_submittedById_fkey" FOREIGN KEY ("submittedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE INDEX "IncidentComplaint_incidentId_createdAt_idx" ON "IncidentComplaint"("incidentId", "createdAt");
CREATE INDEX "IncidentComplaint_submittedById_createdAt_idx" ON "IncidentComplaint"("submittedById", "createdAt");

CREATE TABLE "CivicNotification" (
  "id" UUID NOT NULL,
  "recipientId" UUID NOT NULL,
  "actorId" UUID,
  "incidentId" UUID,
  "feedbackId" UUID,
  "complaintId" UUID,
  "type" TEXT NOT NULL,
  "message" TEXT NOT NULL,
  "readAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CivicNotification_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "CivicNotification_recipientId_fkey" FOREIGN KEY ("recipientId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "CivicNotification_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE INDEX "CivicNotification_recipientId_createdAt_idx" ON "CivicNotification"("recipientId", "createdAt");
CREATE INDEX "CivicNotification_recipientId_readAt_idx" ON "CivicNotification"("recipientId", "readAt");

CREATE TABLE "IncidentVectorSync" (
  "incidentId" UUID NOT NULL,
  "indexedAt" TIMESTAMP(3),
  "lastError" TEXT,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "IncidentVectorSync_pkey" PRIMARY KEY ("incidentId"),
  CONSTRAINT "IncidentVectorSync_incidentId_fkey" FOREIGN KEY ("incidentId") REFERENCES "Incident"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- Seed category reference data for immediate incident classification.
INSERT INTO "Department" ("id", "name") VALUES
  ('e1000000-0000-4000-8000-000000000001', 'Event Operations'),
  ('e1000000-0000-4000-8000-000000000002', 'Safety and Guest Services')
ON CONFLICT ("name") DO NOTHING;
INSERT INTO "IncidentCategory" ("id", "departmentId", "name")
SELECT seed.id, d."id", seed.name
FROM (VALUES
  ('e2000000-0000-4000-8000-000000000001'::UUID, 'Event Operations', 'Facilities'),
  ('e2000000-0000-4000-8000-000000000002'::UUID, 'Event Operations', 'Crowd Flow'),
  ('e2000000-0000-4000-8000-000000000003'::UUID, 'Safety and Guest Services', 'Medical'),
  ('e2000000-0000-4000-8000-000000000004'::UUID, 'Safety and Guest Services', 'Guest Assistance')
) AS seed(id, department_name, name)
JOIN "Department" d ON d."name" = seed.department_name
ON CONFLICT ("departmentId", "name") DO NOTHING;

-- Keep a searchable PostgreSQL tsvector and enqueue a Qdrant sync on create/update.
ALTER TABLE "Incident" ADD COLUMN "searchVector" TSVECTOR;
CREATE OR REPLACE FUNCTION "eventcrowd_maintain_incident_search"()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW."searchVector" := to_tsvector('english', coalesce(NEW."title", '') || ' ' || coalesce(NEW."description", '') || ' ' || coalesce(NEW."eventId"::TEXT, '') || ' ' || coalesce(NEW."zoneId"::TEXT, ''));
  IF TG_OP = 'UPDATE' THEN
    NEW."reportedAt" := OLD."reportedAt";
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER "Incident_search_vector_trigger"
BEFORE INSERT OR UPDATE OF "title", "description", "eventId", "zoneId"
ON "Incident" FOR EACH ROW EXECUTE FUNCTION "eventcrowd_maintain_incident_search"();
UPDATE "Incident" SET "searchVector" = to_tsvector('english', coalesce("title", '') || ' ' || coalesce("description", '') || ' ' || coalesce("eventId"::TEXT, '') || ' ' || coalesce("zoneId"::TEXT, ''));
CREATE INDEX "Incident_searchVector_gin_idx" ON "Incident" USING GIN ("searchVector");

CREATE OR REPLACE FUNCTION "eventcrowd_enqueue_incident_vector_sync"()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  INSERT INTO "IncidentVectorSync" ("incidentId", "updatedAt")
  VALUES (NEW."id", CURRENT_TIMESTAMP)
  ON CONFLICT ("incidentId") DO UPDATE SET "indexedAt" = NULL, "lastError" = NULL, "updatedAt" = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$;
CREATE TRIGGER "Incident_vector_sync_trigger"
AFTER INSERT OR UPDATE OF "title", "description", "eventId", "zoneId", "categoryId"
ON "Incident" FOR EACH ROW EXECUTE FUNCTION "eventcrowd_enqueue_incident_vector_sync"();

-- Preserve each current incident state as the first history entry.
INSERT INTO "IncidentStatusHistory" ("id", "incidentId", "newStatus", "changedAt", "remarks")
SELECT gen_random_uuid(), i."id", i."status", i."reportedAt", 'Initial recorded status'
FROM "Incident" i
WHERE NOT EXISTS (SELECT 1 FROM "IncidentStatusHistory" h WHERE h."incidentId" = i."id");
INSERT INTO "IncidentVectorSync" ("incidentId")
SELECT "id" FROM "Incident" ON CONFLICT ("incidentId") DO NOTHING;
