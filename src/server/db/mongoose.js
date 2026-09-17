import "server-only";
import mongoose from "mongoose";

const globalForMongoose = globalThis;

if (!globalForMongoose.__warehouseMongoose) {
  globalForMongoose.__warehouseMongoose = {
    connection: null,
    promise: null,
  };
}

const cache = globalForMongoose.__warehouseMongoose;

export async function connectMongoDB() {
  if (cache.connection) {
    return cache.connection;
  }

  const mongoUri = process.env.MONGODB_URI;

  if (!mongoUri) {
    throw new Error("MONGODB_URI must be configured before connecting to MongoDB.");
  }

  if (!cache.promise) {
    cache.promise = mongoose
      .connect(mongoUri, { autoIndex: false, autoCreate: false })
      .catch((error) => {
        cache.promise = null;
        throw error;
      });
  }

  cache.connection = await cache.promise;
  return cache.connection;
}
