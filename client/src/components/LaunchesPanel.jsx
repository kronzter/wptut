import { useMemo, useState } from "react";

export default function LaunchesPanel({ data, error, loading, onOpenBeliefsat }) {
  const [indiaOnly, setIndiaOnly] = useState(false);

  const rows = useMemo(() => {
    const list = data?.results || [];
    if (!indiaOnly) return list;
    return list.filter((l) => l.isIsro || l.countryCode === "IND");
  }, [data, indiaOnly]);

  return (
    <section className="ow-panel p-3">
      <div className="mb-2 flex items-center justify-between gap-2">
        <h2 className="font-display text-sm text-phosphor-300">Upcoming launches</h2>
        <button
          type="button"
          onClick={() => setIndiaOnly((v) => !v)}
          className={`ow-chip ${indiaOnly ? "text-flare-400 border-flare-400/40" : ""}`}
        >
          India / ISRO
        </button>
      </div>
      {loading && !data && <p className="text-xs text-slate-500">Loading Launch Library 2…</p>}
      {error && !data && <p className="text-xs text-rose-300">{error.message}</p>}
      <ul className="max-h-48 space-y-2 overflow-auto ow-scroll">
        {rows.map((launch) => (
          <li key={launch.id} className="rounded-md bg-ink-800/80 p-2">
            <p className="text-[12px] leading-snug text-slate-100">{launch.name}</p>
            <p className="mt-0.5 font-mono text-[10px] text-slate-500">
              {launch.net ? new Date(launch.net).toUTCString() : "NET TBD"}
            </p>
            <p className="text-[10px] text-slate-400">
              {launch.provider}
              {launch.rocket ? ` · ${launch.rocket}` : ""}
            </p>
          </li>
        ))}
        {data && rows.length === 0 && (
          <li className="text-[11px] text-slate-500">
            No ISRO rows in this window. BeliefSat-0 flew on PSLV-C58 (1 Jan 2024).
          </li>
        )}
      </ul>
      <button
        type="button"
        onClick={onOpenBeliefsat}
        className="mt-2 text-[11px] text-flare-400 underline-offset-2 hover:underline"
      >
        Open PSLV-C58 / BeliefSat-0 story
      </button>
      {data?.stale && <p className="mt-1 text-[10px] text-flare-400">Cached LL2 data</p>}
    </section>
  );
}
