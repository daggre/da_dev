import { clipboardCopy } from "./utils/clipboard.js";
import { sendClientMessage } from "./utils/msg.js";
import {
    selectOnly,
    elementSetOnlyClass,
    elementSetClass,
    elementHasClass,
    elementSetText,
    isSelected,
    isVisible,
} from "./utils/nav.js";
import { initTrie } from "./components/trie.js";
import {
    initObj,
    initializeObjectHUD,
    getTrackedObjects,
    getScenes,
    getSceneObjects,
    toggleNearbyFilter,
    tagSelectSort,
    selectSpawnType,
    selectNearbyOrigin,
    toggleObjectHUD,
    toggleObjectSpawnHUD,
    toggleObjectNearbyHUD,
    toggleObjectImportExportHUD,
} from "./components/obj.js";
import {
    initAnims,
    playAnimation,
    togglePlay,
    toggleStop,
    toggleLoop,
    toggleTorso,
    toggleFlag,
    toggleIKFlag
} from "./components/anims.js";

const CursorUpdateRate = 30;
var MCP = false;
var GizmoActive = false;
var KeyPressRepeat = false;
var LeftClickActive = false;
var CursorPosDelay = false;
const ResolutionX = window.screen.width;
const ResolutionY = window.screen.height;
export var MouseDown = false;

var Pressed = {}
var JustPressed = {}
var QuickPress = { Timeout: 400, MiddleMouse: { active: false, }, }

const KeyTranslateMap = {
    '&': '1',
    'é': '2',
    '"': '3',
    '\'': '4',
};

export var KeyActions = {
    'devTreeHUD': {},
    'animHUD': {
        'escape': () => {
            elementSetClass('animHUD', 'hidden', true);
            sendClientMessage('deactivateMode', { mode: "animation" });
        },
        'backspace': () => { toggleStop(); },
        ' ': () => { togglePlay(); },
        '?': () => { toggleHelp("animHelp"); },
        '1': () => { toggleSearch(); },
        '2': () => { toggleTimings(); },
        '3': () => { toggleIKFlags(); },
        '4': () => { toggleFlags(); },
        '5': () => { toggleTaskFilters(); },
        '6': () => { toggleEntity(); },
        'c': () => { toggleSettings(); },
        'h': () => { toggleHelp("animHelp"); },
        'i': () => { toggleIKFlags(); },
        'l': () => { toggleLoop(); },
        'o': () => { toggleFlags(); },
        'p': () => { togglePlay(); },
        'q': () => { togglePlay(); },
        'r': () => { togglePlay(); },
        't': () => { toggleTimings(); },
        'u': () => { toggleTorso(); },
        'x': () => {},
    },
    'gizmo': {
        'escape': () => { sendClientMessage('deactivateMode', { mode: "gizmo"}); },
    },
    'objectHUD': {
        'escape': () => {},
        '1': () => { toggleObjectSpawnHUD(); },
        '2': () => { toggleObjectNearbyHUD(); },
        '3': () => { toggleObjectImportExportHUD(); },
        '?': () => { toggleHelp("objHelp"); },
        'h': () => { toggleHelp("objHelp"); },
        'escape': () => {
            sendClientMessage('deactivateMode', { mode: "object" });
        },
    },
    'cameraHUD': {
        'escape': () => {
            toggleHelp("camHelp", false);
            sendClientMessage('deactivateMode', { mode: "freecam" });
            sendClientMessage('deactivateMode', { mode: "noclip" });
        },
        '?': () => { toggleHelp('camHelp', false); },
        'h': () => { toggleHelp('camHelp', false); },
    },
}

export const EventActions = {
    click: {
        '#button-spawn': () => toggleObjectSpawnHUD(true),
        '#button-trackedobjlist': () => toggleObjectNearbyHUD(true),
        '#button-importexport': () => toggleObjectImportExportHUD(true),

        '#button-objDetailsPosition': () => toggleObjectDetail('button-objDetailsPosition'),
        '#button-objDetailsStatus': () => toggleObjectDetail('button-objDetailsStatus'),

        '#button-spawnfavs': toggleObjectFavsSpawn,
        '#button-spawnobjects': () => selectSpawnType('objects'),
        '#button-spawnpeds': () => selectSpawnType('peds'),
        '#button-spawnvehicles': () => selectSpawnType('vehicles'),
        '#button-spawnpropsets': () => selectSpawnType('propsets'),
        '#button-spawnpickups': () => selectSpawnType('pickups'),
        '#button-spawnother': () => selectSpawnType('other'),

        '#button-nearbyOrigin-camera': () => selectNearbyOrigin('camera'),
        '#button-nearbyOrigin-offset': () => selectNearbyOrigin('offset'),
        '#button-nearbyOrigin-player': () => selectNearbyOrigin('player'),
        '#button-nearbyOrigin-raycast': () => selectNearbyOrigin('raycast'),
        '#button-nearbyOrigin-set-position': () => selectNearbyOrigin('set position'),
        '#button-nearbyOrigin-select': () => selectNearbyOrigin('select'),

        '#button-nearby-object': () => toggleNearbyFilter('object'),
        '#button-nearby-ped': () => toggleNearbyFilter('ped'),
        '#button-nearby-vehicle': () => toggleNearbyFilter('vehicle'),
        // '#button-nearby-propset': () => toggleNearbyFilter('propset'),
        '#button-nearby-other': () => toggleNearbyFilter('other'),

        '#button-tagsortbydistance': () => tagSelectSort('dist'),
        '#button-tagsortbyname': () => tagSelectSort('name'),

        '#button-search': toggleSearch,
        '#button-timings': toggleTimings,
        '#button-flags': toggleFlags,
        '#button-ikflags': toggleIKFlags,
        '#button-taskFilters': toggleTaskFilters,
        '#button-entity': toggleEntity,
        '#button-settings': toggleSettings,
        '#button-play': togglePlay,
        '#button-stop': toggleStop,
        '#button-loop': toggleLoop,
        '#button-torso': toggleTorso,
    },
    input: {
        "#objSearch": (value) => searchObjects(value),
        "#animSearch": (value) => searchAnimations(value),
    },
    mousemove: (event) => {
        if (!CursorPosDelay && !MCP && !GizmoActive &&
                isVisible('objectHUD') &&
                !document.activeElement.classList.contains('entryField')) {
            CursorPosDelay = true;
            sendClientMessage('sendCursorPos', {
                x: event.clientX/ResolutionX,
                y: event.clientY/ResolutionY,
                click: LeftClickActive,
            });
            setTimeout(function() { CursorPosDelay = false; }, CursorUpdateRate);
        }
    },
    mousedown: (event) => {
        MouseDown = true;
        switch(event.button) {
            case 0: // Left Click
                LeftClickActive = true;
                break;
        }
        if (isVisible('devTreeHUD')) {
        } else if (isVisible('animHUD')) {
            switch(event.button) {
                case 0: // Left Click
                    if (event.target.id == "activeAnimDict" || event.target.id == "activeAnimName") {
                        if (event.target.innerHTML != "") {
                            clipboardCopy(event.target.innerHTML);
                        }
                    }
                    break;
                case 1: // Middle Click
                    if (MCP) {
                        sendClientMessage('deactivateMCP', {});
                        toggleMCP(false);
                        break;
                    }
                    QuickPress.MiddleMouse.active = true;
                    setTimeout(function() { QuickPress.MiddleMouse.active = false; }, QuickPress.Timeout);
                    sendClientMessage('activateMCP', { mode: "animation" });
                    toggleMCP(true);
                    break;
            }
        } else if (isVisible('objectHUD')) {
            if (GizmoActive) {
                switch(event.button) {
                    case 1: // Middle Click
                        QuickPress.MiddleMouse.active = true;
                        setTimeout(function() { QuickPress.MiddleMouse.active = false; }, QuickPress.Timeout);
                        // if (GizmoActivePassthrough) {
                        //     // sendClientMessage('deactivateMCP', {});
                        //     GizmoActivePassthrough = false
                        // } else {
                        //     sendClientMessage('activateMCP', { mode: "gizmo" });
                        //     GizmoActivePassthrough = true
                        // }
                        sendClientMessage('activateMCP', { mode: "gizmo" });
                        toggleMCP(true);
                        break;
                }
            } else {
                switch(event.button) {
                    case 0: // Left Click
                        // Modify this for objectHUD
                        if (event.target.id == "activeAnimDict" || event.target.id == "activeAnimName") {
                            if (event.target.innerHTML != "") {
                                clipboardCopy(event.target.innerHTML);
                            }
                        }
                        if (!MCP) {
                            // Get the target element that was clicked, and check if we should block the event
                            const target = event.target;
                            const isInterruptingElement = target.classList.contains('entryLabel') ||
                                target.classList.contains('entryField') ||
                                target.classList.contains('control') ||
                                target.closest('.entryLabel') ||
                                target.closest('.entryField') ||
                                target.closest('.control');

                            // Stop further processing if the clicked element matches any target class
                            if (isInterruptingElement) {
                                // console.log("Clicked on a HUD element, skipping game logic.");
                                event.stopPropagation(); // Prevent event from bubbling up further if necessary
                                return; // Short-circuit the game logic
                            }
                            sendClientMessage('sendCursorKey', { justPressed: { MouseLeft: true, } });
                        }
                        break;
                    case 1: // Middle Click
                        if (MCP) {
                            sendClientMessage('deactivateMCP', {});
                            toggleMCP(true);
                            break;
                        }
                        QuickPress.MiddleMouse.active = true;
                        setTimeout(function() { QuickPress.MiddleMouse.active = false; }, QuickPress.Timeout);
                        sendClientMessage('activateMCP', { mode: "object" });
                        toggleMCP(true);
                        break;
                }
            }
        }
    },
    mouseup: (event) => {
        MouseDown = false;
        switch(event.button) {
            case 0: // Left Click
                LeftClickActive = false;
                break;
        }
        if (isVisible('animHUD')) {
            switch(event.button) {
                case 1: // Middle Click
                    if (!QuickPress.MiddleMouse.active) {
                        sendClientMessage('deactivateMCP', {});
                        toggleMCP(false);
                    }
                    break;
            }
        }
        if (isVisible('objectHUD')) {
            switch(event.button) {
                case 1: // Middle Click
                    if (!QuickPress.MiddleMouse.active) {
                        sendClientMessage('deactivateMCP', {});
                        toggleMCP(false);
                    }
                    break;
            }
        }
    },
    keyup: (event) => {
        JustPressed[event.key] = false;
        Pressed[event.key] = false;
    },
    keydown: (event) => {
        if (MCP) { return; }
        if (event.key != "Escape" && event.target.getAttribute('contenteditable') == "true") {
            return;
        }

        JustPressed[event.key] = true;
        Pressed[event.key] = true;
        handleKeyPress(event.key, getCurrentHUD());
        event.preventDefault();
        JustPressed[event.key] = false;
    },
};

export function registerListeners() {
    Object.keys(EventActions).forEach((eventType) => {
        document.body.addEventListener(eventType, (event) => {
            const eventActions = EventActions[eventType];

            // Check if eventActions is a function
            if (typeof eventActions === "function") {
                eventActions(event); // Call the standalone function directly
                return;
            }

            // If eventActions is a list of selectors
            Object.keys(eventActions).forEach((selector) => {
                if (event.target.matches(selector)) {
                    const action = eventActions[selector];
                    action.length ? action(event.target.value) : action();
                }
            });
        });
    });
}

function toUint32(value) { return value >>> 0; }

function getCurrentHUD() {
    // TODO: cache in appState, dont always query DOM
    const huds = document.querySelectorAll(".hud");
    for (let hud of huds) {
        if (!elementHasClass(hud, 'hidden')) {
            return hud.id;
        }
    }
    return null;
}

export function resetListGroup(element, display) {
    var el = document.getElementById(element);
    el.style.display = display;
    el.innerHTML = "";
    el.scrollTop = 0;
    el.scrollLeft = -1000;
}

function updateUI(data) {
    switch(data.mode) {
        case "trie":
            if (data.trie) { initTrie(data.trie); }
            elementSetClass('devTreeHUD', 'hidden', data.state == false);
            break;
        case "animation":
            setUIAnim(data.state);
            break;
        case "object":
            initializeObjectHUD();
            toggleObjectHUD(data.state);
            break;
        case "camera":
            elementSetClass('cameraHUD', 'hidden', !data.state);
            if (data.camera) {
                elementSetText('cam-speed', data.camera.speed);
                elementSetText('cam-mode', data.camera.cameraMode);
                elementSetText('cam-noclip', data.camera.noclip);
            }
            break;
    }
}

window.onload = function() {
    registerListeners();
    initAnims();
    initObj();

    window.addEventListener('message', function(msg) {
        switch(msg.data.type) {
            case "ui":
                updateUI(msg.data);
                break;
            case "update":
                updateCrosshair(msg.data);
                updateObjectDetails(msg.data);
                break;
            case "clipboard":
                clipboardCopy(msg.data.text);
                break;
            case "mcp":
                toggleMCP(msg.data.active);
                break;
            case "setGizmoState":
                GizmoActive = msg.data.data.shown
                break;
            case "toggleHelp":
                toggleHelp(msg.data.mode, msg.data.state, msg.data.toggleCursor);
                break;
            case "keyPress":
                if (msg.data.mode == "object") {
                    ObjectKeys(msg.data.key);
                    break;
                }
        }
    })
}

function handleKeyPress(rawKey, hud) {
    if (!hud) { return; }
    console.log("handleKeyPress:", rawKey, hud);
    const lowercaseKey = rawKey.toLowerCase();
    const key = KeyTranslateMap[lowercaseKey] || lowercaseKey;
    const action = KeyActions[hud][key] || KeyActions[hud].default;
    if (action) { action(key); }
}

// Help HUD //
function toggleHelp(elementId, state) {
    if (state === undefined) { state = !isVisible(elementId); }
    const helpDisabled = elementSetClass(elementId, 'hidden', !state);
    if (elementId == "objHelp") { toggleCrosshair(helpDisabled); }
}

function toggleMCP(state) {
    MCP = state;
    toggleCrosshair(state);
}

function toggleCrosshair(state) {
    elementSetClass('crosshair', 'hidden', !state || !MCP);
}

const AnimElements = [
    'animControlOptions',
    'activeAnimDisplay',
    'animSearchLists',
];

const AnimSubElements = [
    'animDictList',
    'animList',
    'animSearchField',
    'animTimingsOptions',
    'animFlagsOptions',
    'animIKFlagsOptions',
    'animEntityOptions',
]

// Animation HUD //
function setUIAnim(state) {
    state = !!state;
    console.log("setUIAnim", state);
    AnimSubElements.forEach((el) => { elementSetClass(el, 'hidden', true); });
    AnimElements.forEach((el) => { elementSetClass(el, 'hidden', !state); });
    console.log("Setting anim hud visible", state);
    elementSetClass('animHUD', 'hidden', state);
}

function toggleSettings(state) {
    const selected = elementSetClass('button-settings', 'selected', state);
    elementSetClass('animSettings', 'hidden', selected);
}

const AnimSearchElements = [
    'animSearchField',
    'animDictList',
    'animList',
];

function toggleSearch(state) {
    if (elementSetClass('button-search', 'selected', state)) {
        toggleSettings(true);
        toggleTimings(false);
        toggleFlags(false);
        toggleIKFlags(false);
        toggleTaskFilters(false);
        toggleEntity(false);
        toggleHelp("animHelp", false)

        AnimSearchElements.forEach((el) => { elementSetClass(el, 'hidden', false) });
        document.getElementById('button-search').focus();
        document.getElementById('animDictList').scrollLeft = -1000;
        document.getElementById('animList').scrollLeft = -1000;
    } else {
        AnimSearchElements.forEach((el) => { elementSetClass(el, 'hidden', true) });
        document.getElementById('valueAnimSearch').blur();
    }
}

function toggleTimings(state) {
    if (elementSetClass('button-timings', 'selected', state)) {
        toggleSettings(true);
        toggleSearch(false);
        toggleFlags(false);
        toggleIKFlags(false);
        toggleTaskFilters(false);
        toggleEntity(false);
        toggleHelp("animHelp", false)

        elementSetClass('animTimingsOptions', 'hidden', false);
        document.getElementById('button-timings').focus();
    } else {
        elementSetClass('animTimingsOptions', 'hidden', true);
        if (document.activeElement.classList.contains('entryField')) {
            document.activeElement.blur();
        }
    }
}

function toggleFlags(state) {
    if (elementSetClass('button-flags', 'selected', state)) {
        toggleSettings(true);
        toggleSearch(false);
        toggleTimings(false);
        toggleIKFlags(false);
        toggleTaskFilters(false);
        toggleEntity(false);
        toggleHelp("animHelp", false)
        document.getElementById('button-flags').focus();
        elementSetClass('animFlagsOptions', 'hidden', false);
    } else {
        elementSetClass('animFlagsOptions', 'hidden', true);
        if (document.activeElement.classList.contains('entryField')) {
            document.activeElement.blur();
        }
    }
}

function toggleIKFlags(state) {
    if (elementSetClass('button-ikflags', 'selected', state)) {
        toggleSettings(true);
        toggleSearch(false);
        toggleTimings(false);
        toggleFlags(false);
        toggleTaskFilters(false);
        toggleEntity(false);
        toggleHelp("animHelp", false)
        document.getElementById('button-ikflags').focus();
        elementSetClass('animIKFlagsOptions', 'hidden', false);
    } else {
        elementSetClass('animIKFlagsOptions', 'hidden', true);
        if (document.activeElement.classList.contains('entryField')) {
            document.activeElement.blur();
        }
    }
}

function toggleTaskFilters(state) {
    if (elementSetClass('button-taskFilters', 'selected', state)) {
        toggleSettings(true);
        toggleSearch(false);
        toggleTimings(false);
        toggleFlags(false);
        toggleIKFlags(false);
        toggleEntity(false);
        toggleHelp("animHelp", false)
        document.getElementById('button-taskFilters').focus();
        elementSetClass('animTaskFilterOptions', 'hidden', false);
    } else {
        elementSetClass('animTaskFilterOptions', 'hidden', true);
    }
}

function toggleEntity(state) {
    if (elementSetClass('button-entity', 'selected', state)) {
        toggleSettings(true);
        toggleSearch(false);
        toggleTimings(false);
        toggleFlags(false);
        toggleIKFlags(false);
        toggleTaskFilters(false);
        toggleHelp("animHelp", false)
        document.getElementById('button-entity').focus();
        elementSetClass('animEntityOptions', 'hidden', false);
    } else {
        elementSetClass('animEntityOptions', 'hidden', true);
    }
}

function setUITrie(data) {
    if (data.trie) { initTrie(data.trie); }
    elementSetClass('devTreeHUD', 'hidden', data.state == false);
}

function updateUICam(data) {
    elementSetText('cam-speed', data.speed);
    elementSetText('cam-mode', data.cameraMode);
    elementSetText('cam-noclip', data.noclip);
}

function setUIObj(state) {
    initializeObjectHUD();
    toggleObjectHUD(state);
}

const crosshairElement = document.getElementById("crosshair");
const CrosshairTypes = new Map([
    ["hover", "active"],
    ["select", "selected"],
    ["none", "inactive"],
]);

const CrosshairClasses = [...CrosshairTypes.values()];

function updateCrosshair(data) {
    // Find the first matching crosshair class, default to "inactive"
    const selectedClass = [...CrosshairTypes].find(([key]) => data[key])?.[1] || "inactive";
    elementSetOnlyClass(crosshairElement, selectedClass, CrosshairClasses);
}

function toggleObjectFavsSpawn(state) {
    elementSetClass('button-spawnfavs', 'selected', state);
}

const ObjectDetailsFieldElements = [
    'objDetails',
    'objDetailsOptions',
    'objDetailsList',
    'objDetailsListPosition',
    'objDetailsListStatus',
];

const ObjectDetailsCategoryMap = new Map([
    ['button-objDetailsPosition', 'objDetailsListPosition'],
    ['button-objDetailsStatus', 'objDetailsListStatus'],
]);

function toggleObjectDetail(el, state) {
    elementSetClass(el, 'selected', state);
    const listEl = ObjectDetailsCategoryMap.get(el);
    elementSetClass(listEl, 'hidden', !state);
}

const ObjectDetailsFields = new Map([
    ["objDetailsEntityHandle", "handle"],
    ["objDetailsEntityNetworkId", "networkID"],
    // ["objDetailsEntityModelHash", "modelHash"],
    ["objDetailsEntityModelName", "modelName"],
    ["objDetailsEntityPosX", "coords_x"],
    ["objDetailsEntityPosY", "coords_y"],
    ["objDetailsEntityPosZ", "coords_z"],
    ["objDetailsEntityRotPitch", "rotation_pitch"],
    ["objDetailsEntityRotRoll", "rotation_roll"],
    ["objDetailsEntityRotYaw", "rotation_yaw"],
]);

const ObjectDetailsOptions = new Map([
    ["objDetailsEntityFrozen", "frozen"],
    ["objDetailsEntityCollision", "collision"],

]);

function clearObjectDetails() {
    ObjectDetailsFields.forEach((value, key) => { elementSetText(key, ""); });
    ObjectDetailsOptions.forEach((value, key) => { elementSetText(key, ""); });
}

function updateObjectDetails(data) {
    if (!data.select) {
        clearObjectDetails();
        return;
    }

    ObjectDetailsFields.forEach((value, key) => {
        elementSetText(key, data.selectData[value]);
    });
    ObjectDetailsOptions.forEach((value, key) => {
        elementSetClass(key, "selected", data.selectData[value]);
    });
}


// DEPRECATE BELOW //

function ObjectKeys(key, event) {
    if (event) {
        switch(key) {
            case "Escape":
                var escaped = false;
                event.preventDefault();
                if (document.activeElement.classList.contains('entryField')) {
                    document.activeElement.blur();
                    return;
                }
                if (isVisible('objHelp')) {
                    toggleHelp("objHelp", false, true);
                    escaped = true;
                    return;
                }
                if (isVisible('objSpawnOptions')) {
                    toggleObjectSpawnHUD(false);
                    escaped = true;
                    return;
                }
                if (isVisible('objNearbyOrigin')) {
                    toggleObjectNearbyHUD(false);
                    escaped = true;
                    return;
                }
                if (isVisible('objScenesList')) {
                    toggleImportExport(false);
                    escaped = true;
                    return;
                }
                // if (isVisible('objControlSpawnOptions')) {
                //     document.getElementById('objControlSpawnOptions').style.display = "none";
                //     escaped = true;
                //     return;
                // }
                // if (isVisible('objSceneOptions')) {
                //     document.getElementById('objSceneOptions').style.display = "none";
                //     escaped = true;
                // }
                if (escaped) { return; }

                sendClientMessage('deactivateMode', { mode: "object" });
                toggleObjectHUD(false);
                return;
            case " ":
                if (typeof event.target.onclick == "function") {
                    event.target.onclick.apply();
                    event.preventDefault();
                }
                return;
            case "1":
                // var focusButton = false;
                // if (isVisible('objSearchField')) {
                //     document.getElementById('objSearch').focus();
                //     event.preventDefault();
                //     return;
                // } else {
                //     focusButton = true;
                // }
                console.log("toggleObjectSpawn client keypress");
                toggleObjectSpawnHUD();
                // if (focusButton) {
                //     document.getElementById('button-spawn').focus();
                // }
                return;
            case "2":
                var focusButton = false;
                if (isVisible('objNearbyRange')) {
                    document.getElementById('nearbyRange').focus();
                    event.preventDefault();
                    return;
                } else {
                    focusButton = true;
                }
                toggleObjectNearbyHUD(true);
                if (focusButton) {
                    document.getElementById('button-trackedobjlist').focus();
                }
                return;
            case "3":
                toggleObjectImportExportHUD();
                return;
        }
    }
    switch(key) {
        case "Escape":
            var escaped = false;
            if (document.activeElement.classList.contains('entryField')) {
                document.activeElement.blur();
                return;
            }
            if (isVisible('objHelp')) {
                toggleHelp("objHelp", false, true);
                escaped = true;
                return;
            }
            if (isVisible('objSpawnOptions')) {
                toggleObjectSpawnHUD(false);
                escaped = true;
                return;
            }
            if (isVisible('objNearbyOrigin')) {
                toggleObjectNearbyHUD(false);
                escaped = true;
                return;
            }
            if (isVisible('objScenesList')) {
                toggleObjectImportExportHUD(false);
                escaped = true;
                return;
            }
            // if (isVisible('objControlSpawnOptions')) {
            //     document.getElementById('objControlSpawnOptions').style.display = "none";
            //     escaped = true;
            //     return;
            // }
            // if (isVisible('objSceneOptions')) {
            //     document.getElementById('objSceneOptions').style.display = "none";
            //     escaped = true;
            // }
            if (escaped) { return; }

            sendClientMessage('deactivateMode', { mode: "object" });
            toggleObjectHUD(false);
            return;
        // case "c":
        //     if (!document.activeElement.classList.contains('entryField') && !MCP) {
        //         sendClientMessage('activateMCP', { mode: "object" });
        //         sendClientMessage('activateMCP', { mode: "gizmo" });
        //     }
        //     return;
        case "f":
            if (!document.activeElement.classList.contains('entryField') && !MCP) {
                sendClientMessage('sendCursorKey', {
                    pressed: Pressed,
                    justPressed: JustPressed
                });
            }
            return;
        case "!":
        case "1":
            console.log("toggleObjectSpawnHUD ObjectKeys");
            toggleObjectSpawnHUD();
            // document.getElementById('button-spawn').focus();
            return;
        case "2":
            toggleObjectNearbyHUD();
            document.getElementById('button-trackedobjlist').focus();
            return;
        case "3":
            toggleObjectImportExportHUD();
            document.getElementById('button-importexport').focus();
            return;
        case "Backspace":
            sendClientMessage('deactivateMode', { mode: "object" });
            return;
        case "?":
        case "h":
            toggleHelp("objHelp", NULL, true)
            return;
        case "r":
            sendClientMessage('sendCursorKey', {
                pressed: Pressed,
                justPressed: JustPressed
            });
            return;
        case "x":
            elementSetText('activeObject', "");
            if (isVisible('objSearchField')) {
                elementSetText('objSearch', "");
                resetListGroup("objData", "flex");
            } else if (isVisible('objDetails')) {
                sendClientMessage('sendCursorKey', { justPressed: { x: true, } });
            }
            return;
    }
}

// Object Keys //
function HandleKeysObject(event) {
    if (GizmoActive) {
        switch(event.key) {
            case "Escape":
                event.preventDefault();
                sendClientMessage('modifyMody', { mode: "gizmo", stop: true, })
                return;
        }
    } else {
        ObjectKeys(event.key, event);
    }
}

function HandleKeysAnim(event) {
    switch(event.key) {
        case "Escape":
            var escaped = false;
            if (isVisible('animHelp')) {
                toggleHelp("animHelp", false)
                return;
            }
            if (isVisible('animSearchField')) {
                toggleSearch(false);
                escaped = true;
            }
            if (isVisible('animTimingsOptions')) {
                toggleTimings(false);
                escaped = true;
            }
            if (isVisible('animFlagsOptions')) {
                toggleFlags(false);
                escaped = true;
            }
            if (isVisible('animIKFlagsOptions')) {
                toggleIKFlags(false);
                escaped = true;
            }
            if (isVisible('animEntityOptions')) {
                toggleEntity(false);
                escaped = true;
            }
            if (escaped == true) { return; }

            if (isVisible('animHUD')) {
                setUIAnim(false);
                sendClientMessage('deactivateMode', { mode: "animation" });
                return;
            }

            if (isVisible('devTreeHUD')) {
                elementSetClass('devTreeHUD', 'hidden', true);
                sendClientMessage('deactivateMode', { mode: "devTree" });
            }
            return;
        case " ":
            if (typeof event.target.onclick == "function") {
                event.target.onclick.apply();
            } else {
                togglePlay();
            }
            break;
        case "?":
        case "1":
        case "x":
            if (isVisible('animSearchField')) {
                // Clear search
                elementSetText('animDictList', "");
                elementSetText('animList', "");
                elementSetText('valueAnimSearch', "");
                document.getElementById('valueAnimSearch').focus();
            } else if (isVisible('animTimingsOptions')) {
                // Reset timings to defaults
                elementSetText('timingBlendIn', "1.0");
                elementSetText('timingBlendOut', "1.0");
                elementSetText('timingPlayback', "0");
                elementSetText('timingDuration', "-1");
            } else if (isVisible('animFlagsOptions')) {
                // Clear all flags
                for (var i=0; i < 32; i++) {
                    let value = toUint32(1 << i);
                    if (elementHasClass(`flag-${value}`, "selected")) {
                        toggleFlag(value);
                    }
                }
            } else if (isVisible('animIKFlagsOptions')) {
                // Clear all ikflags
                for (var i=0; i < 32 ; i++) {
                    let value = toUint32(1 << i);
                    if (elementHasClass(`flag-${value}`, "selected")) {
                        toggleIKFlag(value);
                    }
                }
            } else if (isVisible('animEntityOptions')) {
                // Reset entity to player
                elementSetText('animEntityField', "");
            } else {
                // Clear the selected animDict and animName
                elementSetText('activeAnimDict', "");
                elementSetText('activeAnimName', "");
            }
            event.preventDefault();
            break;
    }
}

