# EventCrowd

Next.js application for event, ticket, attendee, volunteer, security and crowd operations. PostgreSQL is the transactional source of truth; MongoDB supports time-series and document-based reporting.

## Run locally (Windows PowerShell)

1. Install Node.js (20 or newer), PostgreSQL, and MongoDB.
2. In this `frontend` directory, copy `.env.example` to `.env` and set `DATABASE_URL`, `MONGODB_URI`, `MONGODB_DATABASE`, and a unique `SESSION_SECRET` of at least 32 characters. Qdrant is optional; set `QDRANT_URL` if you run it. PostgreSQL full-text search remains available when Qdrant is offline.

   To enable similar-incident vector search with Docker, start Qdrant and keep its data in a named volume:

   ```powershell
   docker run -d --name eventcrowd-qdrant --restart unless-stopped -p 6333:6333 -v eventcrowd_qdrant:/qdrant/storage qdrant/qdrant
   ```
3. Install dependencies and generate the database client:

   ```powershell
   npm install
   npx.cmd prisma generate
   ```

4. Apply the included migrations to your configured PostgreSQL database. Back up existing data first and use the project migration command, not `migrate reset`:

   ```powershell
   npx.cmd prisma migrate deploy
   ```

5. Create your first real administrator interactively if your database does not already have one:

   ```powershell
   npm run admin:create
   ```

   For a local classroom walkthrough, populate both databases with clearly marked synthetic data, including a published bookable event and a separate ongoing live-operations event with staff/volunteer assignments, attendee QR tickets and check-ins, incidents, alerts, contacts, and live crowd readings:

   ```powershell
   npm run db:seed:synthetic
   ```

   The four synthetic attendee accounts are `demo.attendee.1@example.com` through `demo.attendee.4@example.com`; each uses `EventCrowd@Demo2026`. Their tickets appear under **My tickets** with QR codes. The ongoing synthetic event and seeded entry log are visible in staff operations and **Admin → Ticket scan log**. This command adds demonstration records to PostgreSQL and MongoDB; never run it against production data.

   Import the verified PES University records for Euphoria and Aatmatrisha without creating attendees, tickets, or synthetic activity:

   ```powershell
   npm run db:import:pes-events
   ```

   The command uses the existing administrator `admin@gmail.com`. Set `EVENT_ORGANIZER_EMAIL` if your administrator has a different email. It is safe to rerun.

   To optionally add a labeled synthetic MongoDB dataset for a classroom/demo database, run:

   ```powershell
   npm run db:seed:mongodb-synthetic
   ```

   This creates sample documents in `contact_messages`, `incident_timeline`, and `crowd_observations`. It does not write to PostgreSQL. Use a separate demo database if you want to keep synthetic records out of your project data.

Attendee demo path: sign in as `demo.attendee.1@example.com` through `demo.attendee.4@example.com` with password `EventCrowd@Demo2026`, search **Available events**, register for the upcoming demo event, then open **My tickets** to display a QR code. The seed also issues tickets for the ongoing demo event so you can check in immediately. Staff can scan at **Ticket scanner** using a camera or manual QR value. Administrators can review accepted/rejected scans under **Ticket scan log**. Scans update ticket status and create a PostgreSQL audit record.

6. Start the application and open `http://localhost:3000`:

   ```powershell
   npm run dev
   ```

Attendees can create their own real account from the public registration page. Administrators provision staff and volunteers using the protected management pages. Existing accounts and records are preserved.

The project can import the completed 2026 Euphoria and Aatmatrisha events. No attendee list, ticket inventory, attendance count, or venue capacity has been invented; add those details only from your official records.

## Databases and live updates

- **PostgreSQL / Prisma:** users and roles, events, venues, zones, gates, registrations, tickets, assignments, incidents, alerts, gate scans, audit records, and canonical crowd/contact records.
- **MongoDB:** document mirrors for crowd observations and contact submissions, incident timeline entries, and capacity activity. Crowd reports use MongoDB aggregation and fall back to PostgreSQL if MongoDB is unavailable.
- **Incident management:** PostgreSQL stores departments, categories, incident status history, multiple security officer assignments, resident complaints, feedback, and notifications. Incidents support PostgreSQL full-text search; when Qdrant is available, the app also indexes similar incidents for vector search. Qdrant indexing failures are recorded for admin retry and do not block incident reporting.
- **Role-aware incident workflow:** attendees can report issues for events they are registered for, edit reports before work begins, submit complaints while unresolved, and leave feedback after resolution. Admins manage taxonomy and assignments; authorized staff update incident status. Status changes are stored in PostgreSQL and mirrored to MongoDB's `incident_timeline` collection.
- Portal lists and reports refresh automatically every five seconds while visible, and immediately when the browser tab regains focus. Changes are saved to PostgreSQL before the UI reports success; relevant event/telemetry documents are also mirrored into MongoDB.
- The additive SQL migrations add integrity constraints, reporting views, PostgreSQL crowd/contact tables, and civic incident tables/search indexes. Inspect `../docs/SQL/advanced_database_features.md` before applying them.

## Checks

From this directory, run `npm run lint` and `npx.cmd tsc --noEmit`. Database integration requires reachable PostgreSQL and MongoDB instances plus local environment values.

## Safety

- Keep `.env` private and never commit real credentials.
- Back up the PostgreSQL database before migrations.
- Do not run `prisma migrate reset` on a database with project data.
- Do not delete operational records with ticket, scan, incident, alert, assignment, or audit history.

