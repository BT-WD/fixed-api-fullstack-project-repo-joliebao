import cheerio from "cheerio";

app.get("/status/:line", async (req, res) => {
  const line = req.params.line.toUpperCase();

  try {
    const html = await fetch("https://new.mta.info/alerts/subway").then(r => r.text());
    const $ = cheerio.load(html);

    const alerts = [];

    $(".mta-alert").each((i, el) => {
      const title = $(el).find(".mta-alert__title").text().trim();
      const description = $(el).find(".mta-alert__body").text().trim();
      const routes = $(el).find(".mta-alert__lines").text().toUpperCase();

      if (routes.includes(line)) {
        alerts.push({ title, description });
      }
    });

    res.json(alerts);

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Could not load service alerts" });
  }
});
