import { Router } from "express";
import { readFile } from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";

const router = Router();
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FILE = path.resolve(__dirname, "../../data/missions/beliefsat.json");

router.get("/beliefsat", async (_req, res, next) => {
  try {
    const raw = await readFile(FILE, "utf8");
    res.json(JSON.parse(raw));
  } catch (err) {
    next(err);
  }
});

export default router;
