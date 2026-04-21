import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";

// Simple in-memory cache to avoid rate limits
const cache = {
  astronauts: { data: null, lastFetch: 0 },
  launches: { data: null, lastFetch: 0 },
};

const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Endpoint: Astronauts in Space
  app.get("/api/astronauts", async (req, res) => {
    try {
      if (Date.now() - cache.astronauts.lastFetch < CACHE_TTL && cache.astronauts.data) {
        return res.json(cache.astronauts.data);
      }
      
      const response = await fetch("http://api.open-notify.org/astros.json");
      if (!response.ok) throw new Error("Failed to fetch astronauts");
      
      const data = await response.json();
      cache.astronauts.data = data;
      cache.astronauts.lastFetch = Date.now();
      
      res.json(data);
    } catch (error) {
      console.error("Astronaut API Error:", error);
      res.status(500).json({ error: "Failed to fetch astronaut data", fallback: cache.astronauts.data });
    }
  });

  // Endpoint: Upcoming Launches
  app.get("/api/launches", async (req, res) => {
    try {
      if (Date.now() - cache.launches.lastFetch < CACHE_TTL && cache.launches.data) {
        return res.json(cache.launches.data);
      }
      
      // The Space Devs API (Launch Library 2)
      const response = await fetch("https://ll.thespacedevs.com/2.2.0/launch/upcoming/?limit=6");
      if (!response.ok) throw new Error("Failed to fetch launches");
      
      const data = await response.json();
      cache.launches.data = data;
      cache.launches.lastFetch = Date.now();
      
      res.json(data);
    } catch (error) {
      console.error("Launch API Error:", error);
      res.status(500).json({ error: "Failed to fetch launch data", fallback: cache.launches.data });
    }
  });

  // Endpoint: Satellites in Orbit (Estimates based on recent space-track/celestrak data)
  // Precise live public API without auth is limited, so we use realistic current data projections.
  app.get("/api/satellites", (req, res) => {
    // Current rough estimates (2024-2025 values)
    const activeSatellites = 10590; // Approx Active
    const inactiveSatellites = 3200; // Approx Inactive
    const spaceDebris = 21000; // Tracked debris

    res.json({
      active: activeSatellites,
      inactive: inactiveSatellites,
      debris: spaceDebris,
      total: activeSatellites + inactiveSatellites + spaceDebris,
      source: "Estimated from UCS/Celestrak",
      timestamp: Date.now()
    });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    // Use path relative to current working directory
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
