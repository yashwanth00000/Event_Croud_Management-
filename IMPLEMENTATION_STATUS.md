# EventCrowd implementation increment – portal workflows

This package extends the supplied EventCrowd source with additional portal routes and backend workflows. It is an implementation increment, not a fully verified production release.

## Implemented in this increment
- Attendee `/register` and `/login` pages connected to attendee-only registration and role-aware authentication APIs; successful requests open the attendee workspace.
- The main `/login` route is a four-role sign-in chooser; attendee sign-in is also available at `/attendee/login`.
- Public `/events` catalogue lists published events and links to ticket selection; the public event API response is limited to published events.
- Volunteer signup and login pages connected to the pending-application and role-aware authentication APIs.
- Admin and security staff login pages connected to role-aware authentication; privileged accounts remain admin-provisioned, with no public admin/staff signup.
- Portal logout now uses the session-clearing POST endpoint.
- Separate Admin, Volunteer and Security Staff login pages using the existing signed-cookie authentication API.
- Login endpoint checks the requested portal role; inactive accounts cannot log in.
- Public attendee signup always assigns ATTENDEE (no longer promotes the first public registrant to ADMIN).
- Volunteer application API creates an INACTIVE account with VOLUNTEER role and profile; no session is created until approval.
- Admin volunteer list/create/approve/reject/deactivate/reactivate API and volunteer review page.
- Admin volunteer assignment API; active approved volunteers only.
- Admin staff creation/list/status API and staff assignment API.
- Attendee registration API creates a confirmed registration and tickets transactionally, with quantity and inventory validation.
- Ticket type listing/creation API.
- Gate scan API for Admin/Security Staff, with ticket/event/gate validation and duplicate entry rejection.
- Alert create/list/update lifecycle API.
- Incident status/assignment/severity update API.
- Role-guarded portal section pages for Admin, Volunteer, Security Staff and Attendee.
- A one-time interactive admin provisioning script (`npm run admin:create`) for fresh environments.

## Important limitations
- Several admin modules (zones, gates, reports, audit logs, settings, profiles), attendee ticket detail/QR display, staff scanner UI, notifications, password recovery, and full CRUD forms remain scaffolded or need additional implementation.
- Gate scan is a baseline implementation. For production, add signed QR payloads, transactional scan locking/idempotency, and more comprehensive ENTRY/EXIT state rules.
- Payment processing is not implemented. Ticket price is stored but no payment gateway is connected.
- Email/SMS notifications are not configured.
- Crowd observation ingestion remains dependent on real sensor/operator submissions; no fabricated telemetry is generated.
- Security hardening still requires rate limiting, origin/CSRF controls, password reset flow, session revocation, and comprehensive authorization tests.
- No automated end-to-end tests were executed during packaging.

## Safe setup
1. Extract the archive and open `EventCrowd/frontend`.
2. Copy your own `.env` file; never share or commit it.
3. `npm install`
4. `npx.cmd prisma generate`
5. Do not reset the database. Review migrations and take a backup before applying any pending migration.
6. `npm run lint`
7. `npx.cmd tsc --noEmit`
8. `npm run build`
9. For a new database only, provision an admin with `npm run admin:create`. This creates a privileged account and must be run by the database owner in a trusted environment.
10. `npm run dev`

Existing migrations and data are preserved. No database reset is required by this increment.
