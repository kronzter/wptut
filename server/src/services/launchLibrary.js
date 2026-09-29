const PROD = "https://ll.thespacedevs.com/2.3.0";
const DEV = "https://lldev.thespacedevs.com/2.3.0";

export function ll2Base() {
  return String(process.env.LL2_MODE || "dev").toLowerCase() === "prod" ? PROD : DEV;
}

/**
 * @param {number} limit
 */
export async function fetchUpcomingLaunches(limit = 10) {
  const cap = Math.min(Math.max(Number(limit) || 10, 1), 20);
  const url = `${ll2Base()}/launches/upcoming/?limit=${cap}&mode=detailed`;
  const res = await fetch(url, {
    headers: { Accept: "application/json", "User-Agent": "OrbitWatch/1.0 (educational)" },
  });
  if (!res.ok) {
    throw new Error(`Launch Library 2 failed: ${res.status}`);
  }
  const json = await res.json();
  const results = Array.isArray(json.results) ? json.results : [];
  return {
    source: ll2Base(),
    count: json.count ?? results.length,
    results: results.map(compactLaunch),
  };
}

function compactLaunch(item) {
  const lsp = item.launch_service_provider || {};
  const rocket = item.rocket?.configuration || {};
  const pad = item.pad || {};
  const loc = pad.location || {};
  const mission = item.mission || {};
  const name = String(lsp.name || "");
  const isIsro =
    /isro|indian space/i.test(name) ||
    /pslv|gslv|lvm3|sslv/i.test(String(rocket.name || item.name || ""));
  return {
    id: item.id,
    name: item.name,
    net: item.net,
    status: item.status?.name || null,
    image: item.image?.image_url || item.image || null,
    provider: lsp.name || null,
    countryCode: lsp.country_code || null,
    rocket: rocket.name || rocket.full_name || null,
    pad: pad.name || null,
    location: loc.name || null,
    mission: mission.name || null,
    description: mission.description || item.mission?.description || null,
    isIsro,
    url: item.url || null,
  };
}
