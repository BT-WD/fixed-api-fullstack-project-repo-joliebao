// import dotenv from "dotenv";
// dotenv.config();

function switchTabs(tabName) {
  const tabs = document.querySelectorAll("#UIBar .tab");
  const panels = document.querySelectorAll(".panel");

  tabs.forEach(t => t.classList.remove("active"));
  panels.forEach(p => p.style.display = "none");

  document.querySelector(`#UIBar .tab[data-tab="${tabName}"]`).classList.add("active");
  document.getElementById(tabName).style.display = "block";
}


function getFeedUrlForLine(line) {
  const l = line.toUpperCase();

  if ("ACE".includes(l))
    return "https://api-endpoint.mta.info/Dataservice/mtagtfsfeeds/nyct%2Fgtfs-ace";

  if ("BDFM".includes(l))
    return "https://api-endpoint.mta.info/Dataservice/mtagtfsfeeds/nyct%2Fgtfs-bdfm";

  if ("G".includes(l))
    return "https://api-endpoint.mta.info/Dataservice/mtagtfsfeeds/nyct%2Fgtfs-g";

  if ("JZ".includes(l))
    return "https://api-endpoint.mta.info/Dataservice/mtagtfsfeeds/nyct%2Fgtfs-jz";

  if ("NQRW".includes(l))
    return "https://api-endpoint.mta.info/Dataservice/mtagtfsfeeds/nyct%2Fgtfs-nqrw";

  if ("L".includes(l))
    return "https://api-endpoint.mta.info/Dataservice/mtagtfsfeeds/nyct%2Fgtfs-l";

  if ("SIR".includes(l))
    return "https://api-endpoint.mta.info/Dataservice/mtagtfsfeeds/nyct%2Fgtfs-si";

  // Default feed for 1/2/3/4/5/6/7/S
  return "https://api-endpoint.mta.info/Dataservice/mtagtfsfeeds/nyct%2Fgtfs";
}

async function getStatusForLine(line) {
  const res = await fetch(`/status/${line}`);
  const data = await res.json();

  if (!Array.isArray(data) || data.length === 0) {
    return null;
  }

  return data[0]; // first alert
}

// --- STATUS TAB FUNCTIONALITY ---

document.addEventListener("DOMContentLoaded", () => {
    switchTabs();

    // Ensure one tab/panel is visible on load (activate first tab if none active)
    const activeTab = document.querySelector("#UIBar .tab.active") || document.querySelector("#UIBar .tab");
    if (activeTab) activeTab.click();

    // Attach status form listener now that DOM exists
    const searchForm = document.getElementById("searchBar2");
    const resultsBox = document.getElementById("results");

    if (!searchForm) {
      console.warn("searchBar2 not found; status form listener not attached.");
      return;
    }
    if (!resultsBox) {
      console.warn("results element not found; status results will not be shown.");
    }

    searchForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const line = e.target.current.value.trim();
    if (!line) {
      resultsBox.textContent = "Please enter a train line.";
      return;
    }

    resultsBox.textContent = "Loading…";

    const alert = await getStatusForLine(line);

    if (!alert) {
      resultsBox.textContent = `No service info found for line ${line.toUpperCase()}.`;
      return;
    }

    resultsBox.innerHTML = `
      <strong>${alert.title}</strong><br>
      <span>${alert.description}</span>
    `;
  });
});

// Wait for DOM to be ready before wiring UI behavior
document.addEventListener("DOMContentLoaded", () => {
    switchTabs();

    // Ensure one tab/panel is visible on load (activate first tab if none active)
    const activeTab = document.querySelector("#UIBar .tab.active") || document.querySelector("#UIBar .tab");
    if (activeTab) activeTab.click();
});
