import { Router } from "express";
import * as cache from "../cache/tleStore.js";
import { fetchSpaceWeather } from "../services/noaa.js";

const router = Router();
const NOAA_TTL = () => Number(process.env.NOAA_TTL_MS) || 10 * 60 * 1000;

router.get("/current", async (_req, res, next) => {
  try {
    const key = "noaa:space-weather";
    const hit = await cache.get(key);
    if (hit) {
      return res.json({ ...hit.data, stale: hit.stale, cache: hit.source });
    }
    const data = await fetchSpaceWeather();
    await cache.set(key, data, NOAA_TTL());
    res.json({ ...data, stale: false, cache: "network" });
  } catch (err) {
    const stale = await cache.get("noaa:space-weather", { allowStale: true });
    if (stale) {
      return res.json({ ...stale.data, stale: true, cache: "stale", warning: err.message });
    }
    next(err);
  }
});

export default router;
