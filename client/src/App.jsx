import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, Route, Routes } from "react-router-dom";
import { api } from "./lib/api.js";
import { altitudeHistogram } from "./lib/propagate.js";
import Globe from "./components/Globe.jsx";
import LayerPanel from "./components/LayerPanel.jsx";
import SearchBar from "./components/SearchBar.jsx";
import TimeScrubber from "./components/TimeScrubber.jsx";
import ObjectInspector from "./components/ObjectInspector.jsx";
import AltitudeHistogram from "./components/AltitudeHistogram.jsx";
import SpaceWeatherPanel from "./components/SpaceWeatherPanel.jsx";
import LaunchesPanel from "./components/LaunchesPanel.jsx";
import BeliefSatCard from "./components/BeliefSatCard.jsx";
import WatchlistPage from "./pages/WatchlistPage.jsx";

const INITIAL_LAYERS = {
  stations: { on: true, cap: 80 },
  amateur: { on: false, cap: 200 },
  starlink: { on: false, cap: 800 },
  active: { on: false, cap: 400 },
  debris: { on: false, cap: 1200 },
};

function useLayerQuery(id, enabled, cap, fetcher) {
  return useQuery({
    queryKey: ["catalog", id, cap],
    queryFn: fetcher,
    enabled,
  });
}

function Dashboard() {
  const [layers, setLayers] = useState(INITIAL_LAYERS);
  const [selectedId, setSelectedId] = useState(null);
  const [extraRecord, setExtraRecord] = useState(null);
  const [live, setLive] = useState(true);
  const [offsetMin, setOffsetMin] = useState(0);
  const [now, setNow] = useState(() => Date.now());
  const [flyToken, setFlyToken] = useState(0);
  const [lookupError, setLookupError] = useState("");
  const [lookupBusy, setLookupBusy] = useState(false);
  const [storyOpen, setStoryOpen] = useState(false);

  useEffect(() => {
    if (!live) return undefined;
    const id = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(id);
  }, [live]);

  const simTime = useMemo(
    () => new Date(now + offsetMin * 60 * 1000),
    [now, offsetMin]
  );

  const stationsQ = useLayerQuery("stations", layers.stations.on, layers.stations.cap, () =>
    api.objects("stations", layers.stations.cap)
  );
  const amateurQ = useLayerQuery("amateur", layers.amateur.on, layers.amateur.cap, () =>
    api.objects("amateur", layers.amateur.cap)
  );
  const starlinkQ = useLayerQuery("starlink", layers.starlink.on, layers.starlink.cap, () =>
    api.objects("starlink", layers.starlink.cap)
  );
  const activeQ = useLayerQuery("active", layers.active.on, layers.active.cap, () =>
    api.objects("active", layers.active.cap)
  );
  const debrisQ = useLayerQuery("debris", layers.debris.on, layers.debris.cap, () =>
    api.debris(layers.debris.cap)
  );

  const weatherQ = useQuery({ queryKey: ["weather"], queryFn: api.spaceWeather });
  const launchesQ = useQuery({ queryKey: ["launches"], queryFn: () => api.launches(10) });
  const missionQ = useQuery({ queryKey: ["beliefsat"], queryFn: api.beliefsat });
  const healthQ = useQuery({ queryKey: ["health"], queryFn: api.health, refetchInterval: 60000 });

  const queries = {
    stations: stationsQ,
    amateur: amateurQ,
    starlink: starlinkQ,
    active: activeQ,
    debris: debrisQ,
  };

  const objects = useMemo(() => {
    const out = [];
    const seen = new Set();
    for (const id of Object.keys(layers)) {
      if (!layers[id].on) continue;
      const records = queries[id].data?.records || [];
      for (const record of records) {
        if (seen.has(record.noradId)) continue;
        seen.add(record.noradId);
        out.push({ layer: id, record });
      }
    }
    if (extraRecord && !seen.has(extraRecord.noradId)) {
      out.push({ layer: extraRecord.tags?.includes("debris") ? "debris" : "stations", record: extraRecord });
    }
    return out;
  }, [
    layers,
    extraRecord,
    stationsQ.data,
    amateurQ.data,
    starlinkQ.data,
    activeQ.data,
    debrisQ.data,
  ]);

  const selectedRecord =
    objects.find((o) => o.record.noradId === selectedId)?.record ||
    (extraRecord?.noradId === selectedId ? extraRecord : null);

  const counts = Object.fromEntries(
    Object.entries(queries).map(([k, q]) => [k, q.data?.count ?? q.data?.records?.length])
  );
  const loading = Object.fromEntries(Object.entries(queries).map(([k, q]) => [k, q.isFetching]));

  const bins = useMemo(
    () => altitudeHistogram(objects.map((o) => o.record)),
    [objects]
  );

  const errors = Object.values(queries)
    .filter((q) => q.isError)
    .map((q) => q.error.message);

  function toggle(id) {
    setLayers((prev) => ({ ...prev, [id]: { ...prev[id], on: !prev[id].on } }));
  }

  function cap(id, value) {
    setLayers((prev) => ({ ...prev, [id]: { ...prev[id], cap: value } }));
  }

  function pick(noradId) {
    setSelectedId(noradId);
    setFlyToken((n) => n + 1);
    setLookupError("");
  }

  async function lookup(needle) {
    setLookupBusy(true);
    setLookupError("");
    try {
      const payload = await api.object(needle);
      setExtraRecord(payload.record);
      setLayers((prev) => ({ ...prev, stations: { ...prev.stations, on: true } }));
      pick(payload.record.noradId);
    } catch (err) {
      setLookupError(err.message);
    } finally {
      setLookupBusy(false);
    }
  }

  function showSimilar() {
    setLayers((prev) => ({
      ...prev,
      stations: { ...prev.stations, on: true },
      amateur: { ...prev.amateur, on: true },
    }));
    setStoryOpen(false);
  }

  return (
    <div className="relative flex h-full min-h-0 flex-col overflow-hidden">
      <header className="flex shrink-0 items-end justify-between px-4 py-3">
        <div>
          <p className="font-display text-3xl font-extrabold tracking-tight text-white">
            OrbitWatch
          </p>
          <p className="text-sm text-phosphor-300/90">
            New Leap Labs · BeliefSat-0 context · live LEO traffic
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link to="/watchlist" className="ow-chip hover:bg-ink-700">
            Watchlist
          </Link>
          <p className="font-mono text-[10px] text-slate-400">
            {healthQ.data?.ok ? "API live" : healthQ.isError ? "API down" : "API…"} ·{" "}
            {objects.length} objects
          </p>
        </div>
      </header>

      {errors.length > 0 && (
        <div className="mx-4 mb-2 rounded-md border border-rose-400/40 bg-ink-900/95 px-3 py-2 text-xs text-rose-200">
          {errors[0]}
        </div>
      )}

      <div className="flex min-h-0 flex-1 gap-3 px-3 pb-3">
        <aside className="ow-scroll flex w-[280px] shrink-0 flex-col gap-3 overflow-auto">
          <LayerPanel layers={layers} onToggle={toggle} onCap={cap} counts={counts} loading={loading} />
          <SearchBar
            objects={objects}
            onPick={pick}
            onLookup={lookup}
            lookupError={lookupError}
            lookupBusy={lookupBusy}
          />
          <TimeScrubber
            live={live}
            offsetMin={offsetMin}
            onLive={setLive}
            onOffset={setOffsetMin}
            simTime={simTime}
          />
          <AltitudeHistogram bins={bins} />
        </aside>

        <div className="relative min-h-0 min-w-0 flex-1 overflow-hidden rounded-xl bg-[#1d4e89] shadow-panel">
          <Globe
            objects={objects}
            simTime={simTime}
            selectedId={selectedId}
            onSelect={pick}
            flyToken={flyToken}
          />
        </div>

        <aside className="ow-scroll flex w-[300px] shrink-0 flex-col gap-3 overflow-auto">
          <ObjectInspector record={selectedRecord} simTime={simTime} />
          <SpaceWeatherPanel
            data={weatherQ.data}
            error={weatherQ.error}
            loading={weatherQ.isLoading}
          />
          <LaunchesPanel
            data={launchesQ.data}
            error={launchesQ.error}
            loading={launchesQ.isLoading}
            onOpenBeliefsat={() => setStoryOpen(true)}
          />
          <BeliefSatCard
            mission={missionQ.data}
            compact
            onExpand={() => setStoryOpen(true)}
            onSimilar={showSimilar}
          />
        </aside>
      </div>

      {storyOpen && missionQ.data && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/60 p-6">
          <div className="max-h-[90vh] w-full max-w-lg overflow-auto ow-scroll">
            <div className="mb-2 flex justify-end">
              <button type="button" className="ow-chip" onClick={() => setStoryOpen(false)}>
                Close
              </button>
            </div>
            <BeliefSatCard mission={missionQ.data} onSimilar={showSimilar} />
          </div>
        </div>
      )}
    </div>
  );
}

export default function App() {
  return (
    <Routes>
      <Route path="/watchlist" element={<WatchlistPage />} />
      <Route path="/*" element={<Dashboard />} />
    </Routes>
  );
}
