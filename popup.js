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
const statusTitle = document.querySelector("#statusTitle");
const statusText = document.querySelector("#statusText");
const activeCount = document.querySelector("#activeCount");
const volumeOut = document.querySelector("#volumeOut");
const quickSearch = document.querySelector("#quickSearch");
const emptyQuick = document.querySelector("#emptyQuick");
const notYoutube = document.querySelector("#notYoutube");
const quickItems = [...document.querySelectorAll("[data-quick]")];
const settingInputs = [...document.querySelectorAll("[data-setting]")];
let query = "";

function filterQuick() {
  const q = query.trim().toLocaleLowerCase("tr");
  let visible = 0;
  quickItems.forEach((item) => {
    const match = !q || item.textContent.toLocaleLowerCase("tr").includes(q);
    item.classList.toggle("hidden", !match);
    if (match) visible++;
  });
  emptyQuick.hidden = visible > 0;
}

function render(config) {
  settingInputs.forEach((input) => {
    const key = input.dataset.setting;
    if (input.type === "checkbox") input.checked = Boolean(config[key]);
    else if (input.type === "range") {
      input.value = config[key];
      volumeOut.textContent = `${input.value}%`;
    } else {
      input.value = config[key] == null ? "" : config[key];
    }
    input.disabled = config.enabled === false;
  });
  enabled.checked = config.enabled !== false;

  const active = quickItems.filter((item) => item.querySelector("[data-setting]").checked).length;
  activeCount.textContent = `${active} / ${quickItems.length}`;

  const paused = config.enabled === false;
  statusCard.classList.toggle("paused", paused);
  document.body.classList.toggle("paused", paused);
  statusTitle.textContent = paused ? "YüzeTube duraklatıldı" : "YüzeTube aktif";
  statusText.textContent = paused
    ? "Ayarlar geçici olarak kapalı"
    : "Ayarlar YouTube'da uygulanıyor";
  filterQuick();
}

chrome.storage.local.get(DEFAULTS, render);

enabled.addEventListener("change", () => {
  chrome.storage.local.set({ enabled: enabled.checked });
});

settingInputs.forEach((input) => {
  input.addEventListener("change", () => {
    const value = input.type === "checkbox" ? input.checked : input.value;
    chrome.storage.local.set({ [input.dataset.setting]: value });
    if (input.type === "range") volumeOut.textContent = `${input.value}%`;
    if (input.type === "checkbox") {
      const checked = quickItems.filter((item) => item.querySelector("[data-setting]").checked).length;
      activeCount.textContent = `${checked} / ${quickItems.length}`;
    }
  });
});

chrome.storage.onChanged.addListener(() => chrome.storage.local.get(DEFAULTS, render));

quickSearch.addEventListener("input", () => {
  query = quickSearch.value;
  filterQuick();
});

async function openSettings() {
  await chrome.tabs.create({ url: chrome.runtime.getURL("settings.html") });
}
document.querySelector("#optionsButton").addEventListener("click", openSettings);
document.querySelector("#advancedButton").addEventListener("click", openSettings);

chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
  const url = tabs[0]?.url || "";
  if (url && !/:\/\/(www\.|m\.)?youtube\.com\//.test(url)) notYoutube.hidden = false;
});
