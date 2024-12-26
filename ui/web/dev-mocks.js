// dev-mocks.js
const testHud = "ui_object";
const mockResponses = {
    initAnims: () => ({
        animations: JSON.stringify([
            { "test@test@test": [ "test1", "test2", "test3"]  },
            { "test@test@test3": [ "test_back", "test_front", "test_left", "test_right"]  },
        ]),
    }),
    initAnimFlags: () => ({
        flags: JSON.stringify([
            { name: "Loop", value: 1 },
            { name: "Stop", value: 2 },
        ]),
    }),
    initIKAnimFlags: () => ({
        flags: JSON.stringify([
            { name: "IK_Head", value: 1 },
            { name: "IK_Hand", value: 2 },
        ]),
    }),
    initObjSettings: () => ({
        nearby: JSON.stringify({
            object: true,
            ped: true,
            vehicle: true,
            other: false,
            origin: "camera",
            range: 50,
        }),
        tags: JSON.stringify({
            sort: "dist",
        }),
    }),
    initObjects: () => ({
        peds: JSON.stringify([ "NPC1" ]),
        objects: JSON.stringify([
            "prop_01", "test_prop", "test_fire", "test_tent", "test_02", "prop_02x",
        ]),
        pickups: JSON.stringify([ "Pickup1" ]),
        vehicles: JSON.stringify([ "Vehicle1" ]),
        propsets: JSON.stringify([ "Propset1" ]),
    }),
    initTaskFilters: () => ({
        taskFilters: JSON.stringify([
            "",
            "accessoriesonly_filter",
            "allfingers_and_hand_helpers_filter",
            "allfingers_and_hand_helpers_no_ch_filter",
            "allfingers_and_toes_and_hand_helpers_filter",
        ]),
    }),
    scenesList: () => ({
        scenes: JSON.stringify([
            { name: "default", objects: [], },
            { name: "test_1", objects: [
                {
                    model: 0x3DC6147E,
                    coords_x: -2816.43,
                    coords_y: -697.29,
                    coords_z: 268.31,
                    rotation_pitch: -10.56,
                    rotation_roll: -4.85,
                    rotation_yaw: -0.45,
                    frozen: true,
                    collision: true,
                },
            ]},
        ]),
    }),
    deactivateMode: () => ({}),
    toggleMode: () => ({}),
    deactivateMCP: () => ({}),
    activateMCP: () => ({}),
    selectSpawnObject: () => ({}),
    setObjSettings: () => ({}),
    setNearbyOriginPos: () => ({}),
    nearbyObjects: () => ({ nearbyObjects: [
        {
            handle: 12345,
            model: "101010",
            modelName: "test_model",
            distance: 2.0,
            objType: "object",
        },
        {
            handle: 999,
            model: "990099",
            modelName: "test_model",
            distance: 123.05,
            objType: "object",
        },
    ]}),
    trackObject: () => ({}),
    loadSceneObjects: () => ({}),
    getSceneObjects: () => ({}),
    saveScene: () => ({}),
    sendCursorKey: () => ({}),
    sendCursorPos: () => ({}),
    playAnim: () => ({}),
    stopAnim: () => ({}),
    gizmoStop: () => ({}),
};

function getMockResponse(endpoint) {
    if (mockResponses[endpoint]) {
        if (window.endpointMute && !window.endpointMute[endpoint]) {
            console.log(`[Mock][Client Rx] Returning mock response for '${endpoint}' with data: `, mockResponses[endpoint]());
        }
        return mockResponses[endpoint]();
    }
    throw new Error(`No mock response defined for endpoint '${endpoint}'`);
}

function sendMockEvent(message, data) {
    const e = new MessageEvent(message, { data: data });
    window.dispatchEvent(e);
    console.log(`[Mock][Client Send] Dispatched mock event '${message}' with data: `, data);
}


const themes = {
    da_bluegreen_vibrant: [
        ['primary', '#50c1ee'],
        ['secondary', '#bb73eb'],
        ['tertiary', '#00daaf'],
        ['tertiary-light', '#c2f0e7'],
        ['tertiary-dark', '#00daaf'],
        ['highlight', '#bec6dc'],
        ['bg', '#04101D'],
    ],
    da_bluepurple_light: [
        ['primary', '#aac7ff'],
        ['primary-dark', '#0a305f'],
        ['secondary', '#bec6dc'],
        ['tertiary', '#705575'],
        ['tertiary-light', '#fad8fd'],
        ['tertiary-dark', '#573e5c'],
        ['highlight', '#bec6dc'],
        ['bg', '#04101D'],
    ],
    da_grayscale: [
        ['primary', '#ffffff'],
        ['primary-dark', '#000000'],
        ['secondary', '#aaaaaa'],
        ['tertiary', '#888888'],
        ['tertiary-light', '#ffffff'],
        ['tertiary-dark', '#111111'],
        ['highlight', '#dddddd'],
        ['bg', '#111111'],
    ],
    da_hotdog: [
        ['primary', '#ff0000'],
        ['primary-dark', '#660000'],
        ['secondary', '#ffaaaa'],
        ['tertiary', '#ff0000'],
        ['tertiary-light', '#ff0000'],
        ['tertiary-dark', '#660000'],
        ['highlight', '#ffdddd'],
        ['bg', '#ffff00'],
    ],
};

function setTheme(theme) {
    if (!themes[theme]) {
        console.error(`Theme not found: ${theme}`);
        return;
    }
    const root = document.documentElement;
    const t = themes[theme];

    console.log(t);

    t.forEach(([key, value]) => {
        console.log(`Setting --${key} to ${value}`);
        root.style.setProperty(`--${key}`, value);
        if (key === 'bg') {
            root.style.setProperty('--bg-t1', `${value}AB`);
            root.style.setProperty('--bg-t2', `${value}75`);
            root.style.setProperty('--bg-t3', `${value}22`);
        }
    });
}

console.log("Running dev-mocks");

// Expose the function globally so it can be accessed in other scripts
window.getMockResponse = getMockResponse;
window.endpointMute = {
    sendCursorPos: true,
    nearbyObjects: true,
    getSceneObjects: true,
};

document.body.style.backgroundColor = '#333333';
setTheme('da_bluepurple_light');

document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => {
        console.log("[DOC] DOMContentLoaded");
        sendMockEvent('message', {
            type: testHud,
            state: true,
        });
        sendMockEvent('message', {
            type: "ui_camera",
            state: true,
        });
    }, 100);
});
