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
  playbackRate: 1,
  defaultVolume: 80,
};

const enabled = document.querySelector("#enabled");
const statusCard = document.querySelector("#statusCard");
const statusText = document.querySelector("#statusText");
const activeCount = document.querySelector("#activeCount");
const totalCount = document.querySelector("#totalCount");
const meterFill = document.querySelector("#meterFill");
const volume = document.querySelector("#volume");
const volumeOut = document.querySelector("#volumeOut");
const notYoutube = document.querySelector("#notYoutube");
const rateButtons = [...document.querySelectorAll("[data-rate]")];
const quickInputs = [...document.querySelectorAll("[data-quick] input")];
const settingInputs = [...document.querySelectorAll("[data-setting]")];

function updateMeter() {
  const active = quickInputs.filter((input) => input.checked).length;
  activeCount.textContent = active;
  totalCount.textContent = quickInputs.length;
  meterFill.style.width = `${(active / quickInputs.length) * 100}%`;
}

function updateVolume(value) {
  volumeOut.textContent = `${value}%`;
  volume.style.setProperty("--fill", `${value}%`);
}

function render(config) {
  const paused = config.enabled === false;
  settingInputs.forEach((input) => {
    const key = input.dataset.setting;
    if (input.type === "checkbox") input.checked = Boolean(config[key]);
    else input.value = config[key];
    input.disabled = paused;
  });
  updateVolume(volume.value);
  rateButtons.forEach((button) => {
    const on = Number(button.dataset.rate) === Number(config.playbackRate);
    button.classList.toggle("active", on);
    button.setAttribute("aria-checked", String(on));
    button.disabled = paused;
  });
  enabled.checked = !paused;
  statusCard.classList.toggle("paused", paused);
  document.body.classList.toggle("paused", paused);
  statusText.textContent = paused ? "Duraklatıldı" : "YouTube'da etkin";
  updateMeter();
}

chrome.storage.local.get(DEFAULTS, render);
chrome.storage.onChanged.addListener(() => chrome.storage.local.get(DEFAULTS, render));

enabled.addEventListener("change", () => chrome.storage.local.set({ enabled: enabled.checked }));

settingInputs.forEach((input) => {
  input.addEventListener("change", () => {
    const value = input.type === "checkbox" ? input.checked : Number(input.value);
    chrome.storage.local.set({ [input.dataset.setting]: value });
    updateMeter();
  });
});
volume.addEventListener("input", () => updateVolume(volume.value));

rateButtons.forEach((button) => {
  button.setAttribute("role", "radio");
  button.addEventListener("click", () => {
    chrome.storage.local.set({ playbackRate: Number(button.dataset.rate) });
  });
});

document.querySelector("#advancedButton").addEventListener("click", () => {
  chrome.tabs.create({ url: chrome.runtime.getURL("settings.html") });
});

chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
  const url = tabs[0]?.url || "";
  if (url && !/:\/\/(www\.|m\.)?youtube\.com\//.test(url)) notYoutube.hidden = false;
});
