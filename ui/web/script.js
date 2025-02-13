import { clipboardCopy } from "./utils/clipboard.js";
import { sendClientMessage } from "./utils/msg.js";
import { updateCrosshair } from "./components/crosshair.js";
import { updateCamera } from "./components/camera.js";
import {
    clickElement,
    elementSetOnlyClass,
    elementSetClass,
    elementHasClass,
    elementSetText,
    isVisible,
    resetList,
    isInterruptingElement,
} from "./utils/nav.js";
import { initTrie } from "./components/trie.js";
import {
    initObj,
    initializeObjectHUD,
    searchSpawnObject,
    getTrackedObjects,
    saveScene,
    clearScene,
    reloadScene,
    deleteScene,
    toggleNearbyFilter,
    tagSelectSort,
    selectSpawnType,
    selectNearbyOrigin,
    toggleObjectHUD,
    toggleObjectSpawnHUD,
    toggleObjectNearbyHUD,
    toggleObjectImportExportHUD,
    toggleFrozen,
    toggleCollision,
    setRotation,
    placeOnGround,
} from "./components/obj.js";
import {
    initAnims,
    initializeAnimationHUD,
    toggleAnimationHUD,
    toggleAnimationSearchHUD,
    toggleAnimationConfigureHUD,
    searchAnimDicts,
    addAnimation,
    clearAnimations,
    playAnimation,
    togglePlay,
    toggleStop,
    toggleLoop,
    toggleTorso,
    toggleFlag,
    toggleIKFlag
} from "./components/anims.js";
import {
    setTheme,
} from "./components/theme.js";

const CursorUpdateRate = 30;
let MCP = false;
let GizmoActive = false;
let KeyPressRepeat = false;
let LeftClickActive = false;
let CursorPosDelay = false;
const ResolutionX = window.screen.width;
const ResolutionY = window.screen.height;
export let MouseDown = false;

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
    'Reset Rotation': (data) => { setRotation(data.handle, 0, 0, 0); },
    'Place on Ground': (data) => { placeOnGround(data.handle); },
}

export let KeyActions = {
    'infoHUD': {
        ' ': (event) => { clickElement(event); },
        'y': () => { elementSetClass('infoHUD', 'clear', true); },
        'n': () => { elementSetClass('infoHUD', 'hidden', true); },
        'enter': () => { elementSetClass('infoHUD', 'clear', true); },
        'escape': () => { elementSetClass('infoHUD', 'hidden', true); },
    },
    'devTreeHUD': {},
    'animHUD': {
        ' ': (event) => { clickElement(event); },
        'escape': () => { sendClientMessage('deactivateMode', { mode: "animation" }); },
        'backspace': () => { toggleStop(); },
        '?': () => { toggleHelp("animHelp"); },
        '1': () => { toggleAnimationSearchHUD(); },
        '2': () => { toggleAnimationConfigureHUD(); },
        'h': () => { toggleHelp("animHelp"); },
        'p': () => { togglePlay(); },
        'r': () => { togglePlay(); },
        // '3': () => { toggleIKFlags(); },
        // '4': () => { toggleFlags(); },
        // '5': () => { toggleTaskFilters(); },
        // '6': () => { toggleEntity(); },
        // 'c': () => { toggleSettings(); },
        // 'i': () => { toggleIKFlags(); },
        // 'l': () => { toggleLoop(); },
        // 'o': () => { toggleFlags(); },
        // 'q': () => { togglePlay(); },
        // 't': () => { toggleTimings(); },
        // 'u': () => { toggleTorso(); },
    },
    'gizmo': {
        'escape': () => { sendClientMessage('deactivateMode', { mode: "gizmo"}); },
    },
    'objectHUD': {
        ' ': (event) => { clickElement(event); },
        '?': () => { toggleHelp("objHelp"); },
        '1': () => { toggleObjectSpawnHUD(); },
        '2': () => { toggleObjectImportExportHUD(); },
        '3': () => { toggleObjectNearbyHUD(); },
        'f': () => { sendKey('f'); },
        'g': () => { sendKey('g'); },
        'h': () => { toggleHelp("objHelp"); },
        'r': () => { sendKey('r'); },
        's': () => { if (Pressed.Control) { saveScene(); } },
        't': () => { sendKey('t'); },
        'x': () => { sendKey('x'); },
        'escape': () => { sendClientMessage('deactivateMode', { mode: "object" }); },
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
                sendClientMessage('deactivateMCP', {});
                toggleMCP(false);
            } else {
                QuickPress.MiddleMouse.active = true;
                setTimeout(() => { QuickPress.MiddleMouse.active = false; }, QuickPress.Timeout);
                sendClientMessage('activateMCP', { mode: "animation" });
                toggleMCP(true);
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
                    showContextMenu(Object.keys(ObjectContextOptions), x, y).then((option) => {
                        if (!option) { return; }
                        ObjectContextOptions[option](data);
                    });
                });
            }
        },
        middleClick: (event) => {
            if (MCP) {
                sendClientMessage('deactivateMCP', {});
                toggleMCP(true);
            } else {
                QuickPress.MiddleMouse.active = true;
                setTimeout(() => { QuickPress.MiddleMouse.active = false; }, QuickPress.Timeout);
                sendClientMessage('activateMCP', { mode: "object" });
                toggleMCP(true);
            }
        },
    },
    'gizmo': {
        middleClick: (event) => {
            QuickPress.MiddleMouse.active = true;
            setTimeout(() => { QuickPress.MiddleMouse.active = false; }, QuickPress.Timeout);
            sendClientMessage('activateMCP', { mode: "gizmo" });
            toggleMCP(true);
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
        '#button-nearby-other': () => toggleNearbyFilter('other'),

        '#button-savescene': () => saveScene(),
        '#button-clearscene': () => clearScene(),
        '#button-reloadscene': () => reloadScene(),
        '#button-deletescene': () => deleteScene(),
        '#button-tagsortbydist': () => tagSelectSort('dist'),
        '#button-tagsortbyname': () => tagSelectSort('name'),

        '#objDetailsEntityFrozen': () => toggleFrozen(),
        '#objDetailsEntityCollision': () => toggleCollision(),

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
                    event.target.innerHTML = ''; // Clear the div manually
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
                        event.target.innerHTML = ''; // Clear the div manually
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

document.addEventListener('DOMContentLoaded', () => {
    initAnims();
    initObj();
    registerListeners();
    setTheme("da_grayscale");

    window.addEventListener('message', function(msg) {
        switch(msg.data.type) {
            case "ui_trie":
                console.log("trie", msg.data.trie);
                if (msg.data.trie) { initTrie(msg.data.trie); }
                elementSetClass('devTreeHUD', 'hidden', msg.data.state == false);
                break;
            case "ui_animation":
                initializeAnimationHUD();
                toggleAnimationHUD(msg.data.state);
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

/**
 * Popup a confirmation dialog with a message and two options.
 * @param {string} msg - The message to display in the dialog.
 * @param {string} yes - The text to display on the "Yes" button.
 * @param {string} no - The text to display on the "No" button.
 */
export function showConfirm(msg = "Are you sure?", yes = "Yes", no = "No") {
    return new Promise((resolve, reject) => {
        const infoHUD = document.getElementById('infoHUD');
        const message = document.getElementById('infoDescription');
        const yesButton = document.getElementById('yesOption');
        const noButton = document.getElementById('noOption');
        const lastFocusedElement = document.activeElement;


        message.innerHTML = msg;
        yesButton.innerHTML = yes;
        noButton.innerHTML = no;

        infoHUD.classList.remove('hidden');
        noButton.focus();

        // Create a MutationObserver to monitor if the popup becomes hidden
        const observer = new MutationObserver((mutationsList) => {
            if (infoHUD.classList.contains('hidden')) {
                cleanup();
                resolve(false);
            } else if (infoHUD.classList.contains('clear')) {
                cleanup();
                resolve(true);
            }
        });
        observer.observe(infoHUD, {
            attributes: true,
            attributeFilter: ['class']
        });

        function handleYes() {
            cleanup();
            resolve(true);
        }

        function handleNo() {
            cleanup();
            resolve(false);
        }

        function cleanup() {
            yesButton.removeEventListener('click', handleYes);
            noButton.removeEventListener('click', handleNo);
            observer.disconnect();
            infoHUD.classList.remove('clear');
            infoHUD.classList.add('hidden');
            if (lastFocusedElement) {
                lastFocusedElement.focus();
            }
        }

        yesButton.addEventListener('click', handleYes);
        noButton.addEventListener('click', handleNo);
    });
}

/**
 * Show a right-click popup with a list of options.
 * @param {Array<string>} options - The list of options to display.
 * @param {number} x - The X coordinate for the popup position.
 * @param {number} y - The Y coordinate for the popup position.
 * @returns {Promise<string | null>} Resolves with the selected option, or null if dismissed.
 */
export function showContextMenu(options, x, y) {
    return new Promise((resolve) => {
        const menu = document.createElement("div");
        menu.classList.add("context-menu");
        menu.style.top = `${y}px`;
        menu.style.left = `${x}px`;

        const lastFocusedElement = document.activeElement;

        options.forEach((option) => {
            const item = document.createElement("div");
            item.classList.add("context-menu-item");
            item.textContent = option;
            item.addEventListener("click", () => {
                cleanup();
                resolve(option);
            });
            menu.appendChild(item);
        });

        document.body.appendChild(menu);

        function cleanup() {
            menu.remove();
            document.removeEventListener("click", handleClickOutside);
            document.removeEventListener("contextmenu", handleRightClick);
            document.removeEventListener("keydown", handleKeyPress);
            if (lastFocusedElement) {
                lastFocusedElement.focus();
            }
        }

        function handleClickOutside(event) {
            if (!menu.contains(event.target)) {
                cleanup();
                resolve(null);
            }
        }

        function handleRightClick(event) {
            if (event.button != 2) return;
            cleanup();
            resolve(null);
        }

        function handleKeyPress(event) {
            if (event.key === "Escape") {
                cleanup();
                resolve(null);
            }
        }

        document.addEventListener("click", handleClickOutside);
        document.addEventListener("pointerdown", handleRightClick);
        document.addEventListener("keydown", handleKeyPress);
    });
}

function sendKey(key) {
    sendClientMessage('dispatchKeyEvents', {
        justPressed: { [key]: true, },
        pressed: Pressed
    });
}
