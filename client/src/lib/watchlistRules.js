// Mirrors server/src/services/watchlistValidation.js so users get feedback before submitting.
export const PRIORITIES = ["low", "medium", "high"];
export const NOTE_MAX = 280;
export const NAME_MAX = 48;

export const EMPTY_ENTRY = { noradId: "", name: "", priority: "medium", note: "" };

const rules = {
  noradId(v) {
    const s = v.trim();
    if (!s) return "NORAD id is required";
    if (!/^\d+$/.test(s)) return "Digits only (e.g. 25544)";
    if (s.length > 9) return "At most 9 digits";
    return "";
  },
  name(v) {
    const s = v.trim();
    if (!s) return "Name is required";
    if (s.length < 2) return "At least 2 characters";
    if (s.length > NAME_MAX) return `At most ${NAME_MAX} characters`;
    return "";
  },
  priority(v) {
    return PRIORITIES.includes(v) ? "" : "Pick a priority";
  },
  note(v) {
    return v.length > NOTE_MAX ? `At most ${NOTE_MAX} characters` : "";
  },
};

export function validateField(field, value) {
  return rules[field] ? rules[field](value ?? "") : "";
}

export function validateAll(values) {
  const errors = {};
  for (const field of Object.keys(rules)) {
    const message = validateField(field, values[field]);
    if (message) errors[field] = message;
  }
  return errors;
}
