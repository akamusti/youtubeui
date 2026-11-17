const DEFAULTS = {
  enabled: true,
  hideShorts: true,
  hidePromotions: true,
  theaterMode: false,
  disableAmbient: true,
  roundedCorners: true,
  compactGrid: false,
  hideComments: false,
  reduceMotion: false,
  compactSidebar: false,
  hideRelated: false,
  readableTitles: true,
  styledControls: true,
  playbackRate: 1,
  defaultVolume: 80,
  theme: "default",
  disableAutoplay: false,
  muteByDefault: false,
  loopVideos: false,
  alwaysShowControls: false,
  hideEndCards: false,
  hideLiveChat: false,
  hideChips: false,
  hideExtraRows: false,
  hideEndOfVideo: false,
  hidePlayables: false,
  hideExploreLink: false,
  hideNextButton: false,
  centerPlayer: false,
  hideSubShorts: false,
  hidePlaylistSuggestions: false,
  blockedKeywords: "",
};

const inputs = [...document.querySelectorAll("[data-setting]")];
const rows = [...document.querySelectorAll("[data-row]")];
const panels = [...document.querySelectorAll(".panel")];
const chips = [...document.querySelectorAll(".chip")];
const navItems = [...document.querySelectorAll(".nav-item")];
const searchInput = document.querySelector("#searchInput");
const saveState = document.querySelector("#saveState");
const statActive = document.querySelector("#statActive");
let activeFilter = "all";
let query = "";
let saveTimer = null;

function updateRangeOutput(input) {
  const output = document.querySelector(`.range-value[data-for="${input.dataset.setting}"]`);
  if (output) output.textContent = `${input.value}%`;
}

function applyFilters() {
  const q = query.trim().toLocaleLowerCase("tr");
  rows.forEach((row) => {
    const input = row.querySelector("[data-setting]");
    const isCheck = input && input.type === "checkbox";
    const stateOk = activeFilter === "all"
      || (activeFilter === "on" ? isCheck && input.checked : isCheck && !input.checked);
    const textOk = !q || row.textContent.toLocaleLowerCase("tr").includes(q);
    row.classList.toggle("hidden", !(stateOk && textOk));
  });
  panels.forEach((panel) => {
    const hasVisibleRows = [...panel.querySelectorAll("[data-row]")].some((row) => !row.classList.contains("hidden"));
    panel.classList.toggle("hidden", !hasVisibleRows);
  });
  navItems.forEach((item) => {
    const panel = document.getElementById(item.dataset.target);
    const count = panel ? [...panel.querySelectorAll("[data-row]")].filter((row) => !row.classList.contains("hidden")).length : 0;
    item.querySelector(".nav-count").textContent = count;
  });
}

function render(config) {
  inputs.forEach((input) => {
    const key = input.dataset.setting;
    if (input.type === "checkbox") input.checked = Boolean(config[key]);
    else if (input.type === "range") {
      input.value = config[key];
      updateRangeOutput(input);
    } else {
      input.value = config[key] == null ? "" : config[key];
    }
  });
  const active = Object.entries(config).filter(([key, value]) => key !== "enabled" && typeof value === "boolean" && value).length;
  statActive.textContent = active;
  document.body.classList.toggle("is-paused", config.enabled === false);
  applyFilters();
}

function flashSaved() {
  clearTimeout(saveTimer);
  saveState.textContent = "… Kaydediliyor";
  saveState.classList.add("saving");
  saveTimer = setTimeout(() => {
    saveState.textContent = "✓ Kaydedildi";
    saveState.classList.remove("saving");
  }, 450);
}

chrome.storage.local.get(DEFAULTS, render);

inputs.forEach((input) => {
  input.addEventListener("change", () => {
    const value = input.type === "checkbox" ? input.checked : input.value;
    chrome.storage.local.set({ [input.dataset.setting]: value }, flashSaved);
    if (input.type === "range") updateRangeOutput(input);
  });
});

chrome.storage.onChanged.addListener(() => chrome.storage.local.get(DEFAULTS, render));

searchInput.addEventListener("input", () => {
  query = searchInput.value;
  applyFilters();
});

chips.forEach((chip) => chip.addEventListener("click", () => {
  activeFilter = chip.dataset.filter;
  chips.forEach((item) => item.classList.toggle("active", item === chip));
  applyFilters();
}));

navItems.forEach((item) => item.addEventListener("click", () => {
  const panel = document.getElementById(item.dataset.target);
  if (panel) panel.scrollIntoView({ behavior: "smooth", block: "start" });
}));

const observer = new IntersectionObserver((entries) => {
  entries.forEach((entry) => {
    if (!entry.isIntersecting) return;
    navItems.forEach((item) => item.classList.toggle("active", item.dataset.target === entry.target.id));
  });
}, { root: document.querySelector("#content"), rootMargin: "-12% 0px -72% 0px" });
panels.forEach((panel) => observer.observe(panel));

document.querySelector("#resetButton").addEventListener("click", () => {
  if (!confirm("Tüm ayarlar varsayılan değerlere döndürülsün mü?")) return;
  chrome.storage.local.set(DEFAULTS, flashSaved);
});

document.addEventListener("keydown", (event) => {
  if (event.key === "/" && document.activeElement !== searchInput
      && !(document.activeElement instanceof HTMLInputElement)) {
    event.preventDefault();
    searchInput.focus();
  }
  if (event.key === "Escape" && document.activeElement === searchInput) {
    searchInput.value = "";
    query = "";
    applyFilters();
    searchInput.blur();
  }
});
