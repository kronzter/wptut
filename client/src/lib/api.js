const API = import.meta.env.VITE_API_BASE || "";

async function getJson(path, init) {
  const res = await fetch(`${API}${path}`, init);
  if (res.status === 204) return null;
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
    const err = new Error(body.error || `${res.status} ${path}`);
    err.status = res.status;
    err.details = body.details;
    throw err;
  }
  return body;
}

function sendJson(method, path, data) {
  return getJson(path, {
    method,
    headers: { "Content-Type": "application/json" },
    body: data === undefined ? undefined : JSON.stringify(data),
  });
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
  watchlist: {
    list: (store) => getJson(`/api/watchlist/${store}`),
    create: (store, entry) => sendJson("POST", `/api/watchlist/${store}`, entry),
    update: (store, id, changes) => sendJson("PUT", `/api/watchlist/${store}/${id}`, changes),
    remove: (store, id) => sendJson("DELETE", `/api/watchlist/${store}/${id}`),
  },
};
