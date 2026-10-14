import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useSearchParams } from "react-router-dom";
import { api } from "../lib/api.js";
import WatchlistForm from "../components/WatchlistForm.jsx";

const STORES = [
  { id: "sql", label: "SQL", engine: "SQLite" },
  { id: "nosql", label: "NoSQL", engine: "MongoDB" },
];

const PRIORITY_STYLE = {
  high: "text-rose-300",
  medium: "text-flare-400",
  low: "text-slate-400",
};

export default function WatchlistPage() {
  const [params, setParams] = useSearchParams();
  const store = STORES.some((s) => s.id === params.get("store")) ? params.get("store") : "sql";
  const [editing, setEditing] = useState(null);
  const queryClient = useQueryClient();

  // Prefill from the globe inspector's "Watch" link: /watchlist?norad=25544&name=ISS
  const prefill = useMemo(
    () => ({ noradId: params.get("norad") || "", name: params.get("name") || "" }),
    [params.get("norad"), params.get("name")]
  );

  const listQ = useQuery({
    queryKey: ["watchlist", store],
    queryFn: () => api.watchlist.list(store),
    staleTime: 0,
  });

  const refresh = () => queryClient.invalidateQueries({ queryKey: ["watchlist", store] });

  const createM = useMutation({
    mutationFn: (entry) => api.watchlist.create(store, entry),
    onSuccess: () => {
      refresh();
      if (params.get("norad")) setParams({ store });
    },
  });
  const updateM = useMutation({
    mutationFn: ({ id, changes }) => api.watchlist.update(store, id, changes),
    onSuccess: () => {
      refresh();
      setEditing(null);
    },
  });
  const deleteM = useMutation({
    mutationFn: (id) => api.watchlist.remove(store, id),
    onSuccess: refresh,
  });

  function switchStore(id) {
    setEditing(null);
    setParams({ store: id });
  }

  function remove(entry) {
    if (window.confirm(`Remove ${entry.name} (${entry.noradId}) from the ${store.toUpperCase()} watchlist?`)) {
      if (editing?.id === entry.id) setEditing(null);
      deleteM.mutate(entry.id);
    }
  }

  const entries = listQ.data?.entries || [];
  const engine = STORES.find((s) => s.id === store).engine;

  return (
    <div className="ow-scroll h-full overflow-auto">
      <div className="mx-auto max-w-5xl px-4 py-4">
        <header className="mb-4 flex flex-wrap items-end justify-between gap-3">
          <div>
            <Link to="/" className="font-mono text-[11px] text-phosphor-400 hover:underline">
              ← Back to globe
            </Link>
            <h1 className="font-display text-3xl font-extrabold tracking-tight text-white">Watchlist</h1>
            <p className="text-sm text-phosphor-300/90">
              Same CRUD API, two databases — pick where entries are stored.
            </p>
          </div>
          <div className="flex rounded-full border border-white/10 bg-ink-900 p-1">
            {STORES.map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => switchStore(s.id)}
                className={`rounded-full px-3 py-1 font-mono text-[11px] uppercase tracking-wider ${
                  store === s.id ? "bg-phosphor-500/25 text-phosphor-300" : "text-slate-400"
                }`}
              >
                {s.label} · {s.engine}
              </button>
            ))}
          </div>
        </header>

        <div className="grid gap-4 md:grid-cols-[340px_1fr]">
          <section className="ow-panel h-fit p-4">
            <h2 className="mb-3 font-display text-sm tracking-wide text-phosphor-300">
              {editing ? `Edit ${editing.name}` : "Add an object"}
            </h2>
            <WatchlistForm
              key={store}
              initial={editing || prefill}
              editing={Boolean(editing)}
              onCancel={() => setEditing(null)}
              onSubmit={(values) =>
                editing
                  ? updateM.mutateAsync({ id: editing.id, changes: values })
                  : createM.mutateAsync(values)
              }
            />
          </section>

          <section className="ow-panel p-4">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="font-display text-sm tracking-wide text-phosphor-300">
                Stored in {engine}
              </h2>
              <span className="font-mono text-[10px] text-slate-500">
                {listQ.isFetching ? "…" : `${entries.length} entries`} · /api/watchlist/{store}
              </span>
            </div>

            {listQ.isError && (
              <p className="rounded-md border border-rose-400/40 bg-rose-500/10 px-2 py-1.5 text-[12px] text-rose-200">
                {listQ.error.message}
              </p>
            )}
            {deleteM.isError && (
              <p className="mb-2 text-[12px] text-rose-300">{deleteM.error.message}</p>
            )}

            {listQ.isSuccess && entries.length === 0 && (
              <p className="text-xs text-slate-500">
                Nothing here yet. Add an object, or use “Watch” in the globe inspector.
              </p>
            )}

            {entries.length > 0 && (
              <table className="w-full text-left text-[12px]">
                <thead className="font-mono text-[10px] uppercase tracking-wider text-slate-500">
                  <tr>
                    <th className="pb-2">NORAD</th>
                    <th className="pb-2">Name</th>
                    <th className="pb-2">Priority</th>
                    <th className="pb-2">Note</th>
                    <th className="pb-2" />
                  </tr>
                </thead>
                <tbody>
                  {entries.map((e) => (
                    <tr
                      key={e.id}
                      className={`border-t border-white/5 align-top ${
                        editing?.id === e.id ? "bg-phosphor-500/5" : ""
                      }`}
                    >
                      <td className="py-2 pr-2 font-mono text-phosphor-400">{e.noradId}</td>
                      <td className="py-2 pr-2 text-slate-200">{e.name}</td>
                      <td className={`py-2 pr-2 font-mono uppercase ${PRIORITY_STYLE[e.priority]}`}>
                        {e.priority}
                      </td>
                      <td className="max-w-[220px] py-2 pr-2 text-slate-400">{e.note || "—"}</td>
                      <td className="whitespace-nowrap py-2 text-right">
                        <button type="button" className="ow-chip mr-1" onClick={() => setEditing(e)}>
                          Edit
                        </button>
                        <button
                          type="button"
                          className="ow-chip border-rose-400/30 text-rose-300"
                          onClick={() => remove(e)}
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
