// EventCrowd MongoDB CRUD reference for mongosh / MongoDB Compass Playground.
// Select the `eventcrowd` database first. Replace example values with real IDs.
// These operate on MongoDB document mirrors; they do not change PostgreSQL source rows.

// SELECT / READ
db.crowd_observations.find({ eventId: "<event-uuid>" }).sort({ observedAt: -1 });
db.contact_messages.find({ status: "NEW" }).sort({ createdAt: -1 });
db.incident_timeline.find({ incidentId: "<incident-uuid>" }).sort({ createdAt: 1 });
db.system_activity.find({ eventId: "<event-uuid>" }).sort({ createdAt: -1 });

// UPDATE one crowd observation document
db.crowd_observations.updateOne(
  { postgresId: "<crowd-observation-uuid>" },
  { $set: { occupancy: 120, capacity: 200, percentage: 60, observedAt: new Date() } }
);

// UPDATE one contact message document
db.contact_messages.updateOne(
  { postgresId: "<contact-message-uuid>" },
  { $set: { status: "READ" } }
);

// UPDATE one incident timeline document
db.incident_timeline.updateOne(
  { incidentId: "<incident-uuid>" },
  { $set: { note: "Updated timeline note" } }
);

// UPDATE one activity document
db.system_activity.updateOne(
  { _id: ObjectId("000000000000000000000000") },
  { $set: { message: "Updated activity message" } }
);

// DELETE one mirror/document. This does NOT delete its PostgreSQL source record.
db.crowd_observations.deleteOne({ postgresId: "<crowd-observation-uuid>" });
db.contact_messages.deleteOne({ postgresId: "<contact-message-uuid>" });
db.incident_timeline.deleteOne({ incidentId: "<incident-uuid>" });
db.system_activity.deleteOne({ _id: ObjectId("000000000000000000000000") });

// Counts to confirm which MongoDB documents remain
db.crowd_observations.countDocuments({});
db.contact_messages.countDocuments({});
db.incident_timeline.countDocuments({});
db.system_activity.countDocuments({});
