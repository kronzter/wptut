import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  amateurRadioBlurb,
  normalizeKpSeries,
  parseTableOrObjects,
  spaceWeatherView,
  summarizeScales,
} from "../services/noaa.js";

describe("parseTableOrObjects", () => {
  it("maps legacy header-row tables", () => {
    const rows = parseTableOrObjects([
      ["time_tag", "Kp"],
      ["2026-03-01 00:00:00", "2.33"],
      ["2026-03-01 03:00:00", "4"],
    ]);
    assert.equal(rows.length, 2);
    assert.equal(rows[0].time_tag, "2026-03-01 00:00:00");
    assert.equal(rows[0].Kp, "2.33");
  });

  it("passes through list-of-objects (post-2026 format)", () => {
    const rows = parseTableOrObjects([
      { time_tag: "2026-04-01 00:00:00", kp_index: 1.67 },
      { time_tag: "2026-04-01 03:00:00", kp_index: 5 },
    ]);
    assert.equal(rows.length, 2);
    assert.equal(rows[1].kp_index, 5);
  });
});

describe("normalizeKpSeries", () => {
  it("reads Kp from both key styles", () => {
    const series = normalizeKpSeries([
      { time_tag: "t1", Kp: "3.00" },
      { time_tag: "t2", kp_index: 6.33 },
    ]);
    assert.deepEqual(
      series.map((s) => s.kp),
      [3, 6.33]
    );
  });
});

describe("spaceWeatherView", () => {
  it("derives G-scale from Kp and keeps a HAM narrative", () => {
    const view = spaceWeatherView(
      [{ time_tag: "now", kp_index: 5.67 }],
      { G: { Scale: "G1", Text: "Minor" } },
      { time_tag: "now", WindSpeed: 420 }
    );
    assert.equal(view.geomagneticFromKp, "G1");
    assert.equal(view.solarWind.speedKms, 420);
    assert.match(view.narrative, /BeliefSat/i);
    assert.equal(summarizeScales({ G: { Scale: "G1" } }).G.scale, "G1");
    assert.match(amateurRadioBlurb(2, "G0"), /quiet/i);
  });
});
