// accuss-denied.js (fixed)
// Shared logic for popup + blocked page for "acUsS denied"

document.addEventListener("DOMContentLoaded", () => {
  const browserApi = typeof browser !== "undefined" ? browser : null;

  // --- THEME HANDLING -------------------------------------------------------
  const THEME_KEY = "acuss-denied-theme";
  const root = document.documentElement;
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

  initTheme();

  const themeBtn = document.getElementById("theme-btn");
  if (themeBtn) {
    themeBtn.addEventListener("click", toggleTheme);
  }

  // --- CONTEXT DETECTION ----------------------------------------------------
  const isBlockedPage = !!document.getElementById("blocked-host");
  // note: your HTML uses id="site-host", so choose that for non-blocked popup
  const hostEl = document.getElementById(
    isBlockedPage ? "blocked-host" : "site-host"
  );

  let currentUrl = null;
  let currentHost = null;

  function extractHost(url) {
    try {
      return new URL(url).hostname;
    } catch (e) {
      return url;
    }
  }

  // On blocked.html we prefer the ?target=... param
  const params = new URLSearchParams(window.location.search);
  const targetFromQuery = params.get("target");

  if (isBlockedPage && targetFromQuery) {
    currentUrl = targetFromQuery;
    currentHost = extractHost(targetFromQuery);
    if (hostEl) hostEl.textContent = currentHost;
  } else if (browserApi && browserApi.tabs && browserApi.tabs.query) {
    // Popup, or blocked page without target param -> use active tab
    browserApi.tabs
      .query({ active: true, currentWindow: true })
      .then((tabs) => {
        if (!tabs || !tabs.length) return;
        currentUrl = tabs[0].url;
        currentHost = extractHost(currentUrl);
        if (hostEl) hostEl.textContent = currentHost;
      })
      .catch((err) => {
        console.error("acUsS denied: could not read active tab", err);
        // Fallback to current location (best-effort)
        currentUrl = window.location.href;
        currentHost = extractHost(currentUrl);
        if (hostEl) hostEl.textContent = currentHost;
      });
  } else {
    // Fallback - just use current page URL
    currentUrl = window.location.href;
    currentHost = extractHost(currentUrl);
    if (hostEl) hostEl.textContent = currentHost;
  }

  // --- BUTTON LOGIC ---------------------------------------------------------

  // Open MDN HTTP Observatory for the current host
  const observatoryBtn = document.getElementById("observatory-btn");
  if (observatoryBtn) {
    observatoryBtn.addEventListener("click", () => {
      if (!currentHost) return;
      const obsUrl =
        "https://http-observatory.security.mozilla.org/analyze?host=" +
        encodeURIComponent(currentHost);

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
        `[acUsS denied] Report for ${currentHost || "website"}`
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

  // Go back / "safety" button
  const goBackBtn = document.getElementById("go-back-btn");
  if (goBackBtn) {
    goBackBtn.addEventListener("click", () => {
      if (isBlockedPage) {
        // On the full blocked page: try to go back, else go to about:home
        if (window.history.length > 1) {
          window.history.back();
        } else {
          window.location.href = "about:home";
        }
      } else if (browserApi && browserApi.tabs && browserApi.tabs.query) {
        // In the popup, make the active tab go back one step
        browserApi.tabs
          .query({ active: true, currentWindow: true })
          .then((tabs) => {
            if (!tabs || !tabs.length) return;
            // use scripting or executeScript depending on API availability
            const tabId = tabs[0].id;
            try {
              if (browserApi.tabs.executeScript) {
                browserApi.tabs.executeScript(tabId, {
                  code: "try { history.back(); } catch (e) {}",
                });
              } else if (browserApi.scripting && browserApi.scripting.executeScript) {
                browserApi.scripting.executeScript({
                  target: { tabId },
                  func: () => { try { history.back(); } catch(e) {} },
                });
              }
            } catch (e) {
              console.error("acUsS denied: go back failed", e);
            }
          })
          .catch((err) => console.error("acUsS denied: go back failed", err));
      } else {
        // Fallback
        window.history.back();
      }
    });
  }

  // Proceed anyway
  const proceedBtn = document.getElementById("proceed-btn");
  if (proceedBtn) {
    proceedBtn.addEventListener("click", () => {
      if (isBlockedPage) {
        // On blocked.html: open the original site (prefer query param)
        const target = targetFromQuery || currentUrl;
        if (!target) return;

        if (browserApi && browserApi.tabs && browserApi.tabs.create) {
          browserApi.tabs.create({ url: target });
        } else {
          window.location.href = target;
        }
      } else {
        // In popup: send a message so background script can whitelist/unblock
        if (browserApi && browserApi.runtime && browserApi.runtime.sendMessage) {
          browserApi.runtime.sendMessage({
            type: "acuss-denied:proceed-current-site",
            url: currentUrl,
            host: currentHost,
          });
        }
        // Close popup (may not be permitted in regular pages)
        try { window.close(); } catch (e) {}
      }
    });
  }
});
