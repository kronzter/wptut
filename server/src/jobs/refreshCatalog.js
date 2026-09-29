import cron from "node-cron";
import { getGroupObjects, refreshCelestrakGroups, refreshDebris } from "../services/catalog.js";

let lastRun = null;

export function getJobStatus() {
  return lastRun;
}

export function startCatalogJobs() {
  cron.schedule("20 */6 * * *", async () => {
    console.log("[cron] refreshing CelesTrak groups");
    const celestrak = await refreshCelestrakGroups();
    lastRun = { at: new Date().toISOString(), celestrak, debris: lastRun?.debris || null };
  });

  cron.schedule("50 3 * * *", async () => {
    console.log("[cron] refreshing Space-Track debris sample");
    const debris = await refreshDebris();
    lastRun = { at: new Date().toISOString(), celestrak: lastRun?.celestrak || null, debris };
  });

  setTimeout(async () => {
    try {
      console.log("[cron] warm CelesTrak stations");
      await getGroupObjects("stations", 80);
    } catch (err) {
      console.warn("[cron] warm-up failed:", err.message);
    }
  }, 2500);
}
