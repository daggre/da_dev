import { sendClientMessage } from '../src/msg.js';
import { initUIStyle } from '../src/theme.js';

// Centralized settings object
export let Settings = {
    nearby: {
        range: 50,
        ped: true,
        other: false,
        object: true,
        vehicle: true,
        origin: 'camera',
    },
    spawn: {
        object: [],
        ped: [],
        vehicle: [],
        propset: [],
        pickup: [],
    },
    tag: { sort: 'dist' },
    theme: {
        color: 'cherry_blossom',
        divider: 'angle up',
        border: true,
        borderrad: false,
        borderradamount: 8,
    },
    form: {
        evaluateformon: "any",
    },
    objFavorites: new Set(),
};

// Generic function to fetch settings from the client
export async function fetchSettings() {
    const response = await sendClientMessage(`fetchSettings`, Object.keys(Settings));
    for (const [key, value] of Object.entries(response)) {
        let parsed = JSON.parse(value);
        if (key === 'objFavorites') {
            parsed = new Set(parsed);
        }
        Settings[key] = parsed;
    }
}

// Fetch spawn data dynamically
export async function fetchSpawnData() {
    const response = await sendClientMessage('fetchObjects', {});
    Object.keys(Settings.spawn).forEach(key => {
        Settings.spawn[key] = JSON.parse(response[key]);
    });
}

// Apply settings dynamically
export async function initSettings() {
    await fetchSettings();
    updateUI();
    initUIStyle(
        Settings.theme.color,
        Settings.theme.divider,
        Settings.theme.border,
        Settings.theme.borderrad,
        Settings.theme.borderradamount
    );
}

// Dynamically update UI elements
function updateUI() {
    for (const [key, value] of Object.entries(Settings.nearby)) {
        const button = document.getElementById(`button-nearby-${key}`);
        if (button) button.classList.toggle('selected', value);
    }

    const originButton = document.getElementById(`button-nearbyOrigin-${formatId(Settings.nearby.origin)}`);
    if (originButton) originButton.classList.add('selected');

    document.getElementById('nearbyRange').textContent = Settings.nearby.range;
    document.getElementById('activeNearbyOrigin').textContent = Settings.nearby.origin;
    document.getElementById(`button-tagsortby${Settings.tag.sort}`).classList.add('selected');
    document.getElementById('objSettingsSubmitFormEvent').textContent = Settings.form.evaluateformon;
}

function formatId(str) {
    return str.replace(/ /g, '-');
}
