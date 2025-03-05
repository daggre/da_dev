function handleMockRequest(endpoint, data) {
    if (!window.endpointMute?.[endpoint]) {
        console.log(`[Mock][NUI Send] ${endpoint}: `, data);
    }

    // Ensure we only wait once for `window.getMockResponse`
    if (!window.mockReadyPromise) {
        window.mockReadyPromise = new Promise((resolve, reject) => {
            const timeout = 2000; // Max wait time
            const interval = 50;
            const startTime = Date.now();

            function checkCondition() {
                if (typeof window.getMockResponse === 'function') {
                    resolve();
                } else if (Date.now() - startTime >= timeout) {
                    reject(new Error('Timed out waiting for mock response setup'));
                } else {
                    setTimeout(checkCondition, interval);
                }
            }

            checkCondition();
        });
    }

    return window.mockReadyPromise
        .then(() => window.getMockResponse(endpoint))
        .catch(error => {
            console.error('Mock response error:', error.message);
            return { error: true, message: error.message };
        });
}

export function sendClientMessage(endpoint, data) {
    /* eslint-disable-next-line no-undef */
    const resourceName =
        typeof GetParentResourceName === 'undefined'
            ? 'mockResource'
            : GetParentResourceName();

    const url = `https://${resourceName}/${endpoint}`;

    if (resourceName === 'mockResource') {
        return handleMockRequest(endpoint, data);
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
                throw new Error('Invalid JSON response received from server');
            });
        })
        .catch(error => {
            console.error(
                'sendClientMessage error:',
                error.message || error.toString(),
                url,
                data
            );
            return { error: true, message: error.message || error.toString() };
        });
}
