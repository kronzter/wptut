import { Router } from "express";
import { getGroupObjects, getObject, listGroups } from "../services/catalog.js";

const router = Router();

router.get("/groups", (_req, res) => {
  res.json(listGroups());
});

router.get("/objects", async (req, res, next) => {
  try {
    const group = req.query.group || "stations";
    const limit = req.query.limit ? Number(req.query.limit) : undefined;
    const payload = await getGroupObjects(group, limit);
    res.json(payload);
  } catch (err) {
    next(err);
  }
});

router.get("/object/:noradId", async (req, res, next) => {
  try {
    const payload = await getObject(req.params.noradId);
    res.json(payload);
  } catch (err) {
    next(err);
  }
});

export default router;
