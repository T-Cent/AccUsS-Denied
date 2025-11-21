
const browserApi = typeof browser !== "undefined" ? browser : null;

// --- THEME HANDLING -------------------------------------------------------
const THEME_KEY = "acuss-denied-theme";
const root = document.documentElement;
let currentWindowLocation = "";
let themeClassApplied = false;

function reflectThemeOnControl(theme) {
  const themeBtn = document.getElementById("theme-btn");
  if (!themeBtn) return;
  themeBtn.setAttribute("aria-pressed", theme === "dark" ? "true" : "false");
  themeBtn.dataset.mode = theme;
  const label = themeBtn.querySelector(".theme-toggle__label");
  if (label) {
    label.textContent = theme === "dark" ? "Dark mode" : "Light mode";
  }
}

function applyTheme(theme) {
  // theme = "dark" | "light"
  root.setAttribute("data-theme", theme);
  if (!themeClassApplied) {
    requestAnimationFrame(() => root.classList.add("theme-ready"));
    themeClassApplied = true;
  }
  reflectThemeOnControl(theme);
}

function initTheme() {
  const stored = localStorage.getItem(THEME_KEY);
  const storedTheme = stored === "light" || stored === "dark" ? stored : null;
  const prefersDark =
    window.matchMedia &&
    window.matchMedia("(prefers-color-scheme: dark)").matches;

  // default to user's stored choice, else use system preference, else default to light
  const theme = storedTheme || (prefersDark ? "dark" : "light");
  applyTheme(theme);
}

function toggleTheme() {
  const current =
    document.documentElement.getAttribute("data-theme") || "dark";
  const next = current === "dark" ? "light" : "dark";
  applyTheme(next);
  try {
    localStorage.setItem(THEME_KEY, next);
  } catch (e) {
    // localStorage may be restricted in some extension contexts; ignore failures
    console.warn("acUsS denied: could not save theme:", e);
  }
}

async function scanSite() {
  const url = `https://observatory-api.mdn.mozilla.net/api/v2/scan?host=${currentWindowLocation}`;
  console.log(url);

  const response = await fetch(url, {
    method: "POST"
  });

  const result = await response.json();
  return result;
}

initTheme();

const themeBtn = document.getElementById("theme-btn");
if (themeBtn) {
  themeBtn.addEventListener("click", toggleTheme);
}

function fill_IP_Info() {
  // browserApi.storage.local.get("savedData", (result) => {
  //   console.log("Loaded:", result.savedData);
  // });
  // console.log(localStorage.getItem("ipData"));


  browserApi.runtime.sendMessage("Need IP Info").then(response =>
    {
      console.log("Received data from background service", response);
      document.getElementById("unsafe").textContent = response.unsafe ? "Unsafe" : "Safe";
      document.getElementById("ip-addr").textContent = response.ip_address;
      document.getElementById("phishing").textContent = response.phishing;
      document.getElementById("malware").textContent = response.malware;
      document.getElementById("spamming").textContent = response.spamming;
      document.getElementById("risk-score").textContent = response.risk_score;

      currentWindowLocation = response.root_domain;

  });
}

fill_IP_Info();

// --- BUTTON LOGIC ---------------------------------------------------------

// Open MDN HTTP Observatory for the current host
const observatoryBtn = document.getElementById("observatory-btn");
if (observatoryBtn) {
  observatoryBtn.addEventListener("click", () => {
    if (!currentWindowLocation) return;
    const obsUrl = scanSite();
    console.log(`MDN's response for ${currentWindowLocation}`, obsUrl);

    if (browserApi && browserApi.tabs && browserApi.tabs.create) {
      browserApi.tabs.create({ url: obsUrl });
    } else {
      window.open(obsUrl, "_blank", "noopener");
    }
  });
}

// Open mail client with a pre-filled report
const mailBtn = document.getElementById("mail-btn");
if (mailBtn) {
  mailBtn.addEventListener("click", () => {
    const subject = encodeURIComponent(
      `[acUsS denied] Report for ${currentWindowLocation || "website"}`
    );
    const body = encodeURIComponent(
      `I would like to report this website:\n\n` +
      `URL: ${currentUrl || ""}\n\n` +
      `Details:\n- What you saw\n- Why you believe it is unsafe or a false positive\n\n` +
      `Thank you.`
    );

    const mailUrl = `mailto:support@example.com?subject=${subject}&body=${body}`;

    if (browserApi && browserApi.tabs && browserApi.tabs.create) {
      // open mailto in a new tab if possible
      browserApi.tabs.create({ url: mailUrl });
    } else {
      // fallback - attempt to open mail client
      window.location.href = mailUrl;
    }
  });
}



ad_blocking = true;
const ad_blocking_btn = document.getElementById("adblocking");
const site_message = document.getElementById("site-message");

ad_blocking_btn.addEventListener("click", () => {
  if (ad_blocking) {
    browserApi.runtime.sendMessage({ text: "Disable ad blocking" })
    ad_blocking_btn.textContent = "Enable ad blocking";
    site_message.textContent = "Ad blocking is disabled";
    ad_blocking = false;
  } else {
    browserApi.runtime.sendMessage({ text: "Enable ad blocking" })
    ad_blocking_btn.textContent = "Disable ad blocking";
    site_message.textContent = "Ad blocking is active";
    ad_blocking = true;
  }
})
