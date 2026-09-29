import { ommToTleLines } from "./ommToTle.js";

/**
 * Normalize CelesTrak / Space-Track GP (OMM JSON) records into a shared SatelliteRecord.
 * @typedef {object} SatelliteRecord
 * @property {string} noradId
 * @property {string} name
 * @property {string} intDes
 * @property {string|null} objectType
 * @property {string|null} country
 * @property {{ line1: string|null, line2: string|null }} tle
 * @property {object} omm
 * @property {string|null} epoch
 * @property {'celestrak'|'spacetrack'} source
 * @property {string[]} tags
 * @property {number|null} inclination
 * @property {number|null} meanMotion
 * @property {number|null} eccentricity
 * @property {number|null} periodMin
 * @property {number|null} apogeeKm
 * @property {number|null} perigeeKm
 */

const EARTH_RADIUS_KM = 6378.137;

/**
 * Mean motion (rev/day) → period minutes and approximate apogee/perigee.
 * @param {number|null} meanMotion
 * @param {number|null} eccentricity
 */
export function orbitalApprox(meanMotion, eccentricity) {
  const n = Number(meanMotion);
  const e = Number(eccentricity);
  if (!Number.isFinite(n) || n <= 0) {
    return { periodMin: null, apogeeKm: null, perigeeKm: null };
  }
  const periodMin = (24 * 60) / n;
  if (!Number.isFinite(e) || e < 0) {
    return { periodMin, apogeeKm: null, perigeeKm: null };
  }
  const mu = 398600.4418;
  const nRad = (n * 2 * Math.PI) / 86400;
  const a = Math.cbrt(mu / (nRad * nRad));
  return {
    periodMin,
    apogeeKm: a * (1 + e) - EARTH_RADIUS_KM,
    perigeeKm: a * (1 - e) - EARTH_RADIUS_KM,
  };
}

function asString(value) {
  if (value == null) return "";
  return String(value).trim();
}

function asNumber(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

/**
 * @param {object} raw
 * @param {'celestrak'|'spacetrack'} source
 * @param {string[]} [tags]
 * @returns {SatelliteRecord|null}
 */
export function normalizeGpRecord(raw, source, tags = []) {
  if (!raw || typeof raw !== "object") return null;

  const noradId = asString(
    raw.NORAD_CAT_ID ?? raw.norad_cat_id ?? raw.OBJECT_NUMBER ?? raw.OBJECT_ID
  ).replace(/^0+/, "") || asString(raw.NORAD_CAT_ID);

  let tle1 = raw.TLE_LINE1 || raw.tle_line1 || null;
  let tle2 = raw.TLE_LINE2 || raw.tle_line2 || null;
  const hasOmm =
    raw.EPOCH &&
    asNumber(raw.MEAN_MOTION) != null &&
    asNumber(raw.INCLINATION) != null;
  if ((!tle1 || !tle2) && hasOmm) {
    try {
      const built = ommToTleLines(raw);
      tle1 = built.line1;
      tle2 = built.line2;
    } catch {
      return null;
    }
  }
  if (!tle1 || !tle2) return null;

  const name = asString(raw.OBJECT_NAME || raw.SATNAME || raw.NAME) || "UNKNOWN";
  const intDes = asString(raw.OBJECT_ID || raw.INTLDES || raw.INTERNATIONAL_DESIGNATOR);
  const meanMotion = asNumber(raw.MEAN_MOTION ?? raw.MEAN_MOTION);
  const eccentricity = asNumber(raw.ECCENTRICITY);
  const approx = orbitalApprox(meanMotion, eccentricity);

  const id = asString(raw.NORAD_CAT_ID ?? raw.norad_cat_id ?? noradId);

  return {
    noradId: id,
    name,
    intDes,
    objectType: asString(raw.OBJECT_TYPE) || null,
    country: asString(raw.COUNTRY_CODE || raw.COUNTRY) || null,
    tle: { line1: tle1, line2: tle2 },
    omm: raw,
    epoch: raw.EPOCH ? String(raw.EPOCH) : null,
    source,
    tags: [...new Set(tags)],
    inclination: asNumber(raw.INCLINATION),
    meanMotion,
    eccentricity,
    periodMin: approx.periodMin,
    apogeeKm: approx.apogeeKm,
    perigeeKm: approx.perigeeKm,
  };
}

/**
 * @param {unknown} payload
 * @param {'celestrak'|'spacetrack'} source
 * @param {string[]} tags
 * @returns {SatelliteRecord[]}
 */
export function normalizeGpList(payload, source, tags = []) {
  const list = Array.isArray(payload) ? payload : payload ? [payload] : [];
  const out = [];
  const seen = new Set();
  for (const raw of list) {
    const rec = normalizeGpRecord(raw, source, tags);
    if (!rec || seen.has(rec.noradId)) continue;
    seen.add(rec.noradId);
    out.push(rec);
  }
  return out;
}

/**
 * @param {SatelliteRecord[]} records
 * @param {number} [limit]
 */
export function applyLimit(records, limit) {
  if (!limit || limit <= 0 || records.length <= limit) return records;
  return records.slice(0, limit);
}
