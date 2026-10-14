import { useEffect, useRef, useState } from "react";
import {
  EMPTY_ENTRY,
  NAME_MAX,
  NOTE_MAX,
  PRIORITIES,
  validateAll,
  validateField,
} from "../lib/watchlistRules.js";

function Field({ label, error, hint, children }) {
  return (
    <label className="block">
      <span className="mb-1 flex justify-between text-[11px] text-slate-400">
        <span>{label}</span>
        {hint && <span className="font-mono text-slate-500">{hint}</span>}
      </span>
      {children}
      {error && <span className="mt-1 block text-[11px] text-rose-300">{error}</span>}
    </label>
  );
}

const inputClass = (error) =>
  `w-full rounded-md border bg-ink-950 px-2 py-1.5 text-sm outline-none focus:ring ${
    error ? "border-rose-400/60 ring-rose-400/30" : "border-white/10 ring-phosphor-500/40"
  }`;

/**
 * Controlled create/edit form with per-field validation.
 * `onSubmit` may throw an error carrying `details` (field → message) from the API.
 */
export default function WatchlistForm({ initial, editing, onSubmit, onCancel }) {
  const [values, setValues] = useState({ ...EMPTY_ENTRY, ...initial });
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});
  const [formError, setFormError] = useState("");
  const [busy, setBusy] = useState(false);
  const firstInput = useRef(null);

  useEffect(() => {
    setValues({ ...EMPTY_ENTRY, ...initial });
    setErrors({});
    setTouched({});
    setFormError("");
    firstInput.current?.focus();
  }, [initial]);

  function change(event) {
    const { name, value } = event.target;
    setValues((prev) => ({ ...prev, [name]: value }));
    if (touched[name]) setErrors((prev) => ({ ...prev, [name]: validateField(name, value) }));
  }

  function blur(event) {
    const { name, value } = event.target;
    setTouched((prev) => ({ ...prev, [name]: true }));
    setErrors((prev) => ({ ...prev, [name]: validateField(name, value) }));
  }

  async function submit(event) {
    event.preventDefault();
    const found = validateAll(values);
    setErrors(found);
    setTouched({ noradId: true, name: true, priority: true, note: true });
    if (Object.keys(found).length) return;

    setBusy(true);
    setFormError("");
    try {
      await onSubmit({
        noradId: values.noradId.trim(),
        name: values.name.trim(),
        priority: values.priority,
        note: values.note.trim(),
      });
      if (!editing) {
        setValues(EMPTY_ENTRY);
        setTouched({});
      }
    } catch (err) {
      if (err.details) setErrors((prev) => ({ ...prev, ...err.details }));
      setFormError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} noValidate className="space-y-3">
      <div className="grid grid-cols-[1fr_2fr] gap-3">
        <Field label="NORAD id *" error={touched.noradId && errors.noradId}>
          <input
            ref={firstInput}
            name="noradId"
            inputMode="numeric"
            value={values.noradId}
            onChange={change}
            onBlur={blur}
            placeholder="25544"
            className={`${inputClass(touched.noradId && errors.noradId)} font-mono`}
          />
        </Field>
        <Field
          label="Name *"
          error={touched.name && errors.name}
          hint={`${values.name.trim().length}/${NAME_MAX}`}
        >
          <input
            name="name"
            value={values.name}
            onChange={change}
            onBlur={blur}
            placeholder="ISS (ZARYA)"
            className={inputClass(touched.name && errors.name)}
          />
        </Field>
      </div>

      <Field label="Priority" error={touched.priority && errors.priority}>
        <div className="flex gap-2">
          {PRIORITIES.map((p) => (
            <label
              key={p}
              className={`cursor-pointer rounded-full border px-3 py-1 font-mono text-[11px] uppercase tracking-wider ${
                values.priority === p
                  ? "border-phosphor-400 bg-phosphor-500/20 text-phosphor-300"
                  : "border-white/10 text-slate-400"
              }`}
            >
              <input
                type="radio"
                name="priority"
                value={p}
                checked={values.priority === p}
                onChange={change}
                className="sr-only"
              />
              {p}
            </label>
          ))}
        </div>
      </Field>

      <Field
        label="Note"
        error={touched.note && errors.note}
        hint={`${values.note.length}/${NOTE_MAX}`}
      >
        <textarea
          name="note"
          rows={3}
          value={values.note}
          onChange={change}
          onBlur={blur}
          placeholder="Why are you tracking this object?"
          className={`${inputClass(touched.note && errors.note)} resize-none`}
        />
      </Field>

      {formError && (
        <p className="rounded-md border border-rose-400/40 bg-rose-500/10 px-2 py-1.5 text-[12px] text-rose-200">
          {formError}
        </p>
      )}

      <div className="flex gap-2">
        <button
          type="submit"
          disabled={busy}
          className="rounded-md bg-phosphor-500/20 px-3 py-1.5 font-mono text-[11px] uppercase tracking-wider text-phosphor-300 disabled:opacity-50"
        >
          {busy ? "Saving…" : editing ? "Save changes" : "Add to watchlist"}
        </button>
        {editing && (
          <button type="button" onClick={onCancel} className="ow-chip">
            Cancel
          </button>
        )}
      </div>
    </form>
  );
}
