const API = import.meta.env.VITE_API_BASE || "";

async function getJson(path) {
  const res = await fetch(`${API}${path}`);
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(body.error || `${res.status} ${path}`);
  }
  return body;
}

export const api = {
  health: () => getJson("/api/health"),
  groups: () => getJson("/api/catalog/groups"),
  objects: (group, limit) =>
    getJson(`/api/catalog/objects?group=${encodeURIComponent(group)}&limit=${limit}`),
  object: (noradId) => getJson(`/api/catalog/object/${encodeURIComponent(noradId)}`),
  debris: (limit) => getJson(`/api/debris/sample?limit=${limit}`),
  spaceWeather: () => getJson("/api/space-weather/current"),
  launches: (limit = 10) => getJson(`/api/launches/upcoming?limit=${limit}`),
  beliefsat: () => getJson("/api/missions/beliefsat"),
};
