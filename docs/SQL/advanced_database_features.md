# EventCrowd database features

EventCrowd uses PostgreSQL as the transactional source of truth and MongoDB for document mirrors, time-series telemetry, and crowd-report aggregation. Set `DATABASE_URL`, `MONGODB_URI`, and `SESSION_SECRET` in `frontend/.env`; never commit credentials.

## Advanced concepts implemented

1. **Transactions and concurrency control (PostgreSQL).** Ticket registration reserves inventory and inserts the registration and ticket rows in one transaction. Gate scans use a database transaction and conditional status updates so a ticket cannot be accepted twice concurrently. See `frontend/src/app/api/registrations/route.ts` and `frontend/src/app/api/scans/route.ts`.
2. **Constraints, a trigger, and indexes (PostgreSQL).** The migration `frontend/prisma/migrations/20261111000000_integrity_and_reporting/migration.sql` adds domain checks, a trigger that rejects a ticket type from a different event than its registration, and a reporting view. The additive migration `frontend/prisma/migrations/20261111010000_move_operational_data_to_postgres/migration.sql` creates canonical crowd-observation and contact-message tables. Apply migrations only after backing up and checking the target database.
3. **Reporting and aggregation.** `EventOperationsSummary` joins event, venue, registrations, tickets, scans, incidents, and staffing counts in PostgreSQL. `/api/reports/crowd` aggregates MongoDB telemetry and falls back to PostgreSQL data when MongoDB is unavailable.
4. **Document activity.** Crowd observations and contact messages are saved in PostgreSQL and mirrored to MongoDB; incident timeline and capacity-activity documents are written to MongoDB. PostgreSQL remains the primary record for core entities and audit entries.
5. **Live page updates.** Authenticated portal tables and reports poll database-backed APIs every five seconds while visible and refresh when the browser tab regains focus.

## Query examples

```sql
SELECT "eventName", "registrationCount", "ticketCount", "incidentCount"
FROM "EventOperationsSummary"
WHERE "registrationCount" > 0
ORDER BY "startDate" DESC;

SELECT e.name, tt.name AS ticket_type, COUNT(t.id) AS issued,
       SUM(tt.price) AS gross_value
FROM "Event" e
JOIN "TicketType" tt ON tt."eventId" = e.id
LEFT JOIN "Ticket" t ON t."ticketTypeId" = tt.id
GROUP BY e.name, tt.name
HAVING COUNT(t.id) > 0
ORDER BY gross_value DESC;

SELECT "eventId", "zoneId", COUNT(*) AS samples,
       AVG(occupancy) AS average_occupancy, MAX(occupancy) AS peak_occupancy
FROM "CrowdObservation"
WHERE "observedAt" >= now() - interval '30 days'
GROUP BY "eventId", "zoneId";
```

## DDL practice: CREATE, ALTER, DROP

Run this only in a disposable practice database. It uses a dedicated scratch table and does not modify application tables.

```sql
CREATE TABLE dbms_ddl_practice (id integer PRIMARY KEY, label text NOT NULL);
ALTER TABLE dbms_ddl_practice ADD COLUMN created_at timestamptz NOT NULL DEFAULT now();
INSERT INTO dbms_ddl_practice (id, label) VALUES (1, 'DDL practice example');
SELECT * FROM dbms_ddl_practice;
DROP TABLE dbms_ddl_practice;
```

## CRUD examples

Connected admin interfaces call API routes which use Prisma create/read/update/delete methods. Example SQL equivalents are below; execute against a local development database with valid identifiers only.

```sql
INSERT INTO "Zone" (id, name, capacity, "venueId") VALUES (gen_random_uuid(), 'Practice Zone', 100, '<venue-uuid>');
SELECT z.name, v.name AS venue FROM "Zone" z JOIN "Venue" v ON v.id = z."venueId";
UPDATE "Zone" SET capacity = 120 WHERE name = 'Practice Zone';
DELETE FROM "Zone" WHERE name = 'Practice Zone' AND NOT EXISTS
  (SELECT 1 FROM "Gate" g WHERE g."zoneId" = "Zone".id);
```

The delete is intentionally guarded; the API similarly protects zones and gates that contain assignments, incidents, alerts, or scan history.

