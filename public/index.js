

function switchTabs(tabName) {
  const tabs = document.querySelectorAll("#UIBar .tab");
  const panels = document.querySelectorAll(".panel");

  tabs.forEach(t => t.classList.remove("active"));
  panels.forEach(p => p.style.display = "none");

  document.querySelector(`#UIBar .tab[data-tab="${tabName}"]`).classList.add("active");
  document.getElementById(tabName).style.display = "block";
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
