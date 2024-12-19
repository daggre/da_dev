import { clipboardCopy } from "./utils/clipboard.js";
import { sendClientMessage } from "./utils/msg.js";
import { updateCrosshair } from "./components/crosshair.js";
import { updateCamera } from "./components/camera.js";
import {
    elementSetOnlyClass,
    elementSetClass,
    elementHasClass,
    elementSetText,
    isVisible,
} from "./utils/nav.js";
import { initTrie } from "./components/trie.js";
import {
    initObj,
    initializeObjectHUD,
    searchSpawnObject,
    getTrackedObjects,
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

        '#button-spawnfavs': () => { elementSetClass('button-spawnfavs', 'selected'); },
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
    // input: {
    //     "#objSearch": searchSpawnObject,
    //     "#nearbyRange": (event) => {
    //         if (event.inputType == "insertParagraph") {
    //             event.preventDefault();
    //             getTrackedObjects();
    //         }
    //     },
    //     "#animSearch": (event) => {
    //         if (event.inputType == "insertParagraph") {
    //             event.preventDefault();
    //
    //             const dict = document.getElementById("animDictList");
    //             const anim = document.getElementById("animList");
    //             const searchElement = document.getElementById("animSearch");
    //
    //             elementSetText(dict, "");
    //             elementSetText(anim, "");
    //
    //             dict.scrollTop = 0;
    //             dict.scrollLeft = -1000;
    //             anim.scrollTop = 0;
    //             anim.scrollLeft = -1000;
    //
    //             searchRedMAnims(searchElement.innerHTML);
    //         }
    //     },
    // },
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
        const isInputField = event.target.getAttribute('contenteditable') == "true"
        Pressed[event.key] = true;
        // Check universal nav keys
        switch(event.key) {
            case " ":
                if (typeof event.target.onclick == "function") {
                    event.target.onclick.apply();
                    event.preventDefault();
                    return;
                }
                break;
            case "Tab":
                return;
        }
        JustPressed[event.key] = true;
        if (event.key == "Escape" || !isInputField) {
            handleKeyPress(event.key, getCurrentHUD())
        } else if (isInputField) {
            if (event.key == "Enter") {
                Object.keys(InputFields).forEach((selector) => {
                    if (event.target.matches(selector)) {
                        const action = InputFields[selector]
                        action.length ? action(event) : action();
                        event.preventDefault();
                    }
                });
            }
        }
        JustPressed[event.key] = false;
    }
};

const InputFields = {
    "#objSearch": searchSpawnObject,
    "#nearbyRange": (event) => {
        if (event.inputType == "insertParagraph") {
            event.preventDefault();
            getTrackedObjects();
        }
    },
    "#animSearch": (event) => {
        if (event.inputType == "insertParagraph") {
            event.preventDefault();

            const dict = document.getElementById("animDictList");
            const anim = document.getElementById("animList");
            const searchElement = document.getElementById("animSearch");

            elementSetText(dict, "");
            elementSetText(anim, "");

            dict.scrollTop = 0;
            dict.scrollLeft = -1000;
            anim.scrollTop = 0;
            anim.scrollLeft = -1000;

            searchRedMAnims(searchElement.innerHTML);
        }
    },
}

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
                    action.length ? action(event) : action();
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

window.onload = function() {
    initAnims();
    initObj();
    registerListeners();

    window.addEventListener('message', function(msg) {
        switch(msg.data.type) {
            case "ui_trie":
                console.log("trie", msg.data.trie);
                if (msg.data.trie) { initTrie(msg.data.trie); }
                elementSetClass('devTreeHUD', 'hidden', msg.data.state == false);
                break;
            case "ui_animation":
                setUIAnim(msg.data.state);
                break;
            case "ui_object":
                initializeObjectHUD();
                toggleObjectHUD(msg.data.state);
                break;
            case "ui_camera":
                elementSetClass('cameraHUD', 'hidden', msg.data.state == false);
                break;
            case "updateCrosshair":
                updateCrosshair(msg.data);
                updateObjectDetails(msg.data);
                break;
            case "updateCamera":
                updateCamera(msg.data.camera);
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
                handleKeyPress(msg.data.key, msg.data.mode);
                break;
        }
    })
}

function handleKeyPress(rawKey, hud) {
    if (!hud) { return; }
    console.log("handleKey", rawKey, hud);
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
    AnimSubElements.forEach((el) => { elementSetClass(el, 'hidden', true); });
    AnimElements.forEach((el) => { elementSetClass(el, 'hidden', !state); });
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
    switch(key) {
        case "Escape":
            var escaped = false;
            if (document.activeElement.classList.contains('entryField')) {
                document.activeElement.blur();
                return;
            }
            if (escaped) { return; }

            sendClientMessage('deactivateMode', { mode: "object" });
            toggleObjectHUD(false);
            return;
        case "f":
            if (!document.activeElement.classList.contains('entryField') && !MCP) {
                sendClientMessage('sendCursorKey', {
                    pressed: Pressed,
                    justPressed: JustPressed
                });
            }
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

