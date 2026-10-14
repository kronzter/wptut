import { Link } from "react-router-dom";
import { epochAgeHours, geodeticAt, lookFromCampus, satrecFromRecord } from "../lib/propagate.js";

function fmt(n, d = 2) {
  return n == null || Number.isNaN(n) ? "—" : Number(n).toFixed(d);
}

export default function ObjectInspector({ record, simTime }) {
  if (!record) {
    return (
      <section className="ow-panel p-3">
        <h2 className="font-display text-sm tracking-wide text-phosphor-300">Inspector</h2>
        <p className="mt-2 text-xs text-slate-500">Click a point or search a NORAD id.</p>
      </section>
    );
  }

  const satrec = satrecFromRecord(record);
  const geo = geodeticAt(satrec, simTime);
  const look = lookFromCampus(satrec, simTime);
  const age = epochAgeHours(record.epoch, simTime);
  const above = look && look.elevationDeg > 0;

  return (
    <section className="ow-panel p-3">
      <div className="mb-1 flex items-start justify-between gap-2">
        <h2 className="font-display text-sm leading-tight text-phosphor-300">{record.name}</h2>
        <div className="flex shrink-0 gap-1">
          <span className="ow-chip">{record.source}</span>
          <Link
            to={`/watchlist?${new URLSearchParams({ norad: record.noradId, name: record.name.slice(0, 48) })}`}
            className="ow-chip hover:bg-ink-700"
          >
            + Watch
          </Link>
        </div>
      </div>
      <p className="font-mono text-[11px] text-slate-400">NORAD {record.noradId}</p>
      {record.intDes && (
        <p className="font-mono text-[11px] text-slate-500">{record.intDes}</p>
      )}
      <dl className="mt-3 grid grid-cols-2 gap-x-3 gap-y-1.5 font-mono text-[11px]">
        <dt className="text-slate-500">Lat</dt>
        <dd>{fmt(geo?.latitude, 3)}°</dd>
        <dt className="text-slate-500">Lon</dt>
        <dd>{fmt(geo?.longitude, 3)}°</dd>
        <dt className="text-slate-500">Alt</dt>
        <dd>{fmt(geo?.heightKm, 1)} km</dd>
        <dt className="text-slate-500">Speed</dt>
        <dd>{fmt(geo?.speedKms, 2)} km/s</dd>
        <dt className="text-slate-500">Incl.</dt>
        <dd>{fmt(record.inclination, 2)}°</dd>
        <dt className="text-slate-500">Period</dt>
        <dd>{fmt(record.periodMin, 1)} min</dd>
        <dt className="text-slate-500">Perigee</dt>
        <dd>{fmt(record.perigeeKm, 0)} km</dd>
        <dt className="text-slate-500">Epoch age</dt>
        <dd className={age != null && Math.abs(age) > 36 ? "text-flare-400" : ""}>
          {age == null ? "—" : `${fmt(age, 1)} h`}
        </dd>
      </dl>
      <div className="mt-3 rounded-md bg-ink-800 px-2 py-2 text-[11px]">
        <p className="text-slate-400">From KJSIT campus horizon</p>
        {look ? (
          <p className="mt-1 font-mono">
            el {fmt(look.elevationDeg, 1)}° · az {fmt(look.azimuthDeg, 1)}° · {fmt(look.rangeKm, 0)} km
            <span className={`ml-2 ow-chip ${above ? "text-phosphor-300" : "text-slate-500"}`}>
              {above ? "above horizon" : "below"}
            </span>
          </p>
        ) : (
          <p className="text-slate-500">No look angles</p>
        )}
      </div>
      {record.objectType && (
        <p className="mt-2 text-[11px] text-slate-400">Type {record.objectType}</p>
      )}
    </section>
  );
}
