function switchTabs() {
    const tabs = document.querySelectorAll("#UIBar .tab");
    const panels = document.querySelectorAll(".panel");

    tabs.forEach(tab => {
        tab.addEventListener("click", () => {
        tabs.forEach(t => t.classList.remove("active"));
        panels.forEach(p => p.style.display = "none");

        tab.classList.add("active");

        const target = tab.dataset.tab;
        document.getElementById(target).style.display = "block";
        });
    });
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

async function getStatus(line) {
  const res = await fetch(`/status/${line}`);
  const data = await res.json();
  console.log(data);
}
