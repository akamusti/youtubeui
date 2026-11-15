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
};

let root = document.documentElement;

function apply(config) {
  root = document.documentElement;
  if (!root) {
    document.addEventListener("DOMContentLoaded", () => apply(config), { once: true });
    return;
  }
  const active = config.enabled !== false;
  root.classList.toggle("yuzetube-enabled", active);
  root.classList.toggle("yuzetube-hide-shorts", active && config.hideShorts);
  root.classList.toggle("yuzetube-hide-promotions", active && config.hidePromotions);
  root.classList.toggle("yuzetube-theater", active && config.theaterMode);
  root.classList.toggle("yuzetube-no-ambient", active && config.disableAmbient);
  root.classList.toggle("yuzetube-rounded", active && config.roundedCorners);
  root.classList.toggle("yuzetube-compact-grid", active && config.compactGrid);
  root.classList.toggle("yuzetube-hide-comments", active && config.hideComments);
  root.classList.toggle("yuzetube-reduce-motion", active && config.reduceMotion);
  root.classList.toggle("yuzetube-compact-sidebar", active && config.compactSidebar);
  root.classList.toggle("yuzetube-hide-related", active && config.hideRelated);
  root.classList.toggle("yuzetube-readable-titles", active && config.readableTitles);
  root.classList.toggle("yuzetube-styled-controls", active && config.styledControls);
  root.dataset.yuzetubeTheme = active ? config.theme : "default";
  applyVideoPreferences(active, config);
}

function applyVideoPreferences(active, config) {
  if (!active) return;
  const video = document.querySelector("video.html5-main-video, video");
  if (!video) return;
  if (Number.isFinite(Number(config.playbackRate))) video.playbackRate = Number(config.playbackRate);
  if (Number.isFinite(Number(config.defaultVolume))) video.volume = Math.min(1, Math.max(0, Number(config.defaultVolume) / 100));
}

chrome.storage.local.get(DEFAULTS, apply);
chrome.storage.onChanged.addListener(() => chrome.storage.local.get(DEFAULTS, apply));

function toggleShortcuts() {
  let panel = document.querySelector("#yuzetube-shortcuts");
  if (!panel) {
    panel = document.createElement("aside");
    panel.id = "yuzetube-shortcuts";
    panel.innerHTML = `
      <strong>YüzeTube kısayolları</strong>
      <span><kbd>?</kbd> Bu paneli aç/kapat</span>
      <span><kbd>R</kbd> Oynatma hızını değiştir</span>
      <span><kbd>Esc</kbd> Paneli kapat</span>
    `;
    (document.documentElement || document.body).appendChild(panel);
  }
  panel.toggleAttribute("data-open");
}

function cyclePlaybackRate() {
  const video = document.querySelector("video.html5-main-video, video");
  if (!video) return;
  const rates = [1, 1.25, 1.5, 1.75, 2];
  const next = rates[(rates.indexOf(video.playbackRate) + 1) % rates.length];
  video.playbackRate = next;
}

document.addEventListener("keydown", (event) => {
  const target = event.target;
  if (target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement || target?.isContentEditable) return;
  if (event.key === "?") toggleShortcuts();
  if (event.key.toLowerCase() === "r") cyclePlaybackRate();
  if (event.key === "Escape") document.querySelector("#yuzetube-shortcuts")?.removeAttribute("data-open");
});

// YouTube is a single-page app; this only nudges the layout after navigation.
let lastUrl = location.href;
const navigationObserver = new MutationObserver(() => {
  if (location.href !== lastUrl) {
    lastUrl = location.href;
    chrome.storage.local.get(DEFAULTS, apply);
    setTimeout(() => chrome.storage.local.get(DEFAULTS, apply), 600);
    if (root) {
      root.classList.add("yuzetube-route-change");
      requestAnimationFrame(() => root.classList.remove("yuzetube-route-change"));
    }
  }
});
navigationObserver.observe(document, { subtree: true, childList: true });
