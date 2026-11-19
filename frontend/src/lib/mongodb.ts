import { MongoClient } from 'mongodb';

const globalForMongo = globalThis as unknown as { mongoClientPromise?: Promise<MongoClient> };

/** Optional legacy diagnostics only. EventCrowd operational data is stored in PostgreSQL. */
export function getMongoClient(): Promise<MongoClient> {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error('MongoDB is optional and MONGODB_URI is not configured');
  if (!globalForMongo.mongoClientPromise) globalForMongo.mongoClientPromise = new MongoClient(uri).connect();
  return globalForMongo.mongoClientPromise;
}
