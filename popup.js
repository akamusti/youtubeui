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
};

const enabled = document.querySelector("#enabled");
const statusText = document.querySelector("#statusText");

function render(config) {
  enabled.checked = config.enabled;
  statusText.textContent = config.enabled
    ? "Ayarların YouTube'da uygulanıyor"
    : "YüzeTube geçici olarak duraklatıldı";
  document.querySelectorAll("[data-setting]").forEach((input) => {
    input.checked = Boolean(config[input.dataset.setting]);
    input.disabled = !config.enabled;
  });
}

chrome.storage.local.get(DEFAULTS, render);

enabled.addEventListener("change", () => {
  chrome.storage.local.set({ enabled: enabled.checked });
});

document.querySelectorAll("[data-setting]").forEach((input) => {
  input.addEventListener("change", () => {
    chrome.storage.local.set({ [input.dataset.setting]: input.checked });
  });
});

chrome.storage.onChanged.addListener((changes) => {
  chrome.storage.local.get(DEFAULTS, render);
});

document.querySelector("#optionsButton").addEventListener("click", async () => {
  await chrome.tabs.create({ url: chrome.runtime.getURL("settings.html") });
});
