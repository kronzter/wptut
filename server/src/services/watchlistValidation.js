export const PRIORITIES = ["low", "medium", "high"];

const NORAD_RE = /^\d{1,9}$/;

/**
 * Validate a watchlist entry payload.
 * With `partial`, missing fields are allowed (PUT may send a subset).
 * @param {unknown} body
 * @param {{ partial?: boolean }} [opts]
 * @returns {{ value: Record<string, string>, errors: Record<string, string> }}
 */
export function validateEntry(body, opts = {}) {
  const partial = Boolean(opts.partial);
  const input = body && typeof body === "object" ? body : {};
  const value = {};
  const errors = {};

  const has = (key) => input[key] !== undefined && input[key] !== null;
  const str = (key) => String(input[key]).trim();

  if (has("noradId")) {
    const noradId = str("noradId");
    if (!NORAD_RE.test(noradId)) errors.noradId = "NORAD id must be 1–9 digits";
    else value.noradId = String(Number(noradId));
  } else if (!partial) {
    errors.noradId = "NORAD id is required";
  }

  if (has("name")) {
    const name = str("name");
    if (name.length < 2) errors.name = "Name must be at least 2 characters";
    else if (name.length > 48) errors.name = "Name must be at most 48 characters";
    else value.name = name;
  } else if (!partial) {
    errors.name = "Name is required";
  }

  if (has("priority")) {
    const priority = str("priority").toLowerCase();
    if (!PRIORITIES.includes(priority)) errors.priority = `Priority must be one of ${PRIORITIES.join(", ")}`;
    else value.priority = priority;
  } else if (!partial) {
    value.priority = "medium";
  }

  if (has("note")) {
    const note = str("note");
    if (note.length > 280) errors.note = "Note must be at most 280 characters";
    else value.note = note;
  } else if (!partial) {
    value.note = "";
  }

  if (partial && Object.keys(value).length === 0 && Object.keys(errors).length === 0) {
    errors._ = "Nothing to update";
  }

  return { value, errors };
}
