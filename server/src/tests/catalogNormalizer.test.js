import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  applyLimit,
  normalizeGpList,
  normalizeGpRecord,
  orbitalApprox,
} from "../services/catalogNormalizer.js";

const sample = {
  OBJECT_NAME: "ISS (ZARYA)",
  NORAD_CAT_ID: "25544",
  OBJECT_ID: "1998-067A",
  EPOCH: "2026-04-01T12:00:00",
  MEAN_MOTION: 15.5,
  ECCENTRICITY: 0.0005,
  INCLINATION: 51.64,
  TLE_LINE1:
    "1 25544U 98067A   26091.50000000  .00016717  00000-0  10270-3 0  9993",
  TLE_LINE2:
    "2 25544  51.6400  20.0000 0005000  30.0000  80.0000 15.50000000499999",
};

describe("normalizeGpRecord", () => {
  it("builds a SatelliteRecord with tags and orbital approx", () => {
    const rec = normalizeGpRecord(sample, "celestrak", ["station"]);
    assert.equal(rec.noradId, "25544");
    assert.equal(rec.name, "ISS (ZARYA)");
    assert.equal(rec.source, "celestrak");
    assert.deepEqual(rec.tags, ["station"]);
    assert.ok(rec.periodMin > 90 && rec.periodMin < 100);
    assert.ok(rec.perigeeKm > 300);
    assert.equal(rec.tle.line1.startsWith("1 "), true);
  });

  it("synthesizes TLE lines from OMM-only CelesTrak JSON", () => {
    const ommOnly = {
      OBJECT_NAME: "ISS (ZARYA)",
      OBJECT_ID: "1998-067A",
      EPOCH: "2026-09-29T02:38:28.580928",
      MEAN_MOTION: 15.48685648,
      ECCENTRICITY: 0.0007123,
      INCLINATION: 51.6312,
      RA_OF_ASC_NODE: 145.7721,
      ARG_OF_PERICENTER: 200.7262,
      MEAN_ANOMALY: 159.3438,
      EPHEMERIS_TYPE: 0,
      CLASSIFICATION_TYPE: "U",
      NORAD_CAT_ID: 25544,
      ELEMENT_SET_NO: 999,
      REV_AT_EPOCH: 58786,
      BSTAR: 0.00009179,
      MEAN_MOTION_DOT: 0.00004557,
      MEAN_MOTION_DDOT: 0,
    };
    const rec = normalizeGpRecord(ommOnly, "celestrak", ["station"]);
    assert.equal(rec.noradId, "25544");
    assert.equal(rec.tle.line1.length, 69);
    assert.equal(rec.tle.line2.length, 69);
    assert.match(rec.tle.line1, /^1 25544U/);
    assert.match(rec.tle.line2, /^2 25544/);
  });

  it("propagates ISS from synthesized OMM into LEO", async () => {
    const { twoline2satrec, propagate } = await import("satellite.js");
    const rec = normalizeGpRecord(
      {
        OBJECT_NAME: "ISS (ZARYA)",
        OBJECT_ID: "1998-067A",
        EPOCH: "2026-09-29T02:38:28.580928",
        MEAN_MOTION: 15.48685648,
        ECCENTRICITY: 0.0007123,
        INCLINATION: 51.6312,
        RA_OF_ASC_NODE: 145.7721,
        ARG_OF_PERICENTER: 200.7262,
        MEAN_ANOMALY: 159.3438,
        CLASSIFICATION_TYPE: "U",
        NORAD_CAT_ID: 25544,
        ELEMENT_SET_NO: 999,
        REV_AT_EPOCH: 58786,
        BSTAR: 0.00009179,
        MEAN_MOTION_DOT: 0.00004557,
        MEAN_MOTION_DDOT: 0,
      },
      "celestrak",
      ["station"]
    );
    const satrec = twoline2satrec(rec.tle.line1, rec.tle.line2);
    const pv = propagate(satrec, new Date(rec.epoch + "Z"));
    const r = Math.hypot(pv.position.x, pv.position.y, pv.position.z);
    assert.ok(r > 6600 && r < 6900, `expected LEO radius, got ${r} km`);
  });

  it("drops records without TLE or OMM elements", () => {
    assert.equal(normalizeGpRecord({ NORAD_CAT_ID: "1" }, "celestrak"), null);
  });
});

describe("normalizeGpList", () => {
  it("dedupes by norad id", () => {
    const list = normalizeGpList([sample, sample], "celestrak", ["station"]);
    assert.equal(list.length, 1);
  });
});

describe("helpers", () => {
  it("applyLimit slices", () => {
    assert.equal(applyLimit([1, 2, 3, 4], 2).length, 2);
  });
  it("orbitalApprox handles bad mean motion", () => {
    assert.equal(orbitalApprox(0, 0).periodMin, null);
  });
});
