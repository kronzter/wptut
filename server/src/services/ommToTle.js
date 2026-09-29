function checksum(line) {
  let sum = 0;
  for (let i = 0; i < 68; i += 1) {
    const c = line[i] || " ";
    if (c === "-") sum += 1;
    else if (c >= "0" && c <= "9") sum += Number(c);
  }
  return String(sum % 10);
}

function writeField(buf, start, width, text) {
  const s = String(text);
  for (let i = 0; i < width; i += 1) {
    buf[start + i] = s[i] && s[i] !== "\0" ? s[i] : " ";
  }
}

function satnumField(noradId) {
  const n = Number(noradId);
  if (Number.isFinite(n) && n <= 99999) return String(Math.trunc(n)).padStart(5, "0");
  const s = String(noradId ?? "").replace(/\D/g, "");
  return s.slice(-5).padStart(5, "0");
}

function intlDesField(objectId) {
  const m = String(objectId || "").match(/(\d{2})?(\d{2})-(\d{3})([A-Za-z]*)/);
  if (!m) return "".padEnd(8, " ");
  return `${m[2]}${m[3]}${(m[4] || "").toUpperCase()}`.padEnd(8, " ");
}

function epochField(iso) {
  const raw = String(iso || "");
  const d = new Date(/Z$/i.test(raw) || /[+-]\d{2}:\d{2}$/.test(raw) ? raw : `${raw}Z`);
  if (Number.isNaN(d.getTime())) return "00000.00000000";
  const year = d.getUTCFullYear();
  const yy = String(year % 100).padStart(2, "0");
  const start = Date.UTC(year, 0, 1);
  const doy = (d.getTime() - start) / 86400000 + 1;
  const [whole, frac] = doy.toFixed(8).split(".");
  return `${yy}${whole.padStart(3, "0")}.${frac}`;
}

function ndotField(value) {
  const n = Number(value) || 0;
  const sign = n < 0 ? "-" : " ";
  const body = Math.abs(n).toFixed(8).replace(/^0/, "");
  return `${sign}${body}`.padStart(10, " ");
}

function expField(value) {
  const n = Number(value) || 0;
  if (Math.abs(n) < 1e-16) return " 00000-0";
  const sign = n < 0 ? "-" : " ";
  const abs = Math.abs(n);
  let exp = Math.floor(Math.log10(abs) + 1);
  let digits = Math.round(abs / 10 ** (exp - 5));
  if (digits >= 100000) {
    digits = Math.round(digits / 10);
    exp += 1;
  }
  const expSign = exp < 0 ? "-" : "+";
  return `${sign}${String(digits).padStart(5, "0")}${expSign}${Math.abs(exp)}`;
}

function rightAlign(value, width, decimals) {
  const n = Number(value);
  if (!Number.isFinite(n)) return "".padStart(width, " ");
  return n.toFixed(decimals).padStart(width, " ");
}

function eccField(value) {
  const n = Number(value) || 0;
  return Math.abs(n).toFixed(7).replace(/^0\./, "").replace(".", "").slice(0, 7).padStart(7, "0");
}

/**
 * Build classic two-line elements from a CelesTrak/Space-Track OMM JSON object.
 * Uses NORAD column layout so satellite.js twoline2satrec can parse 9-digit ids
 * by keeping the last five digits in the satnum field.
 * @param {object} omm
 * @returns {{ line1: string, line2: string }}
 */
export function ommToTleLines(omm) {
  const satnum = satnumField(omm.NORAD_CAT_ID);
  const classif = (String(omm.CLASSIFICATION_TYPE || "U")[0] || "U").toUpperCase();
  const elset = String(Math.trunc(Number(omm.ELEMENT_SET_NO) || 999) % 10000).padStart(4, " ");
  const eph = String(omm.EPHEMERIS_TYPE ?? 0)[0] || "0";

  const line1Chars = Array(68).fill(" ");
  writeField(line1Chars, 0, 1, "1");
  writeField(line1Chars, 2, 5, satnum);
  writeField(line1Chars, 7, 1, classif);
  writeField(line1Chars, 9, 8, intlDesField(omm.OBJECT_ID));
  writeField(line1Chars, 18, 14, epochField(omm.EPOCH));
  writeField(line1Chars, 33, 10, ndotField(omm.MEAN_MOTION_DOT));
  writeField(line1Chars, 44, 8, expField(omm.MEAN_MOTION_DDOT));
  writeField(line1Chars, 53, 8, expField(omm.BSTAR));
  writeField(line1Chars, 62, 1, eph);
  writeField(line1Chars, 64, 4, elset);
  const line1 = `${line1Chars.join("")}${checksum(line1Chars.join(""))}`;

  const rev = String(Math.trunc(Number(omm.REV_AT_EPOCH) || 0) % 100000).padStart(5, "0");
  const line2Chars = Array(68).fill(" ");
  writeField(line2Chars, 0, 1, "2");
  writeField(line2Chars, 2, 5, satnum);
  writeField(line2Chars, 8, 8, rightAlign(omm.INCLINATION, 8, 4));
  writeField(line2Chars, 17, 8, rightAlign(omm.RA_OF_ASC_NODE, 8, 4));
  writeField(line2Chars, 26, 7, eccField(omm.ECCENTRICITY));
  writeField(line2Chars, 34, 8, rightAlign(omm.ARG_OF_PERICENTER, 8, 4));
  writeField(line2Chars, 43, 8, rightAlign(omm.MEAN_ANOMALY, 8, 4));
  writeField(line2Chars, 52, 11, rightAlign(omm.MEAN_MOTION, 11, 8));
  writeField(line2Chars, 63, 5, rev);
  const line2 = `${line2Chars.join("")}${checksum(line2Chars.join(""))}`;

  return { line1, line2 };
}
