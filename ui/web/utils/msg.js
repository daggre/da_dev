let lastErrorMessage = null;

export function sendClientMessage(endpoint, data) {
    const resourceName = typeof GetParentResourceName === "undefined"
        ? "mockResource"
        : GetParentResourceName();

    const url = `https://${resourceName}/${endpoint}`;

    // Development mock response
    if (typeof GetParentResourceName === "undefined" && typeof window.getMockResponse === "function") {
        if (!window.endpointMute[endpoint]) {
            console.log(`[Mock][NUI Send] sendClientMessage called to ${url} with data:`, data);
        }
        try {
            const mockResponse = window.getMockResponse(endpoint);
            return Promise.resolve(mockResponse);
        } catch (error) {
            return Promise.reject(error);
        }
    }

    // Production logic for RedM
    return fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json; charset=UTF-8' },
        body: JSON.stringify(data),
    })
    .then(response => {
        if (!response.ok) {
            throw new Error(`Server error: ${response.statusText}`);
        }
        return response.json().catch(() => {
            throw new Error("Invalid JSON response received from server");
        });
    })
    .catch(error => {
        console.error("sendClientMessage error:", error.message || error.toString(), url, data);
        return { error: true, message: error.message || error.toString() };
    });
}
