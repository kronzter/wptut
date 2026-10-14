import { Router } from "express";
import { validateEntry } from "../services/watchlistValidation.js";

function invalid(errors) {
  const err = new Error("Validation failed");
  err.status = 422;
  err.details = errors;
  return err;
}

function notFound(id) {
  const err = new Error(`Watchlist entry ${id} not found`);
  err.status = 404;
  return err;
}

/**
 * CRUD routes for the watchlist, backed by either store:
 *   /api/watchlist/sql/...   → SQLite
 *   /api/watchlist/nosql/... → MongoDB
 * @param {Record<string, ReturnType<import("../db/sqlWatchlist.js").createSqlWatchlist>>} stores
 */
export function createWatchlistRouter(stores) {
  const router = Router();

  router.get("/", (_req, res) => {
    res.json({
      stores: Object.values(stores).map((s) => ({ kind: s.kind, engine: s.engine })),
    });
  });

  // Resolve :store once for every route that uses it.
  router.param("store", (req, _res, next, store) => {
    req.store = stores[store];
    if (!req.store) {
      const err = new Error(`Unknown store "${store}" (use ${Object.keys(stores).join(" or ")})`);
      err.status = 404;
      return next(err);
    }
    next();
  });

  router
    .route("/:store")
    .get(async (req, res, next) => {
      try {
        const entries = await req.store.list();
        res.json({ store: req.store.kind, engine: req.store.engine, count: entries.length, entries });
      } catch (err) {
        next(err);
      }
    })
    .post(async (req, res, next) => {
      try {
        const { value, errors } = validateEntry(req.body);
        if (Object.keys(errors).length) throw invalid(errors);
        const entry = await req.store.create(value);
        res.status(201).location(`${req.baseUrl}/${req.params.store}/${entry.id}`).json(entry);
      } catch (err) {
        next(err);
      }
    });

  router
    .route("/:store/:id")
    .get(async (req, res, next) => {
      try {
        const entry = await req.store.get(req.params.id);
        if (!entry) throw notFound(req.params.id);
        res.json(entry);
      } catch (err) {
        next(err);
      }
    })
    .put(async (req, res, next) => {
      try {
        const { value, errors } = validateEntry(req.body, { partial: true });
        if (Object.keys(errors).length) throw invalid(errors);
        const entry = await req.store.update(req.params.id, value);
        if (!entry) throw notFound(req.params.id);
        res.json(entry);
      } catch (err) {
        next(err);
      }
    })
    .delete(async (req, res, next) => {
      try {
        const removed = await req.store.remove(req.params.id);
        if (!removed) throw notFound(req.params.id);
        res.status(204).end();
      } catch (err) {
        next(err);
      }
    });

  return router;
}
