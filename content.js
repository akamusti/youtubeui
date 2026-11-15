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
let currentConfig = DEFAULTS;
let refreshQueued = false;

function apply(config) {
  currentConfig = { ...DEFAULTS, ...config };
  root = document.documentElement;
  if (!root) {
    document.addEventListener("DOMContentLoaded", () => apply(config), { once: true });
    return;
  }
  const active = currentConfig.enabled !== false;
  root.classList.toggle("yuzetube-enabled", active);
  root.classList.toggle("yuzetube-hide-shorts", active && currentConfig.hideShorts);
  root.classList.toggle("yuzetube-hide-promotions", active && currentConfig.hidePromotions);
  root.classList.toggle("yuzetube-theater", active && currentConfig.theaterMode);
  root.classList.toggle("yuzetube-no-ambient", active && currentConfig.disableAmbient);
  root.classList.toggle("yuzetube-rounded", active && currentConfig.roundedCorners);
  root.classList.toggle("yuzetube-compact-grid", active && currentConfig.compactGrid);
  root.classList.toggle("yuzetube-hide-comments", active && currentConfig.hideComments);
  root.classList.toggle("yuzetube-reduce-motion", active && currentConfig.reduceMotion);
  root.classList.toggle("yuzetube-compact-sidebar", active && currentConfig.compactSidebar);
  root.classList.toggle("yuzetube-hide-related", active && currentConfig.hideRelated);
  root.classList.toggle("yuzetube-readable-titles", active && currentConfig.readableTitles);
  root.classList.toggle("yuzetube-styled-controls", active && currentConfig.styledControls);
  for (const theme of ["midnight", "rose", "ocean"]) {
    root.classList.toggle(`yuzetube-theme-${theme}`, active && currentConfig.theme === theme);
  }
  applyVideoPreferences(active, currentConfig);
  refreshDynamicUi();
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

function refreshDynamicUi() {
  if (refreshQueued) return;
  refreshQueued = true;
  requestAnimationFrame(() => {
    refreshQueued = false;
    const active = currentConfig.enabled !== false;
    document.querySelectorAll("ytd-rich-section-renderer, ytd-reel-shelf-renderer").forEach((element) => {
      const isShorts = element.querySelector('a[href^="/shorts/"]') !== null;
      if (active && currentConfig.hideShorts && isShorts) {
        element.setAttribute("data-yuzetube-hidden", "shorts");
      } else if (element.getAttribute("data-yuzetube-hidden") === "shorts") {
        element.removeAttribute("data-yuzetube-hidden");
      }
    });
    document.querySelectorAll("ytd-guide-entry-renderer, ytd-mini-guide-entry-renderer").forEach((element) => {
      const isShortsMenu = [...element.querySelectorAll("a[href]")].some((link) => {
        const path = new URL(link.href, location.origin).pathname;
        return path === "/shorts" || path.startsWith("/shorts/");
      });
      if (active && currentConfig.hideShorts && isShortsMenu) {
        element.setAttribute("data-yuzetube-hidden", "shorts-menu");
      } else if (element.getAttribute("data-yuzetube-hidden") === "shorts-menu") {
        element.removeAttribute("data-yuzetube-hidden");
      }
    });
    document.querySelectorAll("ytd-ad-slot-renderer, ytd-in-feed-ad-layout-renderer, ytd-promoted-sparkles-web-renderer").forEach((element) => {
      if (active && currentConfig.hidePromotions) {
        element.setAttribute("data-yuzetube-hidden", "promotion");
      } else if (element.getAttribute("data-yuzetube-hidden") === "promotion") {
        element.removeAttribute("data-yuzetube-hidden");
      }
    });
  });
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
  refreshDynamicUi();
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
