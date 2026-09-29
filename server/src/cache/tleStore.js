import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CACHE_DIR = path.resolve(__dirname, "../../data/cache");

/** @type {Map<string, { data: unknown, fetchedAt: number, ttl: number }>} */
const memory = new Map();

function fileFor(key) {
  const safe = key.replace(/[^a-zA-Z0-9._-]/g, "_");
  return path.join(CACHE_DIR, `${safe}.json`);
}

export async function ensureCacheDir() {
  await fs.mkdir(CACHE_DIR, { recursive: true });
}

export function stats() {
  const entries = [...memory.entries()].map(([key, value]) => ({
    key,
    ageMs: Date.now() - value.fetchedAt,
    ttlMs: value.ttl,
    fresh: Date.now() - value.fetchedAt < value.ttl,
    bytes: Buffer.byteLength(JSON.stringify(value.data)),
  }));
  return { size: memory.size, entries };
}

/**
 * @param {string} key
 * @param {{ allowStale?: boolean }} [opts]
 */
export async function get(key, opts = {}) {
  const mem = memory.get(key);
  if (mem) {
    const fresh = Date.now() - mem.fetchedAt < mem.ttl;
    if (fresh || opts.allowStale) {
      return { data: mem.data, fetchedAt: mem.fetchedAt, stale: !fresh, source: "memory" };
    }
  }

  try {
    const raw = await fs.readFile(fileFor(key), "utf8");
    const parsed = JSON.parse(raw);
    memory.set(key, {
      data: parsed.data,
      fetchedAt: parsed.fetchedAt,
      ttl: parsed.ttl,
    });
    const fresh = Date.now() - parsed.fetchedAt < parsed.ttl;
    if (fresh || opts.allowStale) {
      return { data: parsed.data, fetchedAt: parsed.fetchedAt, stale: !fresh, source: "disk" };
    }
  } catch {
    // miss
  }

  return null;
}

/**
 * @param {string} key
 * @param {unknown} data
 * @param {number} ttl
 */
export async function set(key, data, ttl) {
  const record = { data, fetchedAt: Date.now(), ttl };
  memory.set(key, record);
  try {
    await ensureCacheDir();
    await fs.writeFile(fileFor(key), JSON.stringify(record), "utf8");
  } catch (err) {
    console.warn(`[cache] failed to persist ${key}:`, err.message);
  }
  return record;
}

export function keys() {
  return [...memory.keys()];
}
