let lastErrorMessage = null;

export function sendClientMessage(endpoint, data) {
    const url = `https://${GetParentResourceName()}/${endpoint}`;
    return fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json; charset=UTF-8', },
        body: JSON.stringify(data),
    }).then(response => {
            if (!response.ok) { throw new Error(`Server error: ${response.statusText}`); }
            return response.json();
        }).catch(error => {
            const errorMessage = error.message || error.toString();
            if (errorMessage !== lastErrorMessage) {
                console.error("sendClientPromise error:", errorMessage, url, data);
                lastErrorMessage = errorMessage;
            }
        });
}
