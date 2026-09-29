export default function BeliefSatCard({ mission, onSimilar, compact, onExpand }) {
  if (!mission) {
    return (
      <section className="ow-panel p-3">
        <h2 className="font-display text-sm text-flare-400">BeliefSat-0</h2>
        <p className="mt-2 text-xs text-slate-500">Loading mission file…</p>
      </section>
    );
  }

  return (
    <section className="ow-panel p-3">
      <p className="ow-chip mb-2 w-fit">{mission.codename}</p>
      <h2 className="font-display text-lg leading-tight text-flare-400">{mission.name}</h2>
      <p className="mt-1 text-[11px] text-slate-400">{mission.institute}</p>
      <p className="mt-2 text-xs leading-relaxed text-slate-300">{mission.purpose}</p>
      <dl className="mt-3 grid grid-cols-2 gap-2 font-mono text-[10px] text-slate-400">
        <div>
          <dt>Launch</dt>
          <dd className="text-slate-200">
            {mission.launch.vehicle} · {mission.launch.date}
          </dd>
        </div>
        <div>
          <dt>Orbit</dt>
          <dd className="text-slate-200">
            ~{mission.orbit.altitudeKm} km · {mission.orbit.inclinationDeg}°
          </dd>
        </div>
        <div>
          <dt>Mass</dt>
          <dd className="text-slate-200">{mission.spacecraft.massG} g</dd>
        </div>
        <div>
          <dt>Status</dt>
          <dd className="text-flare-400">Decayed {mission.decay.date}</dd>
        </div>
      </dl>
      <p className="mt-3 text-[11px] leading-relaxed text-slate-500">{mission.decay.reason}</p>
      {!compact && (
        <ol className="mt-3 space-y-2 border-l border-white/10 pl-3">
          {mission.timeline.map((item) => (
            <li key={item.date + item.title}>
              <p className="font-mono text-[10px] text-phosphor-400">{item.date}</p>
              <p className="text-[12px] text-slate-200">{item.title}</p>
              <p className="text-[11px] text-slate-500">{item.body}</p>
            </li>
          ))}
        </ol>
      )}
      {compact && (
        <button type="button" onClick={onExpand} className="mt-2 text-[11px] text-phosphor-400">
          Full timeline
        </button>
      )}
      <button
        type="button"
        onClick={onSimilar}
        className="mt-3 w-full rounded-md bg-flare-500/15 py-1.5 text-xs text-flare-400"
      >
        {mission.similarPreset.label}
      </button>
    </section>
  );
}
