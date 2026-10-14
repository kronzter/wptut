import { after, before, describe, it } from "node:test";
import assert from "node:assert/strict";
import { createApp } from "../app.js";
import { createSqlWatchlist } from "../db/sqlWatchlist.js";
import { validateEntry } from "../services/watchlistValidation.js";

describe("validateEntry", () => {
  it("requires noradId and name, defaults priority and note", () => {
    const { value, errors } = validateEntry({});
    assert.deepEqual(Object.keys(errors).sort(), ["name", "noradId"]);
    assert.equal(value.priority, "medium");
    assert.equal(value.note, "");
  });

  it("normalizes valid input", () => {
    const { value, errors } = validateEntry({
      noradId: " 025544 ",
      name: "  ISS (ZARYA) ",
      priority: "HIGH",
    });
    assert.deepEqual(errors, {});
    assert.equal(value.noradId, "25544");
    assert.equal(value.name, "ISS (ZARYA)");
    assert.equal(value.priority, "high");
  });

  it("rejects bad formats and lengths", () => {
    const { errors } = validateEntry({
      noradId: "ISS",
      name: "x",
      priority: "urgent",
      note: "n".repeat(281),
    });
    assert.deepEqual(Object.keys(errors).sort(), ["name", "noradId", "note", "priority"]);
  });

  it("allows a subset when partial, but not an empty update", () => {
    assert.deepEqual(validateEntry({ note: "ok" }, { partial: true }).errors, {});
    assert.ok(validateEntry({}, { partial: true }).errors._);
  });
});

describe("watchlist REST routes (SQL store)", () => {
  let server;
  let base;
  const store = createSqlWatchlist(":memory:");

  before(async () => {
    const app = createApp({ watchlistStores: { sql: store } });
    await new Promise((resolve) => {
      server = app.listen(0, resolve);
    });
    base = `http://127.0.0.1:${server.address().port}/api/watchlist/sql`;
  });

  after(async () => {
    server.close();
    await store.close();
  });

  const send = (method, url, body) =>
    fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: body && JSON.stringify(body),
    });

  it("runs create → read → update → delete", async () => {
    let res = await send("POST", base, { noradId: "25544", name: "ISS", priority: "high" });
    assert.equal(res.status, 201);
    const created = await res.json();
    assert.equal(created.noradId, "25544");

    res = await fetch(base);
    const listed = await res.json();
    assert.equal(listed.count, 1);
    assert.equal(listed.engine, "SQLite");

    res = await send("PUT", `${base}/${created.id}`, { note: "crew vehicle docked" });
    assert.equal(res.status, 200);
    assert.equal((await res.json()).note, "crew vehicle docked");

    res = await send("DELETE", `${base}/${created.id}`);
    assert.equal(res.status, 204);

    res = await fetch(`${base}/${created.id}`);
    assert.equal(res.status, 404);
  });

  it("returns 422 with field details for invalid input", async () => {
    const res = await send("POST", base, { noradId: "abc" });
    assert.equal(res.status, 422);
    const body = await res.json();
    assert.ok(body.details.noradId);
    assert.ok(body.details.name);
  });

  it("returns 409 for a duplicate NORAD id", async () => {
    await send("POST", base, { noradId: "48274", name: "CSS (TIANHE)" });
    const res = await send("POST", base, { noradId: "48274", name: "Tianhe again" });
    assert.equal(res.status, 409);
    assert.ok((await res.json()).details.noradId);
  });

  it("returns 404 for an unknown store", async () => {
    const res = await fetch(base.replace("/sql", "/redis"));
    assert.equal(res.status, 404);
  });
});
