import {
    setBorder,
    setCurvedBorder,
    setCurvedBorderAmount,
} from './utils/theme.js';
import { clipboardCopy } from './utils/clipboard.js';
import { sendClientMessage } from './utils/msg.js';
import { updateCrosshair } from './components/crosshair.js';
import { fetchSpawnData, initSettings } from './components/settings.js';
import { tooltipListener, setTooltips } from './components/tooltip.js';
import { dropdownListeners, showDropdown } from './components/dropdown.js';
import { updateCamera, toggleHideCamera } from './components/camera.js';
import {
    clickElement,
    isVisible,
    isInterruptingElement,
} from './utils/nav.js';
import { initTrie } from './components/trie.js';
import {
    showExport,
    showImport,
    saveScene,
    clearScene,
    reloadScene,
    deleteScene,
} from './components/scene.js';
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
} from './components/obj.js';
import {
    toggleObjectHUD,
    toggleObjectSpawnHUD,
    toggleObjectNearbyHUD,
    toggleObjectImportExportHUD,
    toggleObjectSettingsHUD,
    toggleObjectDetail,
    toggleCrosshair,
    updateObjectDetails,
} from './components/hud/obj.js';
import {
    searchAnimDicts,
    addAnimation,
    clearAnimation,
    deleteAllAnimations,
    setSelectedAnimation,
} from './components/anims.js';
import {
    toggleAnimationHUD,
    toggleAnimationSearchHUD,
    toggleAnimationConfigureHUD,
    toggleAnimDetail,
} from './components/hud/anim.js';
import { toggleHelp, } from './components/hud/help.js';
import { toggleSettingsHUD } from './components/hud/settings.js';

export let MouseDown = false;
export let MCP = false;
const CursorUpdateRate = 30;
const ResolutionX = window.screen.width;
const ResolutionY = window.screen.height;
let GizmoActive = false;
let LeftClickActive = false;
let CursorPosDelay = false;
let Pressed = {};
let JustPressed = {};
let QuickPress = { Timeout: 400, MiddleMouse: { active: false } };

const KeyTranslateMap = {
    '&': '1',
    é: '2',
    '"': '3',
    "'": '4',
};

const ObjectContextOptions = {
    // 'Info': (data) => { console.log("Info", data.handle); },
    // 'Clone': (data) => { console.log("Clone", data.handle); },
    Move: data => {
        sendClientMessage('trackObject', {
            handle: data.handle,
            category: 'select',
        });
        sendClientMessage('toggleMode', { mode: 'gizmo' });
    },
    'Set Upright': data => setRotation(data.handle, 0, 0, null),
    'Reset Rotation': data => setRotation(data.handle, 0, 0, 0),
    'Place on Ground': data => placeOnGround(data.handle),
};

export let KeyActions = {
    'info-hud': {
        ' ': event => clickElement(event),
        y: () => document.getElementById('info-hud').classList.add('clear'),
        n: () => document.getElementById('info-hud').classList.add('hidden'),
        enter: () => document.getElementById('info-hud').classList.add('clear'),
        escape: () => document.getElementById('info-hud').classList.add('hidden'),
    },
    'settings-hud': {
        escape: () => toggleSettingsHUD(false),
    },
    'dev-tree-hud': {},
    'anim-hud': {
        ' ': event => {
            clickElement(event);
        },
        escape: () => {
            sendClientMessage('deactivateMode', { mode: 'animation' });
            toggleSettingsHUD(false);
        },
        1: () => {
            toggleAnimationSearchHUD();
        },
        2: () => {
            toggleAnimationConfigureHUD();
        },
        h: () => {
            toggleHelp('animHelp');
        },
        s: () => {
            if (Pressed.Shift && !Pressed.Control) {
                toggleSettingsHUD();
            }
        },
        '?': () => {
            toggleHelp('animHelp');
        },
    },
    gizmo: {
        escape: () => {
            sendClientMessage('deactivateMode', { mode: 'gizmo' });
            toggleSettingsHUD(false);
        },
    },
    'object-hud': {
        ' ': event => {
            clickElement(event);
        },
        1: () => {
            toggleObjectSpawnHUD();
        },
        2: () => {
            toggleObjectImportExportHUD();
        },
        3: () => {
            toggleObjectNearbyHUD();
        },
        // 4: () => {
        //     toggleObjectSettingsHUD();
        // },
        f: () => {
            sendKey('f');
        },
        g: () => {
            sendKey('g');
        },
        h: () => {
            toggleHelp('objHelp');
        },
        '?': () => {
            toggleHelp('objHelp');
        },
        r: () => {
            sendKey('r');
        },
        s: () => {
            if (Pressed.Control) {
                saveScene();
            }
            if (Pressed.Shift && !Pressed.Control) {
                toggleSettingsHUD();
            }
        },
        t: () => {
            sendKey('t');
        },
        x: () => {
            sendKey('x');
        },
        escape: () => {
            sendClientMessage('deactivateMode', { mode: 'object' });
            toggleSettingsHUD(false);
        },
    },
    'import-hud': {
        ' ': event => {
            clickElement(event);
        },
        escape: () => {
            if (!document.getElementById('importContent').matches(':focus')) {
                document.getElementById('import-hud').classList.add('hidden');
            } else {
                document.activeElement.blur();
                window.getSelection().removeAllRanges();
                document.getElementById('importExitOption').focus();
            }
        },
    },
    'export-hud': {
        ' ': event => {
            clickElement(event);
        },
        escape: () => {
            if (!document.getElementById('exportContent').matches(':focus')) {
                document.getElementById('export-hud').classList.add('hidden');
            } else {
                document.activeElement.blur();
                window.getSelection().removeAllRanges();
                document.getElementById('exportCopyOption').focus();
            }
        },
    },
    'camera-hud': {
        escape: () => {
            toggleHelp('camHelp', false);
            sendClientMessage('deactivateMode', { mode: 'freecam' });
            sendClientMessage('deactivateMode', { mode: 'noclip' });
            toggleSettingsHUD(false);
        },
        '?': () => {
            toggleHelp('camHelp', false);
        },
        h: () => {
            toggleHelp('camHelp', false);
        },
        s: () => {
            if (Pressed.Shift && !Pressed.Control) {
                toggleSettingsHUD();
            }
        },
    },
};

export let MouseActions = {
    'dev-tree-hud': {
        leftClick: () => {},
        middleClick: () => {},
    },
    'anim-hud': {
        leftClick: event => {
            // TODO: convert this to EventActions click
            if (
                event.target.id === 'activeAnimDict' ||
                event.target.id === 'activeAnimName'
            ) {
                if (event.target.innerHTML !== '') {
                    clipboardCopy(event.target.innerHTML);
                }
            }
        },
        middleClick: () => {
            if (MCP) {
                sendClientMessage('deactivateMCP', {}).then(mcpState => {
                    toggleMCP(mcpState);
                });
            } else {
                QuickPress.MiddleMouse.active = true;
                setTimeout(() => {
                    QuickPress.MiddleMouse.active = false;
                }, QuickPress.Timeout);
                sendClientMessage('activateMCP', { mode: 'animation' }).then(
                    mcpState => {
                        toggleMCP(mcpState);
                    }
                );
            }
        },
    },
    'object-hud': {
        leftClick: event => {
            if (!MCP) {
                if (isInterruptingElement(event.target)) {
                    event.stopPropagation();
                    return;
                }
                sendKey('MouseLeft');
            }
        },
        rightClick: event => {
            if (!MCP) {
                if (isInterruptingElement(event.target)) {
                    event.stopPropagation();
                    return;
                }
                event.preventDefault();
                let x = event.pageX;
                let y = event.pageY;
                sendClientMessage('getRaycast', {
                    x: x / ResolutionX,
                    y: y / ResolutionY,
                }).then(data => {
                    if (!data.handle) {
                        return;
                    }
                    showDropdown(Object.keys(ObjectContextOptions), x, y).then(
                        option => {
                            if (!option) {
                                return;
                            }
                            ObjectContextOptions[option](data);
                        }
                    );
                });
            }
        },
        middleClick: () => {
            if (MCP) {
                sendClientMessage('deactivateMCP', {}).then(mcpState => {
                    console.log('deactivateMCP', mcpState);
                    toggleMCP(mcpState);
                });
            } else {
                QuickPress.MiddleMouse.active = true;
                setTimeout(() => {
                    QuickPress.MiddleMouse.active = false;
                }, QuickPress.Timeout);
                sendClientMessage('activateMCP', { mode: 'object' }).then(
                    mcpState => {
                        console.log('activateMCP', mcpState);
                        toggleMCP(mcpState);
                    }
                );
            }
        },
    },
    gizmo: {
        middleClick: () => {
            QuickPress.MiddleMouse.active = true;
            setTimeout(() => {
                QuickPress.MiddleMouse.active = false;
            }, QuickPress.Timeout);
            sendClientMessage('activateMCP', { mode: 'gizmo' }).then(
                mcpState => {
                    toggleMCP(mcpState);
                }
            );
        },
    },
};

export const EventActions = {
    click: {
        // Animation HUD
        '#button-animsearch': () => toggleAnimationSearchHUD(),
        '#button-animconfigure': () => toggleAnimationConfigureHUD(),

        '#button-animconfadd': () => addAnimation(),
        '#button-animconfclearselected': () => clearAnimation(),
        '#button-animconfdeleteall': () => deleteAllAnimations(),

        // Object HUD
        '#button-spawn': () => toggleObjectSpawnHUD(),
        '#button-trackedobjlist': () => toggleObjectNearbyHUD(),
        '#button-importexport': () => toggleObjectImportExportHUD(),

        '#button-objDetailsPosition': () =>
            toggleObjectDetail('button-objDetailsPosition'),
        '#button-objDetailsStatus': () =>
            toggleObjectDetail('button-objDetailsStatus'),

        '#button-spawnpreview': () => {
            document.getElementById('button-spawnpreview').classList.toggle('selected');
        },
        '#button-spawnfavs': () => {
            document.getElementById('button-spawnfavs').classList.toggle('selected');
        },
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
        '#button-nearbyOrigin-set-position': () =>
            selectNearbyOrigin('set position'),
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
        '#objSettingsBorder': () => setBorder(),
        '#objSettingsCurvedBorder': () => setCurvedBorder(),
        '#objSettingsHideCamera': () => toggleHideCamera(),

        '#button-animTimings': () => toggleAnimDetail('button-animTimings'),
        '#button-animFlags': () => toggleAnimDetail('button-animFlags'),
    },
    input: {},
    mousemove: event => {
        if (
            !CursorPosDelay &&
            !MCP &&
            !GizmoActive &&
            isVisible('object-hud') &&
            !document.activeElement.classList.contains('entry')
        ) {
            CursorPosDelay = true;
            sendClientMessage('sendCursorPos', {
                x: event.clientX / ResolutionX,
                y: event.clientY / ResolutionY,
                click: LeftClickActive,
            });
            setTimeout(function () {
                CursorPosDelay = false;
            }, CursorUpdateRate);
        }
    },
    mousedown: event => {
        MouseDown = true;
        const currentHUD = getActiveSection();

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
    mouseup: event => {
        MouseDown = false;
        switch (event.button) {
            case 0: // Left Click
                LeftClickActive = false;
                break;
        }
        if (isVisible('anim-hud') || isVisible('object-hud')) {
            switch (event.button) {
                case 1: // Middle Click
                    if (!QuickPress.MiddleMouse.active) {
                        sendClientMessage('deactivateMCP', {}).then(
                            mcpState => {
                                toggleMCP(mcpState);
                            }
                        );
                    }
                    break;
            }
        }
    },
    keyup: event => {
        JustPressed[event.key] = false;
        Pressed[event.key] = false;
    },
    keydown: event => {
        if (MCP) {
            event.preventDefault();
            return;
        }
        const isInputField =
            event.target.getAttribute('contenteditable') == 'true';
        Pressed[event.key] = true;
        // Check universal nav keys
        switch (event.key) {
            case ' ':
                if (typeof event.target.onclick == 'function') {
                    event.target.onclick.apply();
                    event.preventDefault();
                    return;
                }
                break;
            case 'Tab':
                return;
            case 'Backspace':
            case 'Delete': {
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
                    if (
                        (event.key === 'Backspace' && !cursorAtStart) ||
                        (event.key === 'Delete' && cursorAtStart)
                    ) {
                        shouldClear = true;
                    }
                }

                if (shouldClear) {
                    event.target.textContent = ''; // Clear the div manually
                    event.preventDefault(); // Prevent <br> or any default action
                }
                break;
            }
        }
        JustPressed[event.key] = true;
        if (event.key == 'Escape' || !isInputField) {
            handleKeyPress(event, getActiveSection());
        } else if (isInputField) {
            if (event.key == 'Enter') {
                Object.keys(InputFields).forEach(selector => {
                    if (event.target.matches(selector)) {
                        const action = InputFields[selector];
                        action.length ? action(event) : action();
                        event.preventDefault();
                    }
                });
            }
        }
        JustPressed[event.key] = false;
    },
};

const InputFields = {
    '#objSearch': event => {
        searchSpawnObject(event.target.innerHTML);
    },
    '#selectedScene': event => {
        console.log('selectedScene event triggered', event);
        if (event.key == 'Enter' || event.inputType == 'insertParagraph') {
            saveScene();
        }
    },
    '#nearbyRange': event => {
        if (event.key == 'Enter' || event.inputType == 'insertParagraph') {
            getTrackedObjects();
        }
    },
    '#objSettingsCurvedBorderAmount': () => setCurvedBorderAmount(),
    '#animSearch': event => {
        if (event.key == 'Enter' || event.inputType == 'insertParagraph') {

            const dict = document.getElementById('animDictList');
            const anim = document.getElementById('animNameList');

            dict.textContent = '';
            dict.scrollTop = 0;
            dict.scrollLeft = -1000;

            anim.textContent = '';
            anim.scrollTop = 0;
            anim.scrollLeft = -1000;

            const value = document.getElementById('animSearch').innerHTML;
            searchAnimDicts(value);
        }
    },
    '#animConfigureEntity': event => {
        if (event.key == 'Enter' || event.inputType == 'insertParagraph') {
            setSelectedAnimation('entity', document.getElementById('animConfigureEntity').innerHTML);
        }
    },
    '#animConfigureBlendIn': event => {
        if (event.key == 'Enter' || event.inputType == 'insertParagraph') {
            setSelectedAnimation('blendIn', document.getElementById('animConfigureBlendIn').innerHTML);
        }
    },
    '#animConfigureBlendOut': event => {
        if (event.key == 'Enter' || event.inputType == 'insertParagraph') {
            setSelectedAnimation('blendOut', document.getElementById('animConfigureBlendOut').innerHTML);
        }
    },
    '#animConfigureDuration': event => {
        if (event.key == 'Enter' || event.inputType == 'insertParagraph') {
            setSelectedAnimation('duration', document.getElementById('animConfigureDuration').innerHTML);
        }
    },
    '#animConfigureRate': event => {
        if (event.key == 'Enter' || event.inputType == 'insertParagraph') {
            setSelectedAnimation('rate', document.getElementById('animConfigureRate').innerHTML);
        }
    },
    '#animConfigureDelay': event => {
        console.log("animConfigureDelay", event);
        if (event.key == 'Enter' || event.inputType == 'insertParagraph') {
            setSelectedAnimation('delay', document.getElementById('animConfigureDelay').innerHTML);
        }
    },
};

export function registerListeners() {
    tooltipListener();
    dropdownListeners();
    Object.keys(EventActions).forEach(eventType => {
        document.body.addEventListener(eventType, event => {
            const eventActions = EventActions[eventType];

            // Check if eventActions is a function
            if (typeof eventActions === 'function') {
                eventActions(event); // Call the standalone function directly
                return;
            }

            // If eventActions is a list of selectors
            Object.keys(eventActions).forEach(selector => {
                if (event.target.matches(selector)) {
                    const action = eventActions[selector];
                    action.length ? action(event) : action();
                }
            });
        });
    });
}

function getActiveSection() {
    const sections = document.querySelectorAll('section');
    for (let section of sections) {
        if (!section.classList.contains('hidden')) {
            return section.id;
        }
    }
    return null;
}


window.messagesReady = window.messagesReady || new Deferred();
{
    document.addEventListener('DOMContentLoaded', () => {
        window.addEventListener('message', function (msg) {
            switch (msg.data.type) {
                case 'ui_trie':
                    console.log('trie', msg.data.trie);
                    if (msg.data.trie) {
                        initTrie(msg.data.trie);
                    }
                    document.getElementById('dev-tree-hud').classList.toggle('hidden', msg.data.state == false);
                    break;
                case 'ui_animation':
                    toggleAnimationHUD(msg.data.state);
                    break;
                case 'ui_object':
                    toggleObjectHUD(msg.data.state);
                    break;
                case 'ui_camera':
                    document.getElementById('camera-hud').classList.toggle('hidden', msg.data.state == false);
                    break;
                case 'updateCrosshair':
                    updateCrosshair(msg.data);
                    updateObjectDetails(msg.data);
                    break;
                case 'updateCamera':
                    updateCamera(msg.data.camera);
                    break;
                // case "updateSceneObjects":
                //     updateSceneObjects(msg.data.objects);
                case 'clipboard':
                    clipboardCopy(msg.data.text);
                    break;
                case 'mcp':
                    toggleMCP(msg.data.active);
                    break;
                case 'setGizmoState':
                    GizmoActive = msg.data.data.shown;
                    document.getElementById('gizmo').classList.toggle('hidden', !GizmoActive);
                    break;
                case 'toggleHelp':
                    toggleHelp(
                        msg.data.mode,
                        msg.data.state,
                        msg.data.toggleCursor
                    );
                    break;
                case 'keyPress':
                    handleKeyPress({ key: msg.data.key }, msg.data.mode);
                    break;
            }
        });
        window.messagesReady.resolve();
    });

    window.netReady = window.netReady || new Deferred();
    window.netReady.promise.then(() => {
        fetchSpawnData();
        initSettings();
        registerListeners();
    });
}

function handleKeyPress(event, hud) {
    const rawKey = event.key;
    if (!hud) {
        return;
    }
    const lowercaseKey = rawKey.toLowerCase();
    const key = KeyTranslateMap[lowercaseKey] || lowercaseKey;

    const action = KeyActions[hud][key] || KeyActions[hud].default;
    // console.log("handleKeyPress", hud, key, event);
    if (action) {
        action(event);
    }
}

function sendKey(key) {
    sendClientMessage('dispatchKeyEvents', {
        justPressed: { [key]: true },
        pressed: Pressed,
    });
}

// Help HUD //
function toggleMCP(state) {
    MCP = state;
    toggleCrosshair(state);
}

