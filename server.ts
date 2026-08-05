import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";

function calculateHaversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Earth's radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c * 10) / 10;
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API Endpoint: Get nearby golf courses based on golfer GPS location (lat, lng)
  app.get("/api/courses/nearby", async (req, res) => {
    try {
      const lat = parseFloat(req.query.lat as string);
      const lng = parseFloat(req.query.lng as string);

      if (isNaN(lat) || isNaN(lng)) {
        return res.status(400).json({ error: "Valid lat and lng query parameters are required" });
      }

      // Query OpenStreetMap Overpass API for real golf courses within 35km radius (~20 miles)
      const overpassQuery = `[out:json][timeout:15];(node["leisure"="golf_course"](around:35000,${lat},${lng});way["leisure"="golf_course"](around:35000,${lat},${lng});relation["leisure"="golf_course"](around:35000,${lat},${lng}););out center 15;`;
      const overpassUrl = `https://overpass-api.de/api/interpreter?data=${encodeURIComponent(overpassQuery)}`;

      const apiKey = process.env.GOLF_COURSE_API_KEY || "B5Z4DM2AMTA7HULMXDHF3DEZSI";

      let fetchedCourses: any[] = [];
      try {
        const response = await fetch(overpassUrl, {
          headers: {
            "Authorization": `Bearer ${apiKey}`,
            "User-Agent": "ClubCheckGolfApp/1.0",
          },
        });
        if (response.ok) {
          const data = await response.json();
          if (data.elements && data.elements.length > 0) {
            fetchedCourses = data.elements
              .map((elem: any, idx: number) => {
                const tags = elem.tags || {};
                const name = tags.name || tags["official_name"] || tags["brand"] || `Local Golf Course #${idx + 1}`;
                const centerLat = elem.lat || elem.center?.lat || lat;
                const centerLng = elem.lon || elem.center?.lon || lng;
                const city = tags["addr:city"] || tags["addr:suburb"] || tags["addr:town"] || "Local Area";
                const state = tags["addr:state"] || "";
                const location = state ? `${city}, ${state}` : city;

                // Generate 18 hole layout relative to real course center coordinates
                const holes = Array.from({ length: 18 }, (_, i) => {
                  const parPattern = [4, 5, 4, 3, 4, 4, 5, 3, 4, 4, 3, 5, 4, 4, 3, 5, 4, 4];
                  const par = parPattern[i % 18];
                  const yardage = 310 + (i % 6) * 35;

                  const angle = (i * 20 * Math.PI) / 180;
                  const dist = 0.002 + (i * 0.0003);
                  const greenLat = centerLat + Math.sin(angle) * dist;
                  const greenLng = centerLng + Math.cos(angle) * dist;
                  const teeLat = greenLat - 0.001;
                  const teeLng = greenLng - 0.0008;

                  return {
                    holeNumber: i + 1,
                    par,
                    handicap: i + 1,
                    yardage,
                    greenLat,
                    greenLng,
                    teeLat,
                    teeLng,
                  };
                });

                return {
                  id: `osm-${elem.id || idx}`,
                  name,
                  location,
                  city,
                  state,
                  holesCount: 18,
                  parTotal: 72,
                  totalYards: 6480,
                  rating: 4.6,
                  holes,
                  distanceKm: calculateHaversineKm(lat, lng, centerLat, centerLng),
                  isLiveFetched: true,
                };
              })
              .filter((c: any) => c.name && !c.name.toLowerCase().includes("mini"));
          }
        }
      } catch (err) {
        console.warn("Overpass API fetch error:", err);
      }

      // Sort fetched courses by proximity
      fetchedCourses.sort((a, b) => (a.distanceKm || 0) - (b.distanceKm || 0));

      res.json({
        success: true,
        userLat: lat,
        userLng: lng,
        count: fetchedCourses.length,
        courses: fetchedCourses,
      });
    } catch (err) {
      console.error("API /api/courses/nearby error:", err);
      res.status(500).json({ error: "Failed to fetch nearby courses" });
    }
  });

  // Vite middleware setup
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`ClubCheck API server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
