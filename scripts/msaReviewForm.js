// Standalone local review form. TEMPLATE contains only blank labels and source IDs.
const storageKey = `researchmate-human-labels:${TEMPLATE.packId}`;
const statusText = document.getElementById("save-status");
const sections = [...document.querySelectorAll("[data-region]")];
function collect() {
  return { ...TEMPLATE, exportedAt: new Date().toISOString(), regions: sections.map((section) => {
    const region = { id: section.dataset.region };
    for (const input of section.querySelectorAll("[data-field]")) region[input.dataset.field] = input.type === "checkbox" ? input.checked : input.value;
    return region;
  }) };
}
function restore(labels) {
  if (labels.packId !== TEMPLATE.packId || labels.sourceSha256 !== TEMPLATE.sourceSha256) throw new Error("These labels belong to a different review pack.");
  for (const region of labels.regions || []) {
    const section = sections.find((item) => item.dataset.region === region.id);
    if (!section) continue;
    for (const input of section.querySelectorAll("[data-field]")) {
      const value = region[input.dataset.field];
      if (input.type === "checkbox") input.checked = value === true;
      else if (typeof value === "string") input.value = value;
    }
  }
}
function save() {
  const labels = collect();
  const checked = labels.regions.filter((region) => region.status === "checked").length;
  try {
    localStorage.setItem(storageKey, JSON.stringify(labels));
    statusText.textContent = `${checked} / ${sections.length} regions checked. Saved in this browser; export JSON for a portable copy.`;
  } catch { statusText.textContent = "Browser autosave is unavailable. Export JSON to keep your work."; }
}
document.addEventListener("input", save);
document.addEventListener("change", save);
document.getElementById("export").addEventListener("click", () => {
  const blob = new Blob([JSON.stringify(collect(), null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob); const link = document.createElement("a");
  link.href = url; link.download = `${TEMPLATE.packId}-checked-labels.json`; link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
});
document.getElementById("import").addEventListener("change", async (event) => {
  const file = event.target.files[0]; if (!file) return;
  try { restore(JSON.parse(await file.text())); save(); }
  catch (error) { statusText.textContent = error.message; }
  event.target.value = "";
});
try { const saved = localStorage.getItem(storageKey); if (saved) { restore(JSON.parse(saved)); save(); } }
catch { statusText.textContent = "Autosave could not be restored. Import your last exported labels if available."; }
