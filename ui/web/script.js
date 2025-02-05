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
    resetList,
} from "./utils/nav.js";
import { initTrie } from "./components/trie.js";
import {
    initObj,
    initializeObjectHUD,
    searchSpawnObject,
    getTrackedObjects,
    copyScene,
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

export let KeyActions = {
    'infoHUD': {
        'escape': () => {
            console.log("Escape infoHUD");
            elementSetClass('infoHUD', 'hidden', true);
        },
    },
    'devTreeHUD': {},
    'animHUD': {
        'escape': () => {
            console.log("Escape animHUD");
            sendClientMessage('deactivateMode', { mode: "animation" });
        },
        'backspace': () => { toggleStop(); },
        ' ': () => { togglePlay(); },
        '?': () => { toggleHelp("animHelp"); },
        '1': () => { toggleAnimationSearchHUD(); },
        '2': () => { toggleAnimationConfigureHUD(); },
        // '3': () => { toggleIKFlags(); },
        // '4': () => { toggleFlags(); },
        // '5': () => { toggleTaskFilters(); },
        // '6': () => { toggleEntity(); },
        // 'c': () => { toggleSettings(); },
        // 'h': () => { toggleHelp("animHelp"); },
        // 'i': () => { toggleIKFlags(); },
        // 'l': () => { toggleLoop(); },
        // 'o': () => { toggleFlags(); },
        'p': () => { togglePlay(); },
        // 'q': () => { togglePlay(); },
        'r': () => { togglePlay(); },
        // 't': () => { toggleTimings(); },
        // 'u': () => { toggleTorso(); },
    },
    'gizmo': {
        'escape': () => { sendClientMessage('deactivateMode', { mode: "gizmo"}); },
    },
    'objectHUD': {
        ' ': (event) => {
            // TODO: Detect if its also a list element with an onclick
            const eventId = `#${event.target.id}`;
            if (EventActions.click[eventId])
                EventActions.click[eventId](event);
        },
        '?': () => { toggleHelp("objHelp"); },
        '1': () => { toggleObjectSpawnHUD(); },
        '2': () => { toggleObjectNearbyHUD(); },
        '3': () => { toggleObjectImportExportHUD(); },
        'f': () => { sendClientMessage('toggleMode', { mode: "focus" }); },
        'h': () => { toggleHelp("objHelp"); },
        'r': () => { sendClientMessage('toggleMode', { mode: "gizmo" })},
        'x': () => {
            sendClientMessage('sendCursorKey', {
                justPressed: { x: true },
                pressed: Pressed,
            });
        },
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
            // TODO: cconvert this to EventActions click
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
                const isInterruptingElement = event.target.classList.contains('label') ||
                    event.target.classList.contains('entry') ||
                    event.target.classList.contains('control') ||
                    event.target.closest('.label') ||
                    event.target.closest('.entry') ||
                    event.target.closest('.control');

                if (isInterruptingElement) {
                    event.stopPropagation();
                    return;
                }
                sendClientMessage('sendCursorKey', {
                    justPressed: { MouseLeft: true },
                    pressed: Pressed,
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

        '#button-savescene': () => copyScene(),
        '#button-clearscene': () => clearScene(),
        '#button-deletescene': () => deleteScene(),
        '#button-tagsortbydist': () => tagSelectSort('dist'),
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
            copyScene();
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
    console.log("handleKeyPress", hud, key, action);
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

export function showConfirm(msg = "Are you sure?", yes = "Yes", no = "No") {
    return new Promise((resolve, reject) => {
        const infoHUD = document.getElementById('infoHUD');
        const message = document.getElementById('infoDescription');
        const yesButton = document.getElementById('yesOption');
        const noButton = document.getElementById('noOption');

        message.innerHTML = msg;
        yesButton.innerHTML = yes;
        noButton.innerHTML = no;

        infoHUD.classList.remove('hidden');

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
            infoHUD.classList.add('hidden');
        }

        yesButton.addEventListener('click', handleYes);
        noButton.addEventListener('click', handleNo);
    });
}

// DEPRECATE BELOW //

function ObjectKeys(key, event) {
    switch(key) {
        case "Escape":
            let escaped = false;
            if (document.activeElement.classList.contains('entry')) {
                document.activeElement.blur();
                return;
            }
            if (escaped) { return; }

            sendClientMessage('deactivateMode', { mode: "object" });
            toggleObjectHUD(false);
            return;
        case "f":
            if (!document.activeElement.classList.contains('entry') && !MCP) {
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
                resetList("objSpawnList");
            } else if (isVisible('objDetails')) {
                sendClientMessage('sendCursorKey', { justPressed: { x: true, } });
            }
            return;
    }
}

function HandleKeysAnim(event) {
    switch(event.key) {
        case "Escape":
            let escaped = false;
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
                //     setUIAnim(false);
                //     sendClientMessage('deactivateMode', { mode: "animation" });
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
                for (let i=0; i < 32; i++) {
                    let value = toUint32(1 << i);
                    if (elementHasClass(`flag-${value}`, "selected")) {
                        toggleFlag(value);
                    }
                }
            } else if (isVisible('animIKFlagsOptions')) {
                // Clear all ikflags
                for (let i=0; i < 32 ; i++) {
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

