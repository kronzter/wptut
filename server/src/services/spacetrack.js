import { normalizeGpList, normalizeGpRecord } from "./catalogNormalizer.js";

const LOGIN_URL = "https://www.space-track.org/ajaxauth/login";
const BASE = "https://www.space-track.org";

let cookieHeader = null;
let loginAt = 0;
const LOGIN_TTL_MS = 6 * 60 * 60 * 1000;

export function hasCredentials() {
  return Boolean(process.env.SPACE_TRACK_USER && process.env.SPACE_TRACK_PASSWORD);
}

function collectCookies(res) {
  const getter = res.headers.getSetCookie?.bind(res.headers);
  const list = getter ? getter() : [];
  if (list.length) {
    return list.map((c) => c.split(";")[0]).join("; ");
  }
  const single = res.headers.get("set-cookie");
  return single ? single.split(";")[0] : null;
}

export async function login(force = false) {
  if (!hasCredentials()) {
    throw new Error("Space-Track credentials are not configured");
  }
  if (!force && cookieHeader && Date.now() - loginAt < LOGIN_TTL_MS) {
    return cookieHeader;
  }

  const body = new URLSearchParams({
    identity: process.env.SPACE_TRACK_USER,
    password: process.env.SPACE_TRACK_PASSWORD,
  });

  const res = await fetch(LOGIN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
    redirect: "manual",
  });

  const cookies = collectCookies(res);
  if (!cookies) {
    throw new Error(`Space-Track login failed (${res.status})`);
  }
  cookieHeader = cookies;
  loginAt = Date.now();
  return cookieHeader;
}

async function query(path, { retry = true } = {}) {
  await login();
  const res = await fetch(`${BASE}${path}`, {
    headers: { Cookie: cookieHeader, Accept: "application/json" },
  });
  if ((res.status === 401 || res.status === 403) && retry) {
    await login(true);
    return query(path, { retry: false });
  }
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Space-Track ${res.status}: ${text.slice(0, 200)}`);
  }
  return res.json();
}

/**
 * LEO-ish debris sample: non-decayed DEBRIS with period under ~128 min.
 * @param {number} limit
 */
export async function fetchDebrisSample(limit = 1500) {
  const cap = Math.min(Math.max(Number(limit) || 1500, 1), 2500);
  const path =
    `/basicspacedata/query/class/gp/OBJECT_TYPE/DEBRIS/DECAY_DATE/null-val/` +
    `PERIOD/0--128/orderby/NORAD_CAT_ID/limit/${cap}/format/json`;
  const raw = await query(path);
  return normalizeGpList(raw, "spacetrack", ["debris"]);
}

export async function fetchSatcat(noradId) {
  const path = `/basicspacedata/query/class/satcat/NORAD_CAT_ID/${encodeURIComponent(
    noradId
  )}/format/json`;
  const raw = await query(path);
  return Array.isArray(raw) ? raw[0] || null : raw;
}

export async function fetchGpByNorad(noradId) {
  const path = `/basicspacedata/query/class/gp/NORAD_CAT_ID/${encodeURIComponent(
    noradId
  )}/format/json`;
  const raw = await query(path);
  const rec = Array.isArray(raw) ? raw[0] : raw;
  return rec ? normalizeGpRecord(rec, "spacetrack", []) : null;
}
