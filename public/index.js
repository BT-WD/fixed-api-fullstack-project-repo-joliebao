function switchTabs(tabName) {
  const tabs = document.querySelectorAll("#UIBar .tab");
  const panels = document.querySelectorAll(".panel");

  tabs.forEach(t => t.classList.remove("active"));
  panels.forEach(p => p.style.display = "none");

  document.querySelector(`#UIBar .tab[data-tab="${tabName}"]`).classList.add("active");
  document.getElementById(tabName).style.display = "block";
}


async function getStatusForLine(line) {
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

    return unique;

  } catch (err) {
    console.error("Server error:", err);
  }
  // try {
  //   // Ensure the client calls the Node server running on port 3000
  //   const host = window.location.hostname || 'localhost';
  //   const url = `${window.location.protocol}//${host}:3000/status/${encodeURIComponent(line)}`;

  //   const res = await fetch(url);
  //   if (!res.ok) {
  //     // log status and any server message to help debugging
  //     const body = await res.text().catch(() => '');
  //     console.error("Status fetch failed", res.status, body);
  //     return null;
  //   }

  //   const data = await res.json();
  //   if (!Array.isArray(data) || data.length === 0) return [];

  //   return data; // array of user-friendly strings
  // } catch (err) {
  //   console.error("Fetch error:", err);
  //   return null;
  // }
}

function escapeHtml(str) {
  const p = document.createElement('p');
  p.textContent = str;
  return p.innerHTML;
}

// --- STATUS TAB FUNCTIONALITY ---
document.addEventListener("DOMContentLoaded", () => {
  // Attach status form listener
  const searchForm = document.getElementById("searchBar2");
  const resultsBox = document.getElementById("results");

  if (!searchForm || !resultsBox) return;

  searchForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const line = e.target.elements.current.value.trim();
    if (!line) {
      resultsBox.textContent = "Please enter a train line.";
      return;
    }

    resultsBox.textContent = "Loading…";

    const statuses = await getStatusForLine(line);

    if (statuses === null) {
      resultsBox.textContent = `Error fetching service info for line ${line.toUpperCase()}.`;
      return;
    }

    if (!Array.isArray(statuses) || statuses.length === 0) {
      resultsBox.textContent = `No service info found for line ${line.toUpperCase()}.`;
      return;
    }

    // Build a regex to match the line in common formats: standalone number/letter or [N] bracketed
    function escapeRegex(s) {
      return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }
    const pattern = new RegExp(`\\b${escapeRegex(line)}\\b|\\[${escapeRegex(line)}\\]`, 'i');

    // Filter statuses to those that reference the requested line
    const filtered = statuses.filter(s => pattern.test(s));

    if (filtered.length === 0) {
      resultsBox.textContent = `No service alerts mentioning ${line.toUpperCase()} were found.`;
      return;
    }

    // Render each status as a safe list item
    const items = filtered.map(s => `<li>${escapeHtml(s)}</li>`).join('');

    resultsBox.innerHTML = `
      <strong>Service alerts for ${escapeHtml(line.toUpperCase())}:</strong>
      <ul>${items}</ul>
    `;
  });
});
