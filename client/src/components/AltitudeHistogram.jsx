export default function AltitudeHistogram({ bins }) {
  const max = Math.max(1, ...bins.map((b) => b.count));
  return (
    <section className="ow-panel p-3">
      <h2 className="mb-2 font-display text-sm tracking-wide text-phosphor-300">Altitude shells</h2>
      <p className="mb-2 text-[11px] text-slate-500">Perigee bins for loaded objects (km)</p>
      <div className="flex h-16 items-end gap-px">
        {bins.map((b) => (
          <div
            key={b.lo}
            title={`${b.lo}–${b.hi} km · ${b.count}`}
            className="flex-1 bg-phosphor-500/80"
            style={{ height: `${(b.count / max) * 100}%`, minHeight: b.count ? 2 : 0 }}
          />
        ))}
      </div>
      <div className="mt-1 flex justify-between font-mono text-[9px] text-slate-500">
        <span>0</span>
        <span>800</span>
        <span>1600</span>
      </div>
    </section>
  );
}
