import express from "express";
import cors from "cors";
import morgan from "morgan";
import rateLimit from "express-rate-limit";
import health from "./routes/health.js";
import catalog from "./routes/catalog.js";
import debris from "./routes/debris.js";
import spaceWeather from "./routes/spaceWeather.js";
import launches from "./routes/launches.js";
import missions from "./routes/missions.js";
import { createWatchlistRouter } from "./routes/watchlist.js";

/**
 * @param {{ watchlistStores?: Record<string, object> }} [opts]
 */
export function createApp(opts = {}) {
  const app = express();
  app.disable("x-powered-by");
  app.use(cors());
  app.use(express.json());
  app.use(morgan(process.env.NODE_ENV === "production" ? "combined" : "dev"));
  app.use(
    "/api",
    rateLimit({
      windowMs: 60 * 1000,
      max: 120,
      standardHeaders: true,
      legacyHeaders: false,
    })
  );

  app.use("/api/health", health);
  app.use("/api/catalog", catalog);
  app.use("/api/debris", debris);
  app.use("/api/space-weather", spaceWeather);
  app.use("/api/launches", launches);
  app.use("/api/missions", missions);
  if (opts.watchlistStores) {
    app.use("/api/watchlist", createWatchlistRouter(opts.watchlistStores));
  }

  app.use((req, res) => {
    res.status(404).json({ error: "Not found", path: req.path });
  });

  app.use((err, _req, res, _next) => {
    const status = err.status || 500;
    if (status >= 500) console.error(err);
    res.status(status).json({
      error: err.message || "Internal error",
      ...(err.details && { details: err.details }),
      ...(err.field && { details: { [err.field]: err.message } }),
    });
  });

  return app;
}
