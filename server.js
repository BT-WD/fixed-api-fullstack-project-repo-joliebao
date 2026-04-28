import express from "express";
import fetch from "node-fetch";
import dotenv from "dotenv";
import path from "path";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Serve frontend files
app.use(express.static(path.join(process.cwd())));

// Simple service alert route
app.get("/status/:line", async (req, res) => {
  const line = req.params.line.toUpperCase();

  try {
    const response = await fetch("https://api.mta.info/serviceAlerts", {
      headers: { "x-api-key": process.env.MTA_API_KEY }
    });

    const data = await response.json();

    // Filter alerts for the requested line
    const alerts = data.alerts.filter(alert =>
      alert.informedEntity?.some(e => e.routeId === line)
    );

    // Format alerts for your frontend
    const formatted = alerts.map(a => ({
      title: a.headerText?.translation?.[0]?.text || "Service Alert",
      description: a.descriptionText?.translation?.[0]?.text || "No description available."
    }));

    res.json(formatted);

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Could not load service alerts" });
  }
});

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
