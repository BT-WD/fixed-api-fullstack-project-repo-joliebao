import express from "express";
import fetch from "node-fetch";

const app = express();
const PORT = 3000;

app.use(express.static("public"));

app.get("/status/:line", async (req, res) => {
  const line = req.params.line.toUpperCase();

  try {
    const response = await fetch("https://api-endpoint.mta.info/Dataservice/mtagtfsfeeds/camsys%2Fsubway-alerts.json");
    // read as text first so we can detect non-JSON responses (some endpoints may return XML/HTML)
    const text = await response.text();

    // Try to parse JSON; if it's XML/HTML, return a clear 502 error
    let data;
    try {
      data = JSON.parse(text);
    } catch (e) {
      const contentType = response.headers.get("content-type") || "";
      if (contentType.includes("xml") || text.trim().startsWith("<")) {
        console.error("MTA feed returned non-JSON response (preview):", text.slice(0, 200));
        return res.status(502).json({ error: "MTA feed returned non-JSON response" });
      }
      console.error("Failed to parse JSON from MTA feed:", e);
      return res.status(502).json({ error: "Failed to parse JSON from MTA feed" });
    }

    console.log(data);

    const alerts = data?.entity || [];

    // Build an array of user-friendly header text strings
    const headerTexts = alerts.flatMap(alert => {
      const translations = alert?.alert?.header_text?.translation || [];
      // Prefer plain English text without HTML
      let candidate = translations.find(t => t.language === "en" && !/<[a-z][\s\S]*>/i.test(t.text));
      if (!candidate) candidate = translations.find(t => t.language === "en");
      if (!candidate) candidate = translations[0];
      const raw = candidate?.text || "";
      // Strip any HTML tags to return a normal version
      const cleaned = raw.replace(/<[^>]*>/g, "").trim();
      return cleaned ? [cleaned] : [];
    });

    // Remove duplicates and return as an array
    const unique = [...new Set(headerTexts)];

    res.json(unique);

  } catch (err) {
    console.error("Server error:", err);
    res.status(500).json({ error: "Failed to fetch alerts" });
  }
});

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
