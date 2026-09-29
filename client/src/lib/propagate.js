import {
  twoline2satrec,
  propagate,
  gstime,
  eciToGeodetic,
  eciToEcf,
  degreesLat,
  degreesLong,
  degreesToRadians,
  ecfToLookAngles,
} from "satellite.js";

export const KJSIT = { lat: 19.0473, lng: 72.8746, altKm: 0.014, name: "KJSIT, Sion" };

const satrecCache = new WeakMap();

export function satrecFromRecord(record) {
  if (!record?.tle?.line1 || !record?.tle?.line2) return null;
  const cached = satrecCache.get(record);
  if (cached) return cached;
  try {
    const rec = twoline2satrec(record.tle.line1, record.tle.line2);
    satrecCache.set(record, rec);
    return rec;
  } catch {
    return null;
  }
}

export function geodeticAt(satrec, date) {
  if (!satrec) return null;
  const pv = propagate(satrec, date);
  if (!pv?.position) return null;
  const gd = eciToGeodetic(pv.position, gstime(date));
  const speedKms = Math.sqrt(
    pv.velocity.x * pv.velocity.x + pv.velocity.y * pv.velocity.y + pv.velocity.z * pv.velocity.z
  );
  return {
    longitude: degreesLong(gd.longitude),
    latitude: degreesLat(gd.latitude),
    heightKm: gd.height,
    heightM: gd.height * 1000,
    speedKms,
    eci: pv.position,
  };
}

export function lookFromCampus(satrec, date, observer = KJSIT) {
  if (!satrec) return null;
  const pv = propagate(satrec, date);
  if (!pv?.position) return null;
  const positionEcf = eciToEcf(pv.position, gstime(date));
  const look = ecfToLookAngles(
    {
      longitude: degreesToRadians(observer.lng),
      latitude: degreesToRadians(observer.lat),
      height: observer.altKm,
    },
    positionEcf
  );
  return {
    elevationDeg: (look.elevation * 180) / Math.PI,
    azimuthDeg: (look.azimuth * 180) / Math.PI,
    rangeKm: look.rangeSat,
  };
}

export function orbitPathDegrees(record, date, samples = 90) {
  const satrec = satrecFromRecord(record);
  if (!satrec) return [];
  const periodMin = record.periodMin > 20 ? record.periodMin : 92;
  const stepMs = (periodMin * 60 * 1000) / samples;
  const pts = [];
  for (let i = 0; i <= samples; i += 1) {
    const t = new Date(date.getTime() + i * stepMs);
    const g = geodeticAt(satrec, t);
    if (g) pts.push(g.longitude, g.latitude, g.heightM);
  }
  return pts;
}

export function epochAgeHours(epoch, date) {
  if (!epoch) return null;
  const then = new Date(epoch.includes("T") ? epoch : epoch.replace(" ", "T") + "Z");
  if (Number.isNaN(then.getTime())) return null;
  return (date.getTime() - then.getTime()) / 3600000;
}

export function altitudeHistogram(records, binKm = 50, maxKm = 1600) {
  const bins = [];
  for (let lo = 0; lo < maxKm; lo += binKm) {
    bins.push({ lo, hi: lo + binKm, count: 0 });
  }
  for (const rec of records) {
    const alt = rec.perigeeKm;
    if (alt == null || alt < 0) continue;
    const idx = Math.min(bins.length - 1, Math.floor(alt / binKm));
    bins[idx].count += 1;
  }
  return bins;
}
