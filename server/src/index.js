import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
import { createApp } from "./app.js";
import { ensureCacheDir } from "./cache/tleStore.js";
import { startCatalogJobs } from "./jobs/refreshCatalog.js";
import { createSqlWatchlist } from "./db/sqlWatchlist.js";
import { createMongoWatchlist } from "./db/mongoWatchlist.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, "../.env") });
dotenv.config({ path: path.resolve(__dirname, "../../.env") });

const port = Number(process.env.PORT) || 3001;

await ensureCacheDir();
const watchlistStores = { sql: createSqlWatchlist(), nosql: createMongoWatchlist() };
watchlistStores.nosql.warm();
const app = createApp({ watchlistStores });
startCatalogJobs();

app.listen(port, () => {
  console.log(`OrbitWatch API listening on http://localhost:${port}`);
});

for (const signal of ["SIGINT", "SIGTERM"]) {
  process.once(signal, async () => {
    await Promise.allSettled(Object.values(watchlistStores).map((s) => s.close()));
    process.exit(0);
  });
}
