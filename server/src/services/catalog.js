import * as cache from "../cache/tleStore.js";
import {
  CELESTRAK_GROUPS,
  DEBRIS_FALLBACK_GROUPS,
  fetchCatnrJson,
  fetchGroupJson,
  groupMeta,
  isAllowedGroup,
  recordsFromGroup,
} from "./celestrak.js";
import { applyLimit, normalizeGpList } from "./catalogNormalizer.js";
import * as spaceTrack from "./spacetrack.js";

const CELESTRAK_TTL = () => Number(process.env.CELESTRAK_TTL_MS) || 6 * 60 * 60 * 1000;
const SPACE_TRACK_TTL = () => Number(process.env.SPACE_TRACK_TTL_MS) || 12 * 60 * 60 * 1000;

function envelope(records, extra = {}) {
  return {
    count: records.length,
    fetchedAt: extra.fetchedAt || new Date().toISOString(),
    stale: Boolean(extra.stale),
    source: extra.source || "celestrak",
    records,
    ...extra.meta,
  };
}

async function loadGroup(groupId, { force = false } = {}) {
  const key = `celestrak:${groupId}`;
  if (!force) {
    const hit = await cache.get(key);
    if (hit) {
      return {
        records: recordsFromGroup(hit.data, groupId),
        fetchedAt: new Date(hit.fetchedAt).toISOString(),
        stale: hit.stale,
        cache: hit.source,
      };
    }
  }

  try {
    const raw = await fetchGroupJson(groupId);
    const stored = await cache.set(key, raw, CELESTRAK_TTL());
    return {
      records: recordsFromGroup(raw, groupId),
      fetchedAt: new Date(stored.fetchedAt).toISOString(),
      stale: false,
      cache: "network",
    };
  } catch (err) {
    const stale = await cache.get(key, { allowStale: true });
    if (stale) {
      return {
        records: recordsFromGroup(stale.data, groupId),
        fetchedAt: new Date(stale.fetchedAt).toISOString(),
        stale: true,
        cache: "stale",
        warning: err.message,
      };
    }
    throw err;
  }
}

export function listGroups() {
  return {
    celestrak: CELESTRAK_GROUPS,
    debris: {
      id: "debris",
      label: "Orbital debris (LEO sample)",
      description: spaceTrack.hasCredentials()
        ? "Space-Track DEBRIS objects in LEO (period < 128 min)."
        : "CelesTrak debris/analyst fallback — add Space-Track credentials for a richer sample.",
      defaultOn: false,
      defaultCap: 1500,
      provider: spaceTrack.hasCredentials() ? "spacetrack" : "celestrak-fallback",
    },
  };
}

export async function getGroupObjects(groupId, limit) {
  const id = String(groupId || "").toLowerCase();
  if (id === "debris") {
    return getDebrisSample(limit);
  }
  if (!isAllowedGroup(id)) {
    const error = new Error(`Unknown group: ${id}`);
    error.status = 400;
    throw error;
  }
  const loaded = await loadGroup(id);
  const meta = groupMeta(id);
  const cap = Number(limit) > 0 ? Number(limit) : meta?.defaultCap || 400;
  return envelope(applyLimit(loaded.records, cap), {
    fetchedAt: loaded.fetchedAt,
    stale: loaded.stale,
    source: "celestrak",
    meta: {
      group: id,
      total: loaded.records.length,
      limit: cap,
      cache: loaded.cache,
      warning: loaded.warning,
    },
  });
}

export async function getDebrisSample(limit = 1500) {
  const cap = Math.min(Math.max(Number(limit) || 1500, 1), 2500);
  const key = "spacetrack:debris-leo";

  if (spaceTrack.hasCredentials()) {
    const hit = await cache.get(key);
    if (hit) {
      return envelope(applyLimit(hit.data, cap), {
        fetchedAt: new Date(hit.fetchedAt).toISOString(),
        stale: hit.stale,
        source: "spacetrack",
        meta: { group: "debris", total: hit.data.length, limit: cap, cache: hit.source },
      });
    }
    try {
      const records = await spaceTrack.fetchDebrisSample(cap);
      const stored = await cache.set(key, records, SPACE_TRACK_TTL());
      return envelope(applyLimit(records, cap), {
        fetchedAt: new Date(stored.fetchedAt).toISOString(),
        source: "spacetrack",
        meta: { group: "debris", total: records.length, limit: cap, cache: "network" },
      });
    } catch (err) {
      console.warn("[spacetrack] debris fetch failed, falling back:", err.message);
      const stale = await cache.get(key, { allowStale: true });
      if (stale) {
        return envelope(applyLimit(stale.data, cap), {
          fetchedAt: new Date(stale.fetchedAt).toISOString(),
          stale: true,
          source: "spacetrack",
          meta: {
            group: "debris",
            total: stale.data.length,
            limit: cap,
            cache: "stale",
            warning: err.message,
          },
        });
      }
    }
  }

  const merged = [];
  const seen = new Set();
  let warning;
  for (const g of DEBRIS_FALLBACK_GROUPS) {
    try {
      const loaded = await loadGroup(g.id);
      for (const rec of loaded.records) {
        if (seen.has(rec.noradId)) continue;
        seen.add(rec.noradId);
        merged.push({ ...rec, tags: [...new Set([...rec.tags, "debris"])] });
      }
    } catch (err) {
      warning = err.message;
    }
  }

  if (!merged.length) {
    const error = new Error(
      warning || "Debris catalog unavailable (configure Space-Track or retry CelesTrak)."
    );
    error.status = 502;
    throw error;
  }

  return envelope(applyLimit(merged, cap), {
    source: "celestrak",
    meta: {
      group: "debris",
      total: merged.length,
      limit: cap,
      cache: "fallback",
      warning: spaceTrack.hasCredentials()
        ? warning
        : "Using CelesTrak debris/analyst groups. Set SPACE_TRACK_USER to query the full catalog.",
    },
  });
}

export async function getObject(noradId) {
  const id = String(noradId || "").trim();
  if (!id) {
    const error = new Error("noradId required");
    error.status = 400;
    throw error;
  }

  const key = `celestrak:catnr:${id}`;
  const hit = await cache.get(key);
  let record = null;
  let fetchedAt = new Date().toISOString();
  let stale = false;
  let cacheSource = "network";

  if (hit && Array.isArray(hit.data) && hit.data.length) {
    record = normalizeGpList(hit.data, "celestrak", ["lookup"])[0] || null;
    if (record) {
      fetchedAt = new Date(hit.fetchedAt).toISOString();
      stale = hit.stale;
      cacheSource = hit.source;
    }
  }

  if (!record) {
    try {
      const raw = await fetchCatnrJson(id);
      await cache.set(key, raw, CELESTRAK_TTL());
      record = normalizeGpList(raw, "celestrak", ["lookup"])[0] || null;
    } catch (err) {
      const staleHit = await cache.get(key, { allowStale: true });
      if (staleHit) {
        record = normalizeGpList(staleHit.data, "celestrak", ["lookup"])[0] || null;
        stale = true;
        fetchedAt = new Date(staleHit.fetchedAt).toISOString();
      } else {
        throw err;
      }
    }
  }

  if (!record) {
    const error = new Error(`Object ${id} not found in CelesTrak`);
    error.status = 404;
    throw error;
  }

  let satcat = null;
  if (spaceTrack.hasCredentials()) {
    try {
      satcat = await spaceTrack.fetchSatcat(id);
      if (satcat) {
        record = {
          ...record,
          objectType: satcat.OBJECT_TYPE || record.objectType,
          country: satcat.COUNTRY || satcat.COUNTRY_CODE || record.country,
        };
      }
    } catch (err) {
      console.warn("[spacetrack] satcat merge skipped:", err.message);
    }
  }

  return {
    record,
    satcat,
    fetchedAt,
    stale,
    cache: cacheSource,
  };
}

export async function refreshCelestrakGroups() {
  const ids = CELESTRAK_GROUPS.map((g) => g.id);
  const results = [];
  for (const id of ids) {
    try {
      const loaded = await loadGroup(id, { force: true });
      results.push({ id, ok: true, count: loaded.records.length });
    } catch (err) {
      results.push({ id, ok: false, error: err.message });
    }
  }
  return results;
}

export async function refreshDebris() {
  if (!spaceTrack.hasCredentials()) {
    return { ok: false, skipped: true, reason: "no Space-Track credentials" };
  }
  try {
    const records = await spaceTrack.fetchDebrisSample(1500);
    await cache.set("spacetrack:debris-leo", records, SPACE_TRACK_TTL());
    return { ok: true, count: records.length };
  } catch (err) {
    return { ok: false, error: err.message };
  }
}
