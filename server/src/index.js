import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
import { createApp } from "./app.js";
import { ensureCacheDir } from "./cache/tleStore.js";
import { startCatalogJobs } from "./jobs/refreshCatalog.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, "../.env") });
dotenv.config({ path: path.resolve(__dirname, "../../.env") });

const port = Number(process.env.PORT) || 3001;

await ensureCacheDir();
const app = createApp();
startCatalogJobs();

app.listen(port, () => {
  console.log(`OrbitWatch API listening on http://localhost:${port}`);
});
