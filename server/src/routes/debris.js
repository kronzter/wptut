import { Router } from "express";
import { getDebrisSample } from "../services/catalog.js";

const router = Router();

router.get("/sample", async (req, res, next) => {
  try {
    const limit = req.query.limit ? Number(req.query.limit) : 1500;
    const payload = await getDebrisSample(limit);
    res.json(payload);
  } catch (err) {
    next(err);
  }
});

export default router;
