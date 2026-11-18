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

// One DOM element represents a video on each surface. Nested items are skipped
// so hiding the outer one doesn't leave an empty grid slot.
const KEYWORD_ITEM_SELECTOR = [
  "ytd-rich-item-renderer",
  "yt-lockup-view-model",
  "ytm-shorts-lockup-view-model",
  "ytd-video-renderer",
  "ytd-compact-video-renderer",
  "ytd-grid-video-renderer",
  "ytd-channel-video-player-renderer",
  ".ytp-videowall-still",
  ".ytp-modern-videowall-still",
].join(", ");
const KEYWORD_TITLE_SELECTOR = [
  ".ytLockupMetadataViewModelTitle",
  ".shortsLockupViewModelHostMetadataTitle",
  "#video-title",
  "yt-formatted-string.title",
  ".ytp-videowall-still-info-title",
  ".ytp-modern-videowall-still-info-title",
  ".ytp-ce-video-title",
  ".ytp-ce-playlist-title",
].join(", ");

let root = document.documentElement;
let currentConfig = DEFAULTS;
let refreshQueued = false;
let playerSyncTimer = null;
let lastVideoApplied = null;
let theaterAppliedByUs = false;
let keywordMatchers = [];
let keywordSource = null;

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
  root.classList.toggle("yuzetube-hide-chips", active && currentConfig.hideChips);
  root.classList.toggle("yuzetube-hide-end-cards", active && currentConfig.hideEndCards);
  root.classList.toggle("yuzetube-hide-live-chat", active && currentConfig.hideLiveChat);
  root.classList.toggle("yuzetube-show-controls", active && currentConfig.alwaysShowControls);
  root.classList.toggle("yuzetube-hide-extra-rows", active && currentConfig.hideExtraRows);
  root.classList.toggle("yuzetube-hide-end-of-video", active && currentConfig.hideEndOfVideo);
  root.classList.toggle("yuzetube-hide-playables", active && currentConfig.hidePlayables);
  root.classList.toggle("yuzetube-hide-explore-link", active && currentConfig.hideExploreLink);
  root.classList.toggle("yuzetube-hide-next-button", active && currentConfig.hideNextButton);
  root.classList.toggle("yuzetube-center-player", active && currentConfig.centerPlayer);
  root.classList.toggle("yuzetube-hide-sub-shorts", active && currentConfig.hideSubShorts);
  root.classList.toggle("yuzetube-hide-playlist-suggestions", active && currentConfig.hidePlaylistSuggestions);
  root.classList.toggle("yuzetube-keyword-filter", active && Boolean(currentConfig.blockedKeywords));
  for (const theme of ["midnight", "rose", "ocean"]) {
    root.classList.toggle(`yuzetube-theme-${theme}`, active && currentConfig.theme === theme);
  }
  // The player is created asynchronously, so sync preferences with a short poll.
  lastVideoApplied = null;
  schedulePlayerSync();
  refreshDynamicUi();
}

function clamp01(value) {
  return Math.min(1, Math.max(0, value));
}

function setHidden(element, kind, shouldHide) {
  if (!element) return;
  const attribute = "data-yuzetube-hidden";
  if (shouldHide) {
    if (element.getAttribute(attribute) !== kind) element.setAttribute(attribute, kind);
  } else if (element.getAttribute(attribute) === kind) {
    element.removeAttribute(attribute);
  }
}

function compileKeywords(source) {
  const value = typeof source === "string" ? source : "";
  if (value === keywordSource) return keywordMatchers;
  keywordSource = value;
  keywordMatchers = value
    .split(/[\n,;]+/)
    .map((term) => term.trim())
    .filter(Boolean)
    .map((term) => {
      const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/\\\*/g, ".*");
      return new RegExp(escaped, "i");
    });
  return keywordMatchers;
}

function matchesKeyword(title, matchers) {
  return matchers.some((matcher) => matcher.test(title));
}

function applyVideoPreferences(active, config) {
  if (!active) return;
  const video = document.querySelector("video.html5-main-video, video");
  if (!video || video === lastVideoApplied) return;
  lastVideoApplied = video;
  if (config.playbackRate != null && Number.isFinite(Number(config.playbackRate))) {
    video.playbackRate = Number(config.playbackRate);
  }
  if (config.defaultVolume != null && Number.isFinite(Number(config.defaultVolume))) {
    video.volume = clamp01(Number(config.defaultVolume) / 100);
  }
  if (config.muteByDefault) video.muted = true;
  if (config.loopVideos) video.loop = true;
}

// YouTube's real theater mode is driven by the player's own control, not CSS width.
// Clicking it is the same action a user takes, so YouTube keeps its own state/cookie intact.
function theaterState() {
  const flexy = document.querySelector("ytd-watch-flexy");
  if (flexy) {
    if (flexy.theater === true || flexy.theater === "true") return true;
    if (flexy.theater === false || flexy.theater === "false") return false;
    if (flexy.hasAttribute("theater")) {
      const value = flexy.getAttribute("theater");
      if (value === "false") return false;
      return true; // bare attribute or "true"
    }
  }
  const masthead = document.querySelector("#masthead");
  if (masthead) {
    const value = masthead.getAttribute("theater");
    if (value === "" || value === "true") return true;
    if (value === "false") return false;
  }
  const button = document.querySelector(".ytp-size-button");
  if (button) {
    const label = `${button.getAttribute("aria-label") || ""} ${button.getAttribute("title") || ""}`.toLowerCase();
    if (label.includes("default")) return true;
    if (label.includes("theater")) return false;
  }
  return null;
}

function applyTheaterMode(active) {
  const want = active && currentConfig.theaterMode === true;
  const state = theaterState();
  if (!want) {
    if (theaterAppliedByUs && state === true) {
      const button = document.querySelector(".ytp-size-button");
      if (button) {
        button.click();
        theaterAppliedByUs = false;
      }
    }
    return;
  }
  if (state === true) {
    theaterAppliedByUs = true;
    return;
  }
  if (state === null) return; // state not readable yet, don't risk a wrong toggle
  const button = document.querySelector(".ytp-size-button");
  if (!button) return;
  button.click();
  theaterAppliedByUs = true;
}

function applyAutoplay(active) {
  if (!active || !currentConfig.disableAutoplay) return;
  const button = document.querySelector("button.ytp-button[data-tooltip-target-id='ytp-autonav-toggle-button']");
  if (!button) return;
  const label = `${button.getAttribute("aria-label") || ""} ${button.getAttribute("title") || ""}`.toLowerCase();
  const isOn = /autoplay\s+is\s+on/.test(label) || button.getAttribute("aria-checked") === "true";
  if (isOn) button.click();
}

function schedulePlayerSync() {
  if (playerSyncTimer) clearInterval(playerSyncTimer);
  let tries = 0;
  playerSyncTimer = setInterval(() => {
    tries++;
    const active = currentConfig.enabled !== false;
    applyVideoPreferences(active, currentConfig);
    applyTheaterMode(active);
    applyAutoplay(active);
    const wantTheater = active && currentConfig.theaterMode === true;
    const theaterDone = wantTheater ? theaterState() === true : !theaterAppliedByUs;
    const videoReady = Boolean(document.querySelector("video"));
    if ((theaterDone && videoReady && tries >= 2) || tries >= 48) {
      clearInterval(playerSyncTimer);
      playerSyncTimer = null;
    }
  }, 250);
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
    if (active && currentConfig.compactSidebar) {
      document.querySelectorAll("ytd-guide-entry-renderer a#endpoint, ytd-mini-guide-entry-renderer a#endpoint").forEach((link) => {
        if (link.hasAttribute("title")) return;
        const label = (link.querySelector(".title")?.textContent || link.getAttribute("aria-label") || "").trim();
        if (label) link.setAttribute("title", label);
      });
    }
    document.querySelectorAll("ytd-ad-slot-renderer, ytd-in-feed-ad-layout-renderer, ytd-promoted-sparkles-web-renderer").forEach((element) => {
      if (active && currentConfig.hidePromotions) {
        element.setAttribute("data-yuzetube-hidden", "promotion");
      } else if (element.getAttribute("data-yuzetube-hidden") === "promotion") {
        element.removeAttribute("data-yuzetube-hidden");
      }
    });

    const onSubscriptions = Boolean(document.querySelector('ytd-browse[page-subtype="subscriptions"]'));
    const subShorts = active && currentConfig.hideSubShorts && onSubscriptions;
    document.querySelectorAll("ytd-grid-video-renderer, ytd-rich-item-renderer, ytd-rich-section-renderer, ytm-shorts-lockup-view-model").forEach((element) => {
      const isSubShort = subShorts && (
        element.matches("ytm-shorts-lockup-view-model") ||
        element.querySelector('ytd-thumbnail-overlay-time-status-renderer[overlay-style="SHORTS"]') !== null ||
        element.querySelector('a[href^="/shorts/"]') !== null
      );
      setHidden(element, "sub-shorts", isSubShort);
    });

    const playables = active && currentConfig.hidePlayables;
    document.querySelectorAll("ytd-mini-game-card-view-model").forEach((card) => {
      setHidden(card.closest("ytd-rich-section-renderer") || card, "playable", playables);
    });

    const playlistSuggestions = active && currentConfig.hidePlaylistSuggestions;
    document.querySelectorAll('ytd-item-section-header-renderer[title-style="ITEM_SECTION_HEADER_TITLE_STYLE_PLAYLIST_RECOMMENDATIONS"]').forEach((header) => {
      setHidden(header.closest("ytd-item-section-renderer"), "playlist-suggestions", playlistSuggestions);
    });

    const matchers = compileKeywords(active ? currentConfig.blockedKeywords : "");
    if (matchers.length) {
      document.querySelectorAll(KEYWORD_ITEM_SELECTOR).forEach((item) => {
        if (item.parentElement?.closest(KEYWORD_ITEM_SELECTOR)) return;
        const title = item.querySelector(KEYWORD_TITLE_SELECTOR)?.textContent || "";
        setHidden(item, "keyword", matchesKeyword(title, matchers));
      });
    } else {
      document.querySelectorAll('[data-yuzetube-hidden="keyword"]').forEach((element) => {
        element.removeAttribute("data-yuzetube-hidden");
      });
    }
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
