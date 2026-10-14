import path from "path";
import fs from "fs/promises";
import { fileURLToPath } from "url";
import { MongoClient, ObjectId } from "mongodb";
import { DuplicateError } from "./sqlWatchlist.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const LOCAL_DB_PATH = path.resolve(__dirname, "../../data/mongo");
// Pin the binary cache to the one `npm install` fills at the repo root; otherwise the
// location depends on the cwd and `npm run dev -w server` re-downloads mongod.
const BINARY_DIR = path.resolve(__dirname, "../../../node_modules/.cache/mongodb-memory-server");
const READY_TIMEOUT_MS = 15000;

function toEntry(doc) {
  if (!doc) return null;
  return {
    id: doc._id.toString(),
    noradId: doc.noradId,
    name: doc.name,
    priority: doc.priority,
    note: doc.note,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
}

function toObjectId(id) {
  return ObjectId.isValid(id) ? new ObjectId(String(id)) : null;
}

function rethrow(err, noradId) {
  if (err?.code === 11000) throw new DuplicateError(noradId);
  throw err;
}

/**
 * Start an embedded mongod, persisted under server/data/mongo.
 * It listens on the standard port (27017) by default so tools like Compass can connect to
 * mongodb://127.0.0.1:27017 while the API is running.
 * @param {number} [port]
 */
async function startLocalMongo(port) {
  const { MongoMemoryServer } = await import("mongodb-memory-server");
  await fs.mkdir(LOCAL_DB_PATH, { recursive: true });
  const server = await MongoMemoryServer.create({
    instance: {
      port: port || Number(process.env.MONGO_LOCAL_PORT) || 27017,
      dbPath: LOCAL_DB_PATH,
      storageEngine: "wiredTiger",
    },
    binary: { downloadDir: process.env.MONGOMS_DOWNLOAD_DIR || BINARY_DIR },
  });
  return { uri: server.getUri(), stop: () => server.stop({ doCleanup: false }) };
}

/** Port of a single-host mongodb://localhost URI, or null for remote / SRV / multi-host URIs. */
function localPort(uri) {
  try {
    const { protocol, hostname, port } = new URL(uri);
    if (protocol !== "mongodb:" || !["127.0.0.1", "localhost", "[::1]"].includes(hostname)) return null;
    return Number(port) || 27017;
  } catch {
    return null;
  }
}

async function openClient(uri, timeoutMS) {
  const client = new MongoClient(uri, { serverSelectionTimeoutMS: timeoutMS });
  await client.connect();
  return client;
}

/**
 * NoSQL (MongoDB) watchlist repository. Connects lazily on first use.
 * @param {{ uri?: string, dbName?: string }} [opts]
 */
export function createMongoWatchlist(opts = {}) {
  let ready = null;
  let client = null;
  let local = null;

  function connect() {
    ready ??= (async () => {
      const uri = opts.uri ?? process.env.MONGODB_URI;
      const port = uri ? localPort(uri) : null;
      try {
        if (!uri) throw new Error("MONGODB_URI not set");
        // A local URI gets a short timeout: if nothing is installed there, start the embedded one.
        client = await openClient(uri, port ? 1500 : 5000);
        console.log(`MongoDB: connected to ${uri}`);
      } catch (err) {
        if (uri && !port) throw err;
        local = await startLocalMongo(port);
        client = await openClient(local.uri, 5000);
        console.log(`MongoDB: embedded server at ${local.uri}`);
      }
      const col = client.db(opts.dbName || process.env.MONGODB_DB || "orbitwatch").collection("watchlist");
      await col.createIndex({ noradId: 1 }, { unique: true });
      return col;
    })().catch((err) => {
      ready = null;
      err.status = 503;
      err.message = `MongoDB unavailable: ${err.message}`;
      throw err;
    });
    return ready;
  }

  // Requests wait a bounded time for startup instead of hanging on a first-run download.
  function collection() {
    let timer;
    const timeout = new Promise((_, reject) => {
      timer = setTimeout(() => {
        const err = new Error("MongoDB is still starting - try again in a moment");
        err.status = 503;
        reject(err);
      }, READY_TIMEOUT_MS);
    });
    return Promise.race([connect(), timeout]).finally(() => clearTimeout(timer));
  }

  return {
    kind: "nosql",
    engine: "MongoDB",

    /** Start connecting in the background so the first request doesn't pay for it. */
    warm() {
      connect().catch((err) => console.warn(err.message));
    },

    async list() {
      const col = await collection();
      const docs = await col.find().sort({ createdAt: -1, _id: -1 }).toArray();
      return docs.map(toEntry);
    },

    async get(id) {
      const _id = toObjectId(id);
      if (!_id) return null;
      const col = await collection();
      return toEntry(await col.findOne({ _id }));
    },

    async create(entry) {
      const col = await collection();
      const now = new Date().toISOString();
      const doc = { ...entry, createdAt: now, updatedAt: now };
      try {
        const { insertedId } = await col.insertOne(doc);
        return toEntry({ _id: insertedId, ...doc });
      } catch (err) {
        rethrow(err, entry.noradId);
      }
    },

    async update(id, changes) {
      const _id = toObjectId(id);
      if (!_id) return null;
      const col = await collection();
      try {
        const doc = await col.findOneAndUpdate(
          { _id },
          { $set: { ...changes, updatedAt: new Date().toISOString() } },
          { returnDocument: "after" }
        );
        return toEntry(doc);
      } catch (err) {
        rethrow(err, changes.noradId);
      }
    },

    async remove(id) {
      const _id = toObjectId(id);
      if (!_id) return false;
      const col = await collection();
      const { deletedCount } = await col.deleteOne({ _id });
      return deletedCount > 0;
    },

    async close() {
      await client?.close();
      await local?.stop();
    },
  };
}
