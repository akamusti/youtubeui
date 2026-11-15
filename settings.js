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
const inputs = [...document.querySelectorAll("[data-setting]")];
function render(config) {
  inputs.forEach((input) => {
    if (input.type === "checkbox") input.checked = Boolean(config[input.dataset.setting]);
    else input.value = config[input.dataset.setting];
  });
}
chrome.storage.local.get(DEFAULTS, render);
inputs.forEach((input) => input.addEventListener("change", () => chrome.storage.local.set({ [input.dataset.setting]: input.checked })));
chrome.storage.onChanged.addListener(() => chrome.storage.local.get(DEFAULTS, render));
