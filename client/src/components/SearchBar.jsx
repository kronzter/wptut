import { useMemo, useState } from "react";

export default function SearchBar({ objects, onPick, onLookup, lookupError, lookupBusy }) {
  const [q, setQ] = useState("");

  const matches = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (needle.length < 2) return [];
    return objects
      .filter(
        (o) =>
          o.record.noradId.includes(needle) ||
          o.record.name.toLowerCase().includes(needle)
      )
      .slice(0, 8);
  }, [q, objects]);

  function submit(event) {
    event.preventDefault();
    const needle = q.trim();
    if (!needle) return;
    const local = objects.find(
      (o) =>
        o.record.noradId === needle ||
        o.record.name.toLowerCase() === needle.toLowerCase()
    );
    if (local) {
      onPick(local.record.noradId);
      return;
    }
    onLookup(needle);
  }

  return (
    <section className="ow-panel p-3">
      <h2 className="mb-2 font-display text-sm tracking-wide text-phosphor-300">Search</h2>
      <form onSubmit={submit} className="flex gap-2">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="NORAD id or name"
          className="w-full rounded-md border border-white/10 bg-ink-950 px-2 py-1.5 font-mono text-xs outline-none ring-phosphor-500/40 focus:ring"
        />
        <button
          type="submit"
          className="rounded-md bg-phosphor-500/20 px-2 font-mono text-[10px] uppercase tracking-wider text-phosphor-300"
        >
          {lookupBusy ? "…" : "Go"}
        </button>
      </form>
      {lookupError && <p className="mt-1 text-[11px] text-rose-300">{lookupError}</p>}
      {matches.length > 0 && (
        <ul className="mt-2 max-h-40 space-y-1 overflow-auto ow-scroll">
          {matches.map((m) => (
            <li key={m.record.noradId}>
              <button
                type="button"
                onClick={() => onPick(m.record.noradId)}
                className="w-full rounded px-1 py-1 text-left text-[12px] hover:bg-ink-700"
              >
                <span className="font-mono text-phosphor-400">{m.record.noradId}</span>{" "}
                <span className="text-slate-300">{m.record.name}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
