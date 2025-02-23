import { setUIStyle, toggleBorder, toggleCurvedBorder, setCurvedBorderAmount } from "./utils/theme.js";
import { clipboardCopy } from "./utils/clipboard.js";
import { sendClientMessage } from "./utils/msg.js";
import { updateCrosshair } from "./components/crosshair.js";
import { fetchSpawnData, initSettings } from "./components/settings.js"
import { tooltipListener, setTooltips, } from "./components/tooltip.js";
import { dropdownListeners, showDropdown } from './components/dropdown.js';
import { updateCamera, toggleHideCamera, } from "./components/camera.js";
import {
    clickElement,
    elementSetOnlyClass,
    elementSetClass,
    elementSetText,
    isVisible,
    resetList,
    isInterruptingElement,
} from "./utils/nav.js";
import { initTrie } from "./components/trie.js";
import {
    showExport,
    showImport,
    saveScene,
    clearScene,
    reloadScene,
    deleteScene,
} from "./components/scene.js"
import {
    searchSpawnObject,
    getTrackedObjects,
    toggleNearbyFilter,
    tagSelectSort,
    selectSpawnType,
    selectNearbyOrigin,
    toggleVisible,
    toggleFrozen,
    toggleCollision,
    setRotation,
    placeOnGround,
} from "./components/obj.js";
import {
    toggleObjectHUD,
    toggleObjectSpawnHUD,
    toggleObjectNearbyHUD,
    toggleObjectImportExportHUD,
    toggleObjectSettingsHUD,
} from "./components/hud/obj.js";
import {
    searchAnimDicts,
    addAnimation,
    clearAnimations,
} from "./components/anims.js";
import {
    toggleAnimationHUD,
    toggleAnimationSearchHUD,
    toggleAnimationConfigureHUD,
} from "./components/hud/anim.js";

export let MouseDown = false;
const CursorUpdateRate = 30;
const ResolutionX = window.screen.width;
const ResolutionY = window.screen.height;
let MCP = false;
let GizmoActive = false;
let KeyPressRepeat = false;
let LeftClickActive = false;
let CursorPosDelay = false;
let Pressed = {}
let JustPressed = {}
let QuickPress = { Timeout: 400, MiddleMouse: { active: false, }, }

const KeyTranslateMap = {
    '&': '1',
    'é': '2',
    '"': '3',
    '\'': '4',
};

const ObjectContextOptions = {
    // 'Info': (data) => { console.log("Info", data.handle); },
    // 'Clone': (data) => { console.log("Clone", data.handle); },
    'Move': (data) => {
        sendClientMessage('trackObject', { handle: data.handle, category: "select" });
        sendClientMessage('toggleMode', { mode: "gizmo" });
    },
    'Set Upright': (data) => setRotation(data.handle, 0, 0, null),
    'Reset Rotation': (data) => setRotation(data.handle, 0, 0, 0),
    'Place on Ground': (data) => placeOnGround(data.handle),
}

export let KeyActions = {
    'infoHUD': {
        ' ': (event) => clickElement(event),
        'y': () => elementSetClass('infoHUD', 'clear', true),
        'n': () => elementSetClass('infoHUD', 'hidden', true),
        'enter': () => elementSetClass('infoHUD', 'clear', true),
        'escape': () => elementSetClass('infoHUD', 'hidden', true),
    },
    'devTreeHUD': {},
    'animHUD': {
        ' ': (event) => { clickElement(event); },
        'escape': () => { sendClientMessage('deactivateMode', { mode: "animation" }); },
        '1': () => { toggleAnimationSearchHUD(); },
        '2': () => { toggleAnimationConfigureHUD(); },
        'h': () => { toggleHelp("animHelp"); },
        '?': () => { toggleHelp("animHelp"); },
    },
    'gizmo': {
        'escape': () => { sendClientMessage('deactivateMode', { mode: "gizmo"}); },
    },
    'objectHUD': {
        ' ': (event) => { clickElement(event); },
        '1': () => { toggleObjectSpawnHUD(); },
        '2': () => { toggleObjectImportExportHUD(); },
        '3': () => { toggleObjectNearbyHUD(); },
        '4': () => { toggleObjectSettingsHUD(); },
        'f': () => { sendKey('f'); },
        'g': () => { sendKey('g'); },
        'h': () => { toggleHelp("objHelp"); },
        '?': () => { toggleHelp("objHelp"); },
        'r': () => { sendKey('r'); },
        's': () => { if (Pressed.Control) { saveScene(); } },
        't': () => { sendKey('t'); },
        'x': () => { sendKey('x'); },
        'escape': () => { sendClientMessage('deactivateMode', { mode: "object" }); },
    },
    'exportHUD': {
        ' ': (event) => { clickElement(event); },
        'escape': () => {
            if (!document.getElementById('exportContent').matches(':focus')) {
                elementSetClass('exportHUD', 'hidden', true);
            } else {
                document.activeElement.blur();
                window.getSelection().removeAllRanges();
                document.getElementById('exportCopyOption').focus();
            }
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

export let MouseActions = {
    'devTreeHUD': {
        leftClick: (event) => { },
        middleClick: (event) => { },
    },
    'animHUD': {
        leftClick: (event) => {
            // TODO: convert this to EventActions click
            if (event.target.id === "activeAnimDict" || event.target.id === "activeAnimName") {
                if (event.target.innerHTML !== "") {
                    clipboardCopy(event.target.innerHTML);
                }
            }
        },
        middleClick: (event) => {
            if (MCP) {
                sendClientMessage('deactivateMCP', {}).then((mcpState) => { toggleMCP(mcpState); });
            } else {
                QuickPress.MiddleMouse.active = true;
                setTimeout(() => { QuickPress.MiddleMouse.active = false; }, QuickPress.Timeout);
                sendClientMessage('activateMCP', { mode: "animation" }).then((mcpState) => {
                    toggleMCP(mcpState);
                });
            }
        },
    },
    'objectHUD': {
        leftClick: (event) => {
            if (!MCP) {
                if (isInterruptingElement(event.target)) {
                    event.stopPropagation();
                    return;
                }
                sendKey('MouseLeft');
            }
        },
        rightClick: (event) => {
            if (!MCP) {
                if (isInterruptingElement(event.target)) {
                    event.stopPropagation();
                    return;
                }
                event.preventDefault();
                let x = event.pageX;
                let y = event.pageY;
                sendClientMessage('getRaycast', { x: x/ResolutionX, y: y/ResolutionY }).then((data) => {
                    if (!data.handle) { return; }
                    showDropdown(Object.keys(ObjectContextOptions), x, y).then((option) => {
                        if (!option) { return; }
                        ObjectContextOptions[option](data);
                    });
                });
            }
        },
        middleClick: (event) => {
            if (MCP) {
                sendClientMessage('deactivateMCP', {}).then((mcpState) => {
                    console.log("deactivateMCP", mcpState);
                    toggleMCP(mcpState);
                });
            } else {
                QuickPress.MiddleMouse.active = true;
                setTimeout(() => { QuickPress.MiddleMouse.active = false; }, QuickPress.Timeout);
                sendClientMessage('activateMCP', { mode: "object" }).then((mcpState) => {
                    console.log("activateMCP", mcpState);
                    toggleMCP(mcpState);
                });
            }
        },
    },
    'gizmo': {
        middleClick: (event) => {
            QuickPress.MiddleMouse.active = true;
            setTimeout(() => { QuickPress.MiddleMouse.active = false; }, QuickPress.Timeout);
            sendClientMessage('activateMCP', { mode: "gizmo" }).then((mcpState) => {
                toggleMCP(mcpState);
            });
        },
    },
};

export const EventActions = {
    click: {
        // Animation HUD
        '#button-animsearch': () => toggleAnimationSearchHUD(),
        '#button-animconfigure': () => toggleAnimationConfigureHUD(),

        '#button-animconfadd': () => { addAnimation(); },
        '#button-animconfclear': () => { clearAnimations(); },

        // Object HUD
        '#button-spawn': () => toggleObjectSpawnHUD(),
        '#button-trackedobjlist': () => toggleObjectNearbyHUD(),
        '#button-importexport': () => toggleObjectImportExportHUD(),
        '#button-objsettings': () => toggleObjectSettingsHUD(),

        '#button-objDetailsPosition': () => toggleObjectDetail('button-objDetailsPosition'),
        '#button-objDetailsStatus': () => toggleObjectDetail('button-objDetailsStatus'),

        '#button-spawnpreview': () => { elementSetClass('button-spawnpreview', 'selected'); },
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
        '#button-nearby-scene': () => toggleNearbyFilter('scene'),

        '#button-savescene': () => saveScene(),
        '#button-clearscene': () => clearScene(),
        '#button-export': () => showExport(),
        '#button-import': () => showImport(),
        '#button-reloadscene': () => reloadScene(),
        '#button-deletescene': () => deleteScene(),
        '#button-tagsortbydist': () => tagSelectSort('dist'),
        '#button-tagsortbyname': () => tagSelectSort('name'),

        '#objDetailsEntityVisible': () => toggleVisible(),
        '#objDetailsEntityFrozen': () => toggleFrozen(),
        '#objDetailsEntityCollision': () => toggleCollision(),

        '#objSettingsTooltip': () => setTooltips(),
        '#objSettingsBorder': () => toggleBorder(),
        '#objSettingsCurvedBorder': () => toggleCurvedBorder(),
        '#objSettingsHideCamera': () => toggleHideCamera(),

        '#button-animTimings': () => toggleAnimDetail('button-animTimings'),
        '#button-animFlags': () => toggleAnimDetail('button-animFlags'),
    },
    input: {},
    mousemove: (event) => {
        if (!CursorPosDelay && !MCP && !GizmoActive &&
                isVisible('objectHUD') &&
                !document.activeElement.classList.contains('entry')) {
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
        const currentHUD = getCurrentHUD(); // Assume this function gets the currently active HUD

        const mouseButtonActions = {
            0: 'leftClick', // Left Click
            1: 'middleClick', // Middle Click
            2: 'rightClick',
        };
        const actionType = mouseButtonActions[event.button];

        if (MouseActions[currentHUD] && MouseActions[currentHUD][actionType]) {
            MouseActions[currentHUD][actionType](event);
        } else {
            // Fallback or global behavior if no specific HUD action is defined
        }
    },
    mouseup: (event) => {
        MouseDown = false;
        switch(event.button) {
            case 0: // Left Click
                LeftClickActive = false;
                break;
        }
        if (isVisible('animHUD') || isVisible('objectHUD')) {
            switch(event.button) {
                case 1: // Middle Click
                    if (!QuickPress.MiddleMouse.active) {
                        sendClientMessage('deactivateMCP', {}).then((mcpState) => { toggleMCP(mcpState); });
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
        if (MCP) {
            event.preventDefault();
            return;
        }
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
            case "Backspace":
            case "Delete":
                const selection = window.getSelection();
                // console.log(event, selection);
                if (!selection.rangeCount) break;

                const selectedText = selection.toString();
                const textLength = event.target.textContent.length;
                let shouldClear = false;

                if (selectedText.length > 0) {
                    if (textLength - selectedText.length === 0) {
                        shouldClear = true;
                    }
                } else if (textLength === 1) {
                    // No text is selected
                    const cursorAtStart = selection.anchorOffset === 0; // Caret is at the start of the div
                    if ((event.key === "Backspace" && !cursorAtStart) ||
                        (event.key === "Delete" && cursorAtStart)) {
                        shouldClear = true;
                    }
                }

                if (shouldClear) {
                    event.target.textContent = ''; // Clear the div manually
                    event.preventDefault(); // Prevent <br> or any default action
                }
                break;

            case "Delete":
                // Get the current selection and cursor position
                const del_selection = window.getSelection();
                if (del_selection.rangeCount > 0) {
                    const cursorAtStart = del_selection.anchorOffset === 0; // Caret is at the start
                    const textLength = event.target.textContent.length;

                    // Clear the div only if the cursor is at the start and its the last char
                    if (cursorAtStart && textLength === 1) {
                        event.target.textContent = ''; // Clear the div manually
                        event.preventDefault(); // Prevent <br> or any default action
                    }
                }
                break;
        }
        JustPressed[event.key] = true;
        if (event.key == "Escape" || !isInputField) {
            handleKeyPress(event, getCurrentHUD())
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
    "#objSearch": (event) => { searchSpawnObject(event.target.innerHTML) },
    "#selectedScene": (event) => {
        console.log("selectedScene event triggered", event);
        if (event.key == "Enter" || event.inputType == "insertParagraph") {
            event.preventDefault();
            saveScene();
        }
    },
    "#nearbyRange": (event) => {
        if (event.key == "Enter" || event.inputType == "insertParagraph") {
            event.preventDefault();
            getTrackedObjects();
        }
    },
    '#objSettingsCurvedBorderAmount': (event) => setCurvedBorderAmount(),
    "#animSearch": (event) => {
        if (event.key == "Enter" || event.inputType == "insertParagraph") {
            event.preventDefault();

            const dict = document.getElementById("animDictList");
            const anim = document.getElementById("animNameList");

            elementSetText(dict, "");
            dict.scrollTop = 0;
            dict.scrollLeft = -1000;

            elementSetText(anim, "");
            anim.scrollTop = 0;
            anim.scrollLeft = -1000;

            const value = document.getElementById("animSearch").innerHTML;
            searchAnimDicts(value);
        }
    },
}



export function registerListeners() {
    tooltipListener();
    dropdownListeners();
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

export function toUint32(value) { return value >>> 0; }

function getCurrentHUD() {
    // TODO: cache in appState, dont always query DOM
    const huds = document.querySelectorAll(".hud");
    for (let hud of huds) {
        if (!hud.classList.contains('hidden')) {
            return hud.id;
        }
    }
    return null;
}

document.addEventListener('DOMContentLoaded', () => {
    fetchSpawnData();
    initSettings();
    registerListeners();

    setUIStyle("electric_sunset", "angle up");
    elementSetText('objSettingsTheme', "electric sunset");
    elementSetText('objSettingsDividerStyle', "angle up");
    toggleCurvedBorder();

    window.addEventListener('message', function(msg) {
        switch(msg.data.type) {
            case "ui_trie":
                console.log("trie", msg.data.trie);
                if (msg.data.trie) { initTrie(msg.data.trie); }
                elementSetClass('devTreeHUD', 'hidden', msg.data.state == false);
                break;
            case "ui_animation":
                toggleAnimationHUD(msg.data.state);
                break;
            case "ui_object":
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
            // case "updateSceneObjects":
            //     updateSceneObjects(msg.data.objects);
            case "clipboard":
                clipboardCopy(msg.data.text);
                break;
            case "mcp":
                toggleMCP(msg.data.active);
                break;
            case "setGizmoState":
                GizmoActive = msg.data.data.shown
                elementSetClass('gizmo', 'hidden', !GizmoActive);
                break;
            case "toggleHelp":
                toggleHelp(msg.data.mode, msg.data.state, msg.data.toggleCursor);
                break;
            case "keyPress":
                handleKeyPress({ key: msg.data.key }, msg.data.mode);
                break;
        }
    })
});

function handleKeyPress(event, hud) {
    const rawKey = event.key;
    if (!hud) { return; }
    const lowercaseKey = rawKey.toLowerCase();
    const key = KeyTranslateMap[lowercaseKey] || lowercaseKey;

    const action = KeyActions[hud][key] || KeyActions[hud].default;
    // console.log("handleKeyPress", hud, key, event);
    if (action) { action(event); }
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
    console.log("setUIAnim", state);
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
        if (document.activeElement.classList.contains('entry')) {
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
        if (document.activeElement.classList.contains('entry')) {
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
        if (document.activeElement.classList.contains('entry')) {
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

const ObjectDetailsCategoryMap = new Map([
    ['button-objDetailsPosition', 'objDetailsListPosition'],
    ['button-objDetailsStatus', 'objDetailsListStatus'],
]);

function toggleObjectDetail(elId, state) {
    console.log("toggleObjectDetail", elId, state);
    const el = document.getElementById(elId);
    if (state === undefined) { state = !el.classList.contains('selected'); }
    elementSetClass(el, 'selected', state);
    const listEl = ObjectDetailsCategoryMap.get(elId);
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
    ["objDetailsEntityVisible", "visible"],
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
        elementSetClass('objDetails', 'hidden', true);
        return;
    }

    ObjectDetailsFields.forEach((value, key) => {
        elementSetText(key, data.selectData[value]);
    });
    ObjectDetailsOptions.forEach((value, key) => {
        elementSetClass(key, "selected", data.selectData[value]);
    });
    elementSetClass('objDetails', 'hidden', false);
}

const AnimConfigureCategoryMap = new Map([
    ['button-animTimings', 'animConfigureTimings'],
    ['button-animFlags', 'animConfigureFlags'],
]);

function toggleAnimDetail(elId, state) {
    console.log("toggleAnimConfigureCategory", elId, state);
    const el = document.getElementById(elId);
    if (state === undefined) { state = !el.classList.contains('selected'); }
    elementSetClass(el, 'selected', state);
    const listEl = AnimConfigureCategoryMap.get(elId);
    elementSetClass(listEl, 'hidden', !state);
}

function sendKey(key) {
    sendClientMessage('dispatchKeyEvents', {
        justPressed: { [key]: true, },
        pressed: Pressed
    });
}

