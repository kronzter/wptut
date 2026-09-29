import { normalizeGpList } from "./catalogNormalizer.js";

const CELESTRAK_GP = "https://celestrak.org/NORAD/elements/gp.php";

export const CELESTRAK_GROUPS = [
  {
    id: "stations",
    label: "Space stations",
    description: "ISS, CSS, and related crew vehicles — default live layer.",
    defaultOn: true,
    defaultCap: 80,
    tags: ["station"],
  },
  {
    id: "starlink",
    label: "Starlink",
    description: "SpaceX constellation. Capped in the UI for WebGL.",
    defaultOn: false,
    defaultCap: 800,
    tags: ["starlink", "constellation"],
  },
  {
    id: "active",
    label: "Active payloads",
    description: "Broad active-satellite catalog. Use a low cap.",
    defaultOn: false,
    defaultCap: 400,
    tags: ["active"],
  },
  {
    id: "amateur",
    label: "Amateur radio",
    description: "HAM / amateur satellites — BeliefSat-0 analogs.",
    defaultOn: false,
    defaultCap: 200,
    tags: ["amateur"],
  },
  {
    id: "visual",
    label: "Bright visual",
    description: "Objects often visible to the unaided eye.",
    defaultOn: false,
    defaultCap: 200,
    tags: ["visual"],
  },
  {
    id: "gps-ops",
    label: "GPS operational",
    description: "GNSS operational constellation sample.",
    defaultOn: false,
    defaultCap: 80,
    tags: ["gnss"],
  },
  {
    id: "oneweb",
    label: "OneWeb",
    description: "OneWeb LEO broadband constellation.",
    defaultOn: false,
    defaultCap: 400,
    tags: ["oneweb", "constellation"],
  },
];

export const DEBRIS_FALLBACK_GROUPS = [
  { id: "analyst", tags: ["debris", "analyst"] },
  { id: "cosmos-2251-debris", tags: ["debris"] },
  { id: "iridium-33-debris", tags: ["debris"] },
  { id: "fengyun-1c-debris", tags: ["debris"] },
];

const ALLOWED = new Set([
  ...CELESTRAK_GROUPS.map((g) => g.id),
  ...DEBRIS_FALLBACK_GROUPS.map((g) => g.id),
]);

export function isAllowedGroup(group) {
  return ALLOWED.has(String(group || "").toLowerCase());
}

export function groupMeta(groupId) {
  return CELESTRAK_GROUPS.find((g) => g.id === groupId) || null;
}

/**
 * @param {string} group
 * @returns {Promise<object[]>}
 */
export async function fetchGroupJson(group) {
  const id = String(group).toLowerCase();
  if (!isAllowedGroup(id)) {
    throw new Error(`Unknown CelesTrak group: ${group}`);
  }
  const url = `${CELESTRAK_GP}?GROUP=${encodeURIComponent(id)}&FORMAT=json`;
  const res = await fetch(url, {
    headers: { Accept: "application/json", "User-Agent": "OrbitWatch/1.0 (educational)" },
  });
  if (!res.ok) {
    throw new Error(`CelesTrak ${id} failed: ${res.status} ${res.statusText}`);
  }
  const data = await res.json();
  if (!Array.isArray(data)) {
    throw new Error(`CelesTrak ${id} returned unexpected payload`);
  }
  return data;
}

export async function fetchCatnrJson(noradId) {
  const url = `${CELESTRAK_GP}?CATNR=${encodeURIComponent(noradId)}&FORMAT=json`;
  const res = await fetch(url, {
    headers: { Accept: "application/json", "User-Agent": "OrbitWatch/1.0 (educational)" },
  });
  if (!res.ok) {
    throw new Error(`CelesTrak CATNR ${noradId} failed: ${res.status}`);
  }
  return res.json();
}

export function recordsFromGroup(raw, groupId) {
  const meta = groupMeta(groupId);
  const fallback = DEBRIS_FALLBACK_GROUPS.find((g) => g.id === groupId);
  const tags = meta?.tags || fallback?.tags || [groupId];
  return normalizeGpList(raw, "celestrak", tags);
}
