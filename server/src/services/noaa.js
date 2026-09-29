/**
 * NOAA SWPC JSON helpers.
 * Handles both the pre-2026 table format (first row = headers) and the
 * post-March-2026 list-of-objects format.
 */

function isHeaderRow(row) {
  return Array.isArray(row) && row.some((cell) => typeof cell === "string" && /time/i.test(cell));
}

/**
 * @param {unknown} payload
 * @returns {object[]}
 */
export function parseTableOrObjects(payload) {
  if (!payload) return [];

  if (Array.isArray(payload)) {
    if (payload.length === 0) return [];

    const first = payload[0];
    if (first && typeof first === "object" && !Array.isArray(first)) {
      return payload.filter((row) => row && typeof row === "object");
    }

    if (Array.isArray(first) && isHeaderRow(first)) {
      const headers = first.map((h) => String(h));
      return payload.slice(1).map((row) => {
        const obj = {};
        headers.forEach((key, i) => {
          obj[key] = Array.isArray(row) ? row[i] : undefined;
        });
        return obj;
      });
    }

    if (Array.isArray(first)) {
      return payload.map((row) => (Array.isArray(row) ? { value: row } : row));
    }
  }

  if (typeof payload === "object") {
    return [payload];
  }
  return [];
}

function num(value) {
  if (value == null || value === "") return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function pick(row, keys) {
  if (!row) return null;
  for (const key of keys) {
    if (row[key] != null && row[key] !== "") return row[key];
    const found = Object.keys(row).find((k) => k.toLowerCase() === key.toLowerCase());
    if (found && row[found] != null && row[found] !== "") return row[found];
  }
  return null;
}

export function normalizeKpSeries(payload) {
  const rows = parseTableOrObjects(payload);
  return rows
    .map((row) => {
      const time = pick(row, ["time_tag", "time", "datetime"]);
      const kp = num(pick(row, ["Kp", "kp", "kp_index", "estimated_kp", "Kp_index"]));
      if (!time || kp == null) return null;
      return { timeTag: String(time), kp };
    })
    .filter(Boolean);
}

export function summarizeScales(payload) {
  const src = payload && typeof payload === "object" ? payload : {};
  const bucket = src["0"] || src[0] || src.now || src;
  const read = (letter) => {
    const block = bucket[letter] || src[letter] || {};
    return {
      scale: block.Scale ?? block.scale ?? null,
      text: block.Text ?? block.text ?? null,
    };
  };
  return { R: read("R"), S: read("S"), G: read("G") };
}

export function normalizeSolarWind(payload) {
  const rows = parseTableOrObjects(payload);
  const last = rows[rows.length - 1] || rows[0] || null;
  if (!last) return { speedKms: null, timeTag: null };
  return {
    speedKms: num(pick(last, ["WindSpeed", "wind_speed", "speed", "proton_speed"])),
    timeTag: pick(last, ["time_tag", "time", "datetime"]) || null,
  };
}

export function spaceWeatherView(kpPayload, scalesPayload, windPayload) {
  const series = normalizeKpSeries(kpPayload);
  const latest = series[series.length - 1] || null;
  const kp = latest?.kp ?? null;
  let gFromKp = null;
  if (kp != null) {
    if (kp >= 9) gFromKp = "G5";
    else if (kp >= 8) gFromKp = "G4";
    else if (kp >= 7) gFromKp = "G3";
    else if (kp >= 6) gFromKp = "G2";
    else if (kp >= 5) gFromKp = "G1";
    else gFromKp = "G0";
  }
  return {
    updatedAt: new Date().toISOString(),
    kp: {
      latest,
      series: series.slice(-24),
    },
    scales: summarizeScales(scalesPayload),
    geomagneticFromKp: gFromKp,
    solarWind: normalizeSolarWind(windPayload),
    narrative: amateurRadioBlurb(kp, gFromKp),
  };
}

export function amateurRadioBlurb(kp, gScale) {
  if (kp == null) {
    return "Space-weather feeds are still loading. BeliefSat-0 flew a UHF/VHF FM repeater — geomagnetic storms can disturb HF and, at high latitudes, VHF paths.";
  }
  if (kp >= 5) {
    return `Kp is ${kp} (${gScale || "storm"}). Elevated geomagnetic activity increases LEO atmospheric drag and can degrade HF amateur links. VHF/UHF repeater work (BeliefSat-0's band) is usually more resilient than HF, but polar passes suffer more scintillation.`;
  }
  if (kp >= 4) {
    return `Kp is ${kp} (unsettled / ${gScale || "G0"}). Minor drag upticks in low LEO and occasional HF absorption. Campus-style VHF/UHF telemetry like BeliefSat-0's 30s APRS beacons typically still copy.`;
  }
  return `Kp is ${kp} (quiet). Drag and HF conditions are near baseline — a good window for amateur-satellite copy and for comparing live LEO tracks against BeliefSat-0's 350 km class orbit.`;
}

const SWPC = "https://services.swpc.noaa.gov/products";

export async function fetchSpaceWeather() {
  const [kpRes, scalesRes, windRes] = await Promise.all([
    fetch(`${SWPC}/noaa-planetary-k-index.json`),
    fetch(`${SWPC}/noaa-scales.json`),
    fetch(`${SWPC}/summary/solar-wind-speed.json`),
  ]);

  if (!kpRes.ok) throw new Error(`NOAA Kp failed: ${kpRes.status}`);

  const kpPayload = await kpRes.json();
  const scalesPayload = scalesRes.ok ? await scalesRes.json() : {};
  const windPayload = windRes.ok ? await windRes.json() : {};
  return spaceWeatherView(kpPayload, scalesPayload, windPayload);
}
