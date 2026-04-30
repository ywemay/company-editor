/* Company Editor — API client */

async function apiCall(method, url, body) {
    const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: body ? JSON.stringify(body) : undefined,
    });
    const data = await res.json();
    if (!data.ok) throw new Error(data.error || 'Request failed');
    return data.data;
}

function openSystem(uri) {
    fetch('/api/open-system?uri=' + encodeURIComponent(uri)).catch(function(e) {
        console.error('Failed to open URI:', e);
    });
}

const api = {
    open:           (p) => apiCall('POST', '/api/open', { path: p }),
    save:           (dir, company) => apiCall('POST', '/api/save', { directory: dir, company }),
    openFileDialog: () => apiCall('GET', '/api/open-file'),
    browseDir:      () => apiCall('GET', '/api/browse-directory'),
    health:         () => apiCall('GET', '/api/health'),
};
