const API = import.meta.env.VITE_API_BASE || "";

async function getJson(path) {
  const res = await fetch(`${API}${path}`);
  const text = await res.text();
  const trimmed = text.trimStart();
  if (trimmed.startsWith("<!") || trimmed.startsWith("<html")) {
    throw new Error(
      `API returned a web page instead of JSON for ${path}. Start the server with npm run dev (API on port 3001).`
    );
  }
  let body = {};
  try {
    body = text ? JSON.parse(text) : {};
  } catch {
    throw new Error(`Could not parse JSON from ${path}`);
  }
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
