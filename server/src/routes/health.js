import { Router } from "express";
import * as cache from "../cache/tleStore.js";
import { getJobStatus } from "../jobs/refreshCatalog.js";
import { hasCredentials } from "../services/spacetrack.js";
import { ll2Base } from "../services/launchLibrary.js";

const startedAt = Date.now();
const router = Router();

router.get("/", (_req, res) => {
  res.json({
    ok: true,
    service: "orbitwatch-api",
    uptimeSec: Math.round((Date.now() - startedAt) / 1000),
    spaceTrackConfigured: hasCredentials(),
    ll2: ll2Base(),
    cache: cache.stats(),
    lastCatalogJob: getJobStatus(),
  });
});

export default router;
