import express from "express";
import fetch from "node-fetch";
import dotenv from "dotenv";
import GtfsRealtimeBindings from "gtfs-realtime-bindings";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;
const MTA_API_KEY = process.env.MTA_API_KEY;

if (!MTA_API_KEY) {
  console.error("Missing MTA_API_KEY in .env");
  process.exit(1);
}

// Map a line to its GTFS feed URL
function getFeedUrlForLine(line) {
  const l = line.toUpperCase();

  if ("ACE".includes(l)) return "https://api-endpoint.mta.info/Dataservice/mtagtfsfeeds/nyct%2Fgtfs-ace";
  if ("BDFM".includes(l)) return "https://api-endpoint.mta.info/Dataservice/mtagtfsfeeds/nyct%2Fgtfs-bdfm";
  if ("G".includes(l))   return "https://api-endpoint.mta.info/Dataservice/mtagtfsfeeds/nyct%2Fgtfs-g";
  if ("JZ".includes(l))  return "https://api-endpoint.mta.info/Dataservice/mtagtfsfeeds/nyct%2Fgtfs-jz";
  if ("NQRW".includes(l))return "https://api-endpoint.mta.info/Dataservice/mtagtfsfeeds/nyct%2Fgtfs-nqrw";
  if ("L".includes(l))   return "https://api-endpoint.mta.info/Dataservice/mtagtfsfeeds/nyct%2Fgtfs-l";
  if ("SIR".includes(l)) return "https://api-endpoint.mta.info/Dataservice/mtagtfsfeeds/nyct%2Fgtfs-si";

  // default: main feed (1/2/3/4/5/6/7, etc.)
  return "https://api-endpoint.mta.info/Dataservice/mtagtfsfeeds/nyct%2Fgtfs";
}

// Simple cleaner: pull out trips for this line
function filterTripsByLine(feed, line) {
  const l = line.toUpperCase();
  const trips = [];

  feed.entity.forEach(entity => {
    if (!entity.tripUpdate) return;

    const routeId = entity.tripUpdate.trip.routeId;
    if (routeId && routeId.toUpperCase() === l) {
      trips.push({
        tripId: entity.tripUpdate.trip.tripId,
        routeId,
        stopTimeUpdates: entity.tripUpdate.stopTimeUpdate.map(s => ({
          stopId: s.stopId,
          arrival: s.arrival?.time,
          departure: s.departure?.time
        }))
      });
    }
  });

  return trips;
}

// GET /status/:line → JSON for that line
app.get("/status/:line", async (req, res) => {
  try {
    const line = req.params.line;
    const feedUrl = getFeedUrlForLine(line);

    const response = await fetch(feedUrl, {
      headers: { "x-api-key": MTA_API_KEY }
    });

    if (!response.ok) {
      return res.status(500).json({ error: "Failed to fetch MTA feed" });
    }

    const buffer = await response.arrayBuffer();
    const feed = GtfsRealtimeBindings.transit_realtime.FeedMessage.decode(
      new Uint8Array(buffer)
    );

    const trips = filterTripsByLine(feed, line);

    res.json({
      line: line.toUpperCase(),
      trips
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});

app.get("/status/:line", async (req, res) => {
  try {
    const line = req.params.line.toUpperCase();
    const feedUrl = getFeedUrlForLine(line);

    const response = await fetch(feedUrl, {
      headers: { "x-api-key": process.env.MTA_API_KEY }
    });

    const buffer = await response.arrayBuffer();
    const feed = GtfsRealtimeBindings.transit_realtime.FeedMessage.decode(
      new Uint8Array(buffer)
    );

    res.json(feed); // raw feed for now
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch MTA data" });
  }
});

