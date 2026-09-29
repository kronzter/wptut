import { Router } from "express";
import * as cache from "../cache/tleStore.js";
import { fetchUpcomingLaunches } from "../services/launchLibrary.js";

const router = Router();
const LL2_TTL = () => Number(process.env.LL2_TTL_MS) || 30 * 60 * 1000;

router.get("/upcoming", async (req, res, next) => {
  try {
    const limit = req.query.limit ? Number(req.query.limit) : 10;
    const key = `ll2:upcoming:${limit}`;
    const hit = await cache.get(key);
    if (hit) {
      return res.json({ ...hit.data, stale: hit.stale, cache: hit.source });
    }
    const data = await fetchUpcomingLaunches(limit);
    await cache.set(key, data, LL2_TTL());
    res.json({ ...data, stale: false, cache: "network" });
  } catch (err) {
    const stale = await cache.get(`ll2:upcoming:${req.query.limit || 10}`, { allowStale: true });
    if (stale) {
      return res.json({ ...stale.data, stale: true, cache: "stale", warning: err.message });
    }
    next(err);
  }
});

export default router;
