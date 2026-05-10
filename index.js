// MTA Subway Line Colors
const MTA_LINE_COLORS = {
  // Red lines
  '1': '#EE352E', '2': '#EE352E', '3': '#EE352E',
  // Green lines
  '4': '#009952', '5': '#00933C', '6': '#00933C',
  // Purple line
  '7': '#B933AD',
  // Blue lines
  'A': '#0039A6', 'C': '#0039A6', 'E': '#0039A6',
  // Orange lines
  'B': '#FF6319', 'D': '#FF6319', 'F': '#FF6319', 'M': '#FF6319',
  // Light Green line
  'G': '#799534',
  // Yellow/Cream lines
  'N': '#FCCC0A', 'Q': '#FCCC0A', 'R': '#FCCC0A', 'W': '#FCCC0A',
  // Brown lines
  'J': '#996633', 'Z': '#996633',
  // Gray lines
  'L': '#7C858C',
  'S': '#808183'
};

const ORS_API_KEY = 'eyJvcmciOiI1YjNjZTM1OTc4NTExMTAwMDFjZjYyNDgiLCJpZCI6ImQwZDIzMDU2ZjU2OTRlMWZhOThiNDk1MGYyODFlNmU5IiwiaCI6Im11cm11cjY0In0=';

function getLineColor(line) {
  const normalized = line.trim().toUpperCase();
  return MTA_LINE_COLORS[normalized] || '#7221a1'; // Default purple
}

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
}

function escapeHtml(str) {
  const p = document.createElement('p');
  p.textContent = str;
  return p.innerHTML;
}

function stripHtml(html) {
  const div = document.createElement('div');
  div.innerHTML = html || '';
  return div.textContent || div.innerText || '';
}

async function geocodeLocation(query) {
  const url = new URL('https://api.openrouteservice.org/geocode/search');
  url.searchParams.set('api_key', ORS_API_KEY);
  url.searchParams.set('text', query);
  url.searchParams.set('size', '1');

  console.log('Geocoding:', query);
  
  const response = await fetch(url);
  if (!response.ok) {
    const body = await response.text().catch(() => '');
    throw new Error(`Geocoding failed (${response.status}) ${body}`);
  }

  const data = await response.json();
  console.log('Geocode response:', data);
  
  const feature = data.features?.[0];
  if (!feature || !feature.geometry?.coordinates) {
    throw new Error(`Location not found: ${query}`);
  }

  const coords = feature.geometry.coordinates;
  console.log('Geocoded coordinates:', coords);
  
  return coords;
}

async function getTransitRoute(origin, destination) {
  const originCoords = await geocodeLocation(origin);
  const destinationCoords = await geocodeLocation(destination);

  console.log('Origin coords:', originCoords);
  console.log('Destination coords:', destinationCoords);

  // ORS expects [lon, lat] format - geocodeLocation returns [lon, lat]
  const coordinates = [originCoords, destinationCoords];

  const response = await fetch('https://api.openrouteservice.org/v2/directions/driving-car', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': ORS_API_KEY,
    },
    body: JSON.stringify({
      coordinates: coordinates,
      instructions: true,
      geometry: false,
    }),
  });

  const responseText = await response.text();
  console.log('ORS Directions response status:', response.status);
  console.log('ORS Directions response:', responseText);

  if (!response.ok) {
    throw new Error(`Directions failed (${response.status}) ${responseText}`);
  }

  const data = JSON.parse(responseText);
  console.log('Parsed data:', data);
  console.log('Parsed data routes:', data.routes);
  
  if (!data.routes?.length) {
    // Log more details about the response
    console.log('Full ORS response:', data);
    // Check for ORS error in response
    const errorMsg = data.error || data.error_message || data.message || JSON.stringify(data);
    throw new Error(`No route found - ORS response: ${errorMsg}`);
  }

  // ORS v2 returns routes[].segments[].steps[]
  const route = data.routes[0];
  return {
    properties: {
      summary: route.summary,
      segments: route.segments
    }
  };
}

function formatDistance(meters) {
  if (meters >= 1000) {
    return `${(meters / 1000).toFixed(1)} km`;
  }
  return `${Math.round(meters)} m`;
}

function formatDuration(seconds) {
  const mins = Math.round(seconds / 60);
  if (mins < 60) return `${mins} min`;
  const hours = Math.floor(mins / 60);
  const remainder = mins % 60;
  return `${hours}h ${remainder}m`;
}

function renderTransitRoute(route, origin, destination) {
  const routeResults = document.getElementById('routeResults');
  if (!routeResults) return;

  const summary = route.properties?.summary || {};
  const steps = route.properties?.segments?.[0]?.steps || [];
  const stepsHtml = steps.map(step => {
    const instruction = escapeHtml(step.instruction || '');
    const distance = formatDistance(step.distance || 0);
    const duration = formatDuration(step.duration || 0);
    return `<li>${instruction} <span class="step-distance">${distance}</span> <span class="step-duration">${duration}</span></li>`;
  }).join('');

  routeResults.innerHTML = `
    <strong>Route from ${escapeHtml(origin)} to ${escapeHtml(destination)}</strong>
    <p>${formatDuration(summary.duration || 0)} · ${formatDistance(summary.distance || 0)}</p>
    <ol>${stepsHtml}</ol>
  `;
}

// --- STATUS TAB FUNCTIONALITY ---
document.addEventListener("DOMContentLoaded", () => {
  // Attach transit form listener
  const transitForm = document.getElementById('searchBar');
  const routeResults = document.getElementById('routeResults');
  const statusSearchForm = document.getElementById("searchBar2");
  const resultsBox = document.getElementById("results");

  if (transitForm && routeResults) {
    transitForm.addEventListener('submit', async (e) => {
      e.preventDefault();

      const origin = e.target.elements.current.value.trim();
      const destination = e.target.elements.destination.value.trim();
      if (!origin || !destination) {
        routeResults.innerHTML = '<p>Please enter both origin and destination.</p>';
        return;
      }

      routeResults.innerHTML = '<p>Loading route...</p>';
      try {
        const route = await getTransitRoute(origin, destination);
        renderTransitRoute(route, origin, destination);
      } catch (err) {
        console.error(err);
        routeResults.innerHTML = `<p>Error loading route: ${escapeHtml(err.message)}</p>`;
      }
    });
  }

  // Attach status form listener
  const searchForm = statusSearchForm;
  if (!searchForm || !resultsBox) return;

  searchForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const line = e.target.elements.current.value.trim();
    if (!line) {
      resultsBox.textContent = "Please enter a train line.";
      document.getElementById("trainIcon").classList.add("hidden");
      return;
    }

    // Update train icon
    const trainIcon = document.getElementById("trainIcon");
    const trainBadge = trainIcon.querySelector(".train-badge");
    const color = getLineColor(line);
    const displayLine = line.toUpperCase();

    trainBadge.style.backgroundColor = color;
    trainBadge.textContent = displayLine;
    
    // Set text color to black for yellow/cream lines (N, Q, R, W)
    const yellowLines = ['N', 'Q', 'R', 'W'];
    if (yellowLines.includes(displayLine)) {
      trainBadge.style.color = 'black';
    } else {
      trainBadge.style.color = 'white';
    }
    
    trainIcon.classList.remove("hidden");

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
