const LAYERS = [
  { id: "stations", label: "Stations", blurb: "ISS / CSS", color: "bg-phosphor-400" },
  { id: "amateur", label: "Amateur", blurb: "HAM analogs", color: "bg-emerald-400" },
  { id: "starlink", label: "Starlink", blurb: "constellation", color: "bg-fuchsia-400" },
  { id: "active", label: "Active", blurb: "payloads", color: "bg-sky-400" },
  { id: "debris", label: "Debris", blurb: "LEO sample", color: "bg-flare-400" },
];

export default function LayerPanel({ layers, onToggle, onCap, counts, loading }) {
  return (
    <section className="ow-panel p-3">
      <div className="mb-2 flex items-center justify-between">
        <h2 className="font-display text-sm tracking-wide text-phosphor-300">Layers</h2>
        <span className="font-mono text-[10px] text-slate-500">WebGL caps on</span>
      </div>
      <ul className="space-y-2">
        {LAYERS.map((layer) => {
          const state = layers[layer.id];
          const count = counts[layer.id];
          const busy = loading[layer.id];
          return (
            <li key={layer.id} className="rounded-lg bg-ink-800/70 px-2 py-2">
              <label className="flex cursor-pointer items-center gap-2">
                <input
                  type="checkbox"
                  checked={state.on}
                  onChange={() => onToggle(layer.id)}
                  className="accent-phosphor-400"
                />
                <span className={`h-2 w-2 rounded-full ${layer.color}`} />
                <span className="flex-1 text-sm">{layer.label}</span>
                <span className="font-mono text-[10px] text-slate-500">
                  {busy ? "…" : count != null ? count : "—"}
                </span>
              </label>
              <p className="ml-7 text-[11px] text-slate-500">{layer.blurb}</p>
              {state.on && (
                <div className="ml-7 mt-1 flex items-center gap-2">
                  <input
                    type="range"
                    min={20}
                    max={layer.id === "debris" ? 1500 : layer.id === "starlink" ? 800 : 400}
                    value={state.cap}
                    onChange={(e) => onCap(layer.id, Number(e.target.value))}
                    className="w-full accent-phosphor-400"
                  />
                  <span className="w-10 font-mono text-[10px] text-slate-400">{state.cap}</span>
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
