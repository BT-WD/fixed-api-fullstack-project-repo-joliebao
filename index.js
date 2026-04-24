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
