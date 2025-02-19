// dev-mocks.js
const testHud = "ui_object";
// const testHud = "ui_animation";
const jsonString = `{"test":["a","b"], "vest":["c","d"]}`
// INFO: Issue with the @ symbol
// const jsonString = `{"test@test@test": ["test1", "test2", "test3" ], "test@test@test3": [ "test_back", "test_front", "test_left", "test_right" ],}`
const mockResponses = {
    initAnims: () => ({ animations: jsonString, }),
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
            { name: "test", objects: [
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
    loadScene: () => ({}),
    getScene: () => ({
        objects: [
            // { handle: 12345, model: "101010", modelName: "test_model", distance: 1.0, },
            // { handle: 999, model: "990099", modelName: "test_model", distance: 123.0, },
        ],
    }),
    saveScene: () => ({}),
    dispatchKeyEvents: () => ({}),
    sendCursorPos: () => ({}),
    playAnim: () => ({}),
    stopAnim: () => ({}),
    gizmoStop: () => ({}),
    spawnPreviewObject: () => ({}),
    removePreviewObject: () => ({}),
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

console.log("Running dev-mocks");

// Expose the function globally so it can be accessed in other scripts
window.getMockResponse = getMockResponse;
window.endpointMute = {
    sendCursorPos: true,
    nearbyObjects: true,
    getScene: true,
    trackObject: true,
    spawnPreviewObject: true,
    removePreviewObject: true,
};

document.body.style.backgroundColor = '#333333';

document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => {
        console.log("[DOC] DOMContentLoaded");
        sendMockEvent('message', {
            type: testHud,
            state: true,
        });

        setTimeout(() => {
            sendMockEvent('message', {
                type: "updateCamera",
                camera: { speed: "0.20" },
            });
        }, 1000);
    }, 100);
});
