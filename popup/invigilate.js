function qs(id) { return document.getElementById(id); }

const btn = qs('observatory-btn');
const statusEl = qs('obs-status');
const resultEl = qs('obs-result');
const badgeEl = qs('grade-badge');

function setStatus(text) {
    statusEl.textContent = text;
}

function showResult(obj) {
    try {
        resultEl.textContent = JSON.stringify(obj, null, 2);
    } catch (e) {
        resultEl.textContent = String(obj);
    }
}

function clearBadge() {
    if (!badgeEl) return;
    badgeEl.className = 'unknown';
    badgeEl.textContent = '';
}

function setBadge(letter) {
    if (!badgeEl) return;
    const L = (letter || '').toString().trim().toUpperCase();
    // normalize to A..F
    const valid = ['A', 'B', 'C', 'D', 'F'];
    if (!valid.includes(L)) {
        badgeEl.className = 'unknown';
        badgeEl.textContent = L || '?';
        return;
    }
    badgeEl.className = 'grade-' + L;
    badgeEl.textContent = L;
}

function gradeFromResult(results) {
    if (!results) return null;
    // Try explicit grade string first
    const g = findFirst(results, ['grade', 'overall_grade']);
    if (typeof g === 'string' && g.trim().length > 0) {
        const letter = g.trim().toUpperCase().charAt(0);
        if (['A', 'B', 'C', 'D', 'F'].includes(letter)) return letter;
    }
    // Try numeric scores
    const score = findFirst(results, ['score', 'security_score', 'score_adjusted']);
    if (typeof score === 'number') {
        if (score >= 90) return 'A';
        if (score >= 80) return 'B';
        if (score >= 70) return 'C';
        if (score >= 60) return 'D';
        return 'F';
    }
    const scoreN = Number(score);
    if (!Number.isNaN(scoreN)) {
        if (scoreN >= 90) return 'A';
        if (scoreN >= 80) return 'B';
        if (scoreN >= 70) return 'C';
        if (scoreN >= 60) return 'D';
        return 'F';
    }
    return null;
}

function findFirst(obj, keys) {
    if (!obj || typeof obj !== 'object') return undefined;
    for (const k of Object.keys(obj)) {
        if (keys.includes(k)) return obj[k];
        const v = obj[k];
        if (typeof v === 'object') {
            const found = findFirst(v, keys);
            if (found !== undefined) return found;
        }
    }
    return undefined;
}

async function fetchJson(url, opts) {
    const res = await fetch(url, opts);
    if (!res.ok) throw new Error('Network error: ' + res.status);
    return res.json();
}

async function runObservatoryForHost(host) {
    setStatus('Requesting analysis for ' + host + '...');
    showResult('');
    clearBadge();
    try {
        const analyzeUrl = 'https://http-observatory.security.mozilla.org/api/v1/analyze?host=' + encodeURIComponent(host);
        const analyzeResp = await fetchJson(analyzeUrl);

        // If API returns a scan id use it, otherwise try to find useful identifiers
        const scanId = analyzeResp.scan_id || analyzeResp.scan || analyzeResp.id || findFirst(analyzeResp, ['scan_id', 'scan', 'id']);
        const state = analyzeResp.state || findFirst(analyzeResp, ['state', 'status']);

        if (state && state.toUpperCase && state.toUpperCase() === 'FINISHED' && scanId) {
            setStatus('Scan finished — fetching results...');
            const results = await fetchJson('https://http-observatory.security.mozilla.org/api/v1/getScanResults?scan=' + encodeURIComponent(scanId));
            setStatus('Scan complete');
            showResult(results);
            const letter = gradeFromResult(results);
            if (letter) setBadge(letter);
            return { scanId, results };
        }

        // Poll for results using scanId if available
        if (!scanId) {
            // No scan id; show the analyze response and stop
            setStatus('Analyze started (no scan id returned) — raw response:');
            showResult(analyzeResp);
            return { scanId: null, results: analyzeResp };
        }

        setStatus('Scan started (id=' + scanId + '). Polling for completion...');

        const maxAttempts = 20;
        const delayMs = 3000;
        for (let attempt = 0; attempt < maxAttempts; attempt++) {
            await new Promise(r => setTimeout(r, delayMs));
            setStatus('Polling for results (attempt ' + (attempt + 1) + '/' + maxAttempts + ')...');
            try {
                const poll = await fetchJson('https://http-observatory.security.mozilla.org/api/v1/getScanResults?scan=' + encodeURIComponent(scanId));
                // try to detect completion
                const grade = findFirst(poll, ['grade', 'score', 'score_adjusted']);
                if (grade !== undefined) {
                    setStatus('Scan complete');
                    showResult(poll);
                    const letter = gradeFromResult(poll);
                    if (letter) setBadge(letter);
                    return { scanId, results: poll };
                }
                // Some APIs return an object with a 'state' property
                const pollState = poll.state || findFirst(poll, ['state', 'status']);
                if (pollState && pollState.toUpperCase && pollState.toUpperCase() === 'FINISHED') {
                    setStatus('Scan complete');
                    showResult(poll);
                    return { scanId, results: poll };
                }
            } catch (err) {
                console.warn('Polling error', err);
            }
        }

        setStatus('Timed out waiting for scan results. Showing last-known response:');
        const last = await fetchJson('https://http-observatory.security.mozilla.org/api/v1/getScanResults?scan=' + encodeURIComponent(scanId));
        showResult(last);
        const letter = gradeFromResult(last);
        if (letter) setBadge(letter);
        return { scanId, results: last };
    } catch (err) {
        setStatus('Error: ' + err.message);
        showResult(err.stack || String(err));
        throw err;
    }
}

btn && btn.addEventListener('click', () => {
    btn.disabled = true;
    setStatus('Locating active tab...');
    // Get the active tab's URL
    try {
        chrome.tabs.query({ active: true, currentWindow: true }, async (tabs) => {
            if (!tabs || !tabs[0] || !tabs[0].url) {
                setStatus('Could not determine current tab URL');
                btn.disabled = false;
                return;
            }
            const urlStr = tabs[0].url;
            let host;
            try {
                host = new URL(urlStr).hostname;
            } catch (e) {
                setStatus('Invalid URL: ' + urlStr);
                btn.disabled = false;
                return;
            }

            try {
                const { scanId, results } = await runObservatoryForHost(host);
                if (scanId) {
                    const link = document.createElement('a');
                    link.href = 'https://http-observatory.security.mozilla.org/scan/' + encodeURIComponent(scanId);
                    link.target = '_blank';
                    link.textContent = 'Open full report';
                    // append link after status
                    statusEl.appendChild(document.createElement('br'));
                    statusEl.appendChild(link);
                }
            } catch (err) {
                // already handled in runObservatoryForHost
            } finally {
                btn.disabled = false;
            }
        });
    } catch (err) {
        setStatus('Error fetching tab: ' + err.message);
        btn.disabled = false;
    }
});

// optional: wire report-unsafe button to open a new issue or mailto (placeholder)
const reportBtn = qs('report-unsafe');
if (reportBtn) {
    reportBtn.addEventListener('click', () => {
        const mail = 'mailto:security@example.org?subject=Report%20unsafe%20site&body=I%20found%20an%20unsafe%20site%20at%20' + encodeURIComponent(location.href || '');
        window.open(mail, '_blank');
    });
}

