export default function SpaceWeatherPanel({ data, error, loading }) {
  if (loading && !data) {
    return (
      <section className="ow-panel p-3">
        <h2 className="font-display text-sm text-phosphor-300">Space weather</h2>
        <p className="mt-2 text-xs text-slate-500">Fetching NOAA SWPC…</p>
      </section>
    );
  }
  if (error && !data) {
    return (
      <section className="ow-panel p-3">
        <h2 className="font-display text-sm text-phosphor-300">Space weather</h2>
        <p className="mt-2 text-xs text-rose-300">{error.message}</p>
      </section>
    );
  }
  if (!data) return null;

  const series = data.kp?.series || [];
  const maxKp = 9;
  const kp = data.kp?.latest?.kp;

  return (
    <section className="ow-panel p-3">
      <div className="mb-1 flex items-center justify-between">
        <h2 className="font-display text-sm text-phosphor-300">Space weather</h2>
        <span className="ow-chip">{data.geomagneticFromKp || "G?"}</span>
      </div>
      <p className="font-mono text-2xl text-white">
        Kp {kp == null ? "—" : Number(kp).toFixed(2)}
      </p>
      <p className="text-[11px] text-slate-500">
        NOAA scales R{data.scales?.R?.scale ?? "—"} · S{data.scales?.S?.scale ?? "—"} · G
        {data.scales?.G?.scale ?? "—"}
        {data.solarWind?.speedKms != null && ` · wind ${Math.round(data.solarWind.speedKms)} km/s`}
      </p>
      <div className="mt-3 flex h-12 items-end gap-px">
        {series.map((s) => (
          <div
            key={s.timeTag}
            title={`${s.timeTag} Kp ${s.kp}`}
            className={s.kp >= 5 ? "bg-flare-400" : "bg-phosphor-500/70"}
            style={{ height: `${(s.kp / maxKp) * 100}%`, flex: 1, minHeight: 2 }}
          />
        ))}
      </div>
      <p className="mt-3 text-[11px] leading-relaxed text-slate-400">{data.narrative}</p>
      {data.stale && <p className="mt-1 text-[10px] text-flare-400">Showing cached NOAA data</p>}
    </section>
  );
}
