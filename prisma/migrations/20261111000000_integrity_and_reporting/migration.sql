-- Additive integrity hardening and an event operations reporting view.
-- This migration preserves application records. It fails before changing data if
-- existing tickets point to ticket types for a different event.

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM "Ticket" t
    JOIN "Registration" r ON r."id" = t."registrationId"
    JOIN "TicketType" tt ON tt."id" = t."ticketTypeId"
    WHERE r."eventId" <> tt."eventId"
  ) THEN
    RAISE EXCEPTION 'Cannot apply EventCrowd integrity migration: ticket and registration events do not match';
  END IF;
END $$;

UPDATE "Incident"
SET "resolvedAt" = "reportedAt"
WHERE "status" IN ('RESOLVED', 'CLOSED') AND "resolvedAt" IS NULL;

ALTER TABLE "Venue"
  ADD CONSTRAINT "Venue_totalCapacity_positive_check" CHECK ("totalCapacity" > 0);
ALTER TABLE "Zone"
  ADD CONSTRAINT "Zone_capacity_positive_check" CHECK ("capacity" > 0);
ALTER TABLE "Event"
  ADD CONSTRAINT "Event_dates_order_check" CHECK ("endDate" > "startDate");
ALTER TABLE "TicketType"
  ADD CONSTRAINT "TicketType_inventory_nonnegative_check" CHECK ("quantity" >= 0 AND "soldCount" >= 0 AND "soldCount" <= "quantity"),
  ADD CONSTRAINT "TicketType_price_nonnegative_check" CHECK ("price" >= 0);
ALTER TABLE "VolunteerAssignment"
  ADD CONSTRAINT "VolunteerAssignment_shift_order_check" CHECK ("shiftEnd" > "shiftStart");
ALTER TABLE "StaffAssignment"
  ADD CONSTRAINT "StaffAssignment_shift_order_check" CHECK ("shiftEnd" > "shiftStart");
ALTER TABLE "Incident"
  ADD CONSTRAINT "Incident_resolution_timestamp_check"
  CHECK (("status" IN ('RESOLVED', 'CLOSED')) = ("resolvedAt" IS NOT NULL));

CREATE OR REPLACE FUNCTION "eventcrowd_check_ticket_event_match"()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  registration_event UUID;
  ticket_type_event UUID;
BEGIN
  SELECT "eventId" INTO registration_event FROM "Registration" WHERE "id" = NEW."registrationId";
  SELECT "eventId" INTO ticket_type_event FROM "TicketType" WHERE "id" = NEW."ticketTypeId";
  IF registration_event IS NULL OR ticket_type_event IS NULL OR registration_event <> ticket_type_event THEN
    RAISE EXCEPTION 'Ticket type must belong to the registration event' USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER "Ticket_event_match_trigger"
BEFORE INSERT OR UPDATE OF "registrationId", "ticketTypeId" ON "Ticket"
FOR EACH ROW EXECUTE FUNCTION "eventcrowd_check_ticket_event_match"();

CREATE OR REPLACE VIEW "EventOperationsSummary" AS
WITH registration_stats AS (
  SELECT "eventId", COUNT(*)::BIGINT AS "registrationCount",
         COUNT(*) FILTER (WHERE "status" = 'CONFIRMED')::BIGINT AS "confirmedRegistrations"
  FROM "Registration" GROUP BY "eventId"
),
ticket_stats AS (
  SELECT r."eventId", COUNT(t."id")::BIGINT AS "ticketCount",
         COUNT(t."id") FILTER (WHERE t."status" = 'USED')::BIGINT AS "usedTicketCount"
  FROM "Registration" r LEFT JOIN "Ticket" t ON t."registrationId" = r."id"
  GROUP BY r."eventId"
),
scan_stats AS (
  SELECT "eventId", COUNT(*) FILTER (WHERE "result" = 'ACCEPTED' AND "scanType" = 'ENTRY')::BIGINT AS "acceptedEntries"
  FROM "GateScan" GROUP BY "eventId"
),
incident_stats AS (
  SELECT "eventId", COUNT(*)::BIGINT AS "incidentCount",
         COUNT(*) FILTER (WHERE "severity" = 'CRITICAL' AND "status" NOT IN ('RESOLVED', 'CLOSED'))::BIGINT AS "openCriticalIncidents"
  FROM "Incident" GROUP BY "eventId"
),
volunteer_stats AS (
  SELECT "eventId", COUNT(*)::BIGINT AS "volunteerAssignments"
  FROM "VolunteerAssignment" WHERE "status" IN ('ASSIGNED', 'ACTIVE') GROUP BY "eventId"
),
staff_stats AS (
  SELECT "eventId", COUNT(*)::BIGINT AS "staffAssignments"
  FROM "StaffAssignment" WHERE "status" IN ('ASSIGNED', 'ACTIVE') GROUP BY "eventId"
)
SELECT e."id" AS "eventId", e."name" AS "eventName", e."status" AS "eventStatus",
       e."startDate", e."endDate", v."name" AS "venueName", v."city" AS "venueCity",
       COALESCE(rs."registrationCount", 0)::BIGINT AS "registrationCount",
       COALESCE(rs."confirmedRegistrations", 0)::BIGINT AS "confirmedRegistrations",
       COALESCE(ts."ticketCount", 0)::BIGINT AS "ticketCount",
       COALESCE(ts."usedTicketCount", 0)::BIGINT AS "usedTicketCount",
       COALESCE(ss."acceptedEntries", 0)::BIGINT AS "acceptedEntries",
       COALESCE(ins."incidentCount", 0)::BIGINT AS "incidentCount",
       COALESCE(ins."openCriticalIncidents", 0)::BIGINT AS "openCriticalIncidents",
       COALESCE(vs."volunteerAssignments", 0)::BIGINT AS "volunteerAssignments",
       COALESCE(sts."staffAssignments", 0)::BIGINT AS "staffAssignments"
FROM "Event" e
JOIN "Venue" v ON v."id" = e."venueId"
LEFT JOIN registration_stats rs ON rs."eventId" = e."id"
LEFT JOIN ticket_stats ts ON ts."eventId" = e."id"
LEFT JOIN scan_stats ss ON ss."eventId" = e."id"
LEFT JOIN incident_stats ins ON ins."eventId" = e."id"
LEFT JOIN volunteer_stats vs ON vs."eventId" = e."id"
LEFT JOIN staff_stats sts ON sts."eventId" = e."id";
