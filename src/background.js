import { WebExtensionBlocker } from "@ghostery/adblocker-webextension";


// Single blocker instance shared with the message handler
let blocker = null;

let IPINFO = null;

// Initialize blocker inside an async IIFE so we don't rely on top-level await
(async function initBlocker() {
    try {
        blocker = await WebExtensionBlocker.fromPrebuiltAdsAndTracking(); // ads and tracking
        // Pass the `browser` object as required by the WebExtensionBlocker API
        blocker.enableBlockingInBrowser(browser);
        console.log("AccUsS Denied: Ghostery's extension has been activated");
    } catch (err) {
        console.error('Failed to initialize blocker:', err);
    }
})();

browser.runtime.onMessage.addListener((message, sender, sendResponse) => {
    console.log("Received", message);

    // Safely normalize incoming messages to a string for comparisons
    const text = (typeof message === 'string')
        ? message
        : (message && typeof message === 'object')
            ? (message.text ?? message.message ?? message.action ?? message.payload ?? message.data ?? JSON.stringify(message))
            : String(message);

    if (typeof message === "object" && message != null) {
        IPINFO = message;
        console.log(`saved ipinfo ${IPINFO}`);
    }




    console.log('Received', text);
    if (text === "Need IP Info") {
        console.log("Sending info to popup");
        sendResponse(IPINFO);
    }


    if (!blocker) {
        console.warn('Blocker not ready yet');
        sendResponse({ error: 'Blocker not ready' });
        return;
    }

    if (text === 'Disable ad blocking') {
        blocker.disableBlockingInBrowser(browser);
        console.log("Disabled ad blocking");
    } else {
        blocker.enableBlockingInBrowser(browser);
        console.log("Enable ad blocking");
    }
});