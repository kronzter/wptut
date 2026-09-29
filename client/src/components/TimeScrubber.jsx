export default function TimeScrubber({ live, offsetMin, onLive, onOffset, simTime }) {
  return (
    <section className="ow-panel p-3">
      <div className="mb-2 flex items-center justify-between">
        <h2 className="font-display text-sm tracking-wide text-phosphor-300">Sim time</h2>
        <button
          type="button"
          onClick={() => onLive(!live)}
          className={`ow-chip ${live ? "border-phosphor-400 text-phosphor-300" : "text-slate-400"}`}
        >
          {live ? "Live" : "Paused"}
        </button>
      </div>
      <p className="mb-2 font-mono text-[11px] text-slate-400">
        {simTime.toISOString().replace(".000", "")}
      </p>
      <input
        type="range"
        min={-90}
        max={90}
        value={offsetMin}
        onChange={(e) => {
          onLive(false);
          onOffset(Number(e.target.value));
        }}
        className="w-full accent-flare-400"
      />
      <div className="mt-1 flex justify-between font-mono text-[10px] text-slate-500">
        <span>−90 min</span>
        <span>{offsetMin === 0 ? "epoch now" : `${offsetMin > 0 ? "+" : ""}${offsetMin} min`}</span>
        <span>+90 min</span>
      </div>
      <button
        type="button"
        onClick={() => {
          onOffset(0);
          onLive(true);
        }}
        className="mt-2 text-[11px] text-phosphor-400 underline-offset-2 hover:underline"
      >
        Reset to live clock
      </button>
    </section>
  );
}
