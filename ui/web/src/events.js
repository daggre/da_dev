import { toggleAnimationHUD, toggleAnimationSearchHUD, toggleAnimationConfigureHUD, toggleAnimDetail } from './hud/anim.js';
import { searchAnimDicts, playConfiguredAnimations, stopAnimation, playSelectedAnimation, addAnimation, resetSelectedAnimConfig, clearAnimation, deleteAllAnimations, setSelectedAnimation } from '../src/anims.js';
import { toggleCrosshair, toggleObjectSpawnHUD, toggleObjectNearbyHUD, toggleObjectSceneControlHUD, toggleObjectDetail, toggleObjectHUD, updateObjectDetails } from './hud/obj.js';
import { selectSpawnType, selectNearbyOrigin, toggleNearbyFilter, getTrackedObjects, toggleVisible, toggleFrozen, toggleCollision } from '../src/obj.js';
import { saveScene, clearScene, clearAllScenes, reloadScene, deleteScene } from '../src/scene.js';
import { showImport } from '../src/hud/import.js';
import { showExport } from '../src/hud/export.js';
import { setTooltips } from '../src/tooltip.js';
import { toggleHideCamera, updateCamera } from '../src/camera.js';
import { setBorder, setCurvedBorder, setCurvedBorderAmount } from '../src/theme.js';
import { sendClientMessage } from '../src/msg.js';
import { isVisible, isInterruptingElement } from '../src/nav.js';
import { clipboardCopy } from '../src/clipboard.js';
import { toggleSettingsHUD } from './hud/settings.js';
import { toggleHelp } from './hud/help.js';
import { initTrie } from '../src/trie.js';
import { DropDownMapOptions, showDropdown } from '../src/dropdown.js';
import { searchSpawnObject, tagSelectSort, ObjectContextOptions } from '../src/obj.js';
import { updateCrosshair } from '../src/crosshair.js';
import { Settings } from '../src/settings.js';

export let MCP = false;
export let MouseDown = false;
export let GizmoActive = false;
export let Pressed = {};
// export let JustPressed = {};
export let QuickPress = { Timeout: 400, MiddleMouse: { active: false } };

const ResolutionX = window.screen.width;
const ResolutionY = window.screen.height;
const KeyTranslateMap = { '&': '1', é: '2', '"': '3', "'": '4', };
const CursorUpdateRate = 30;
let LeftClickActive = false;
let CursorPosDelay = false;

DropDownMapOptions.objSettingsSubmitFormEvent = [
    {
        name: "enter",
        tooltip: "Evaluate Form Field If Enter Is Pressed",
        fn: () => { Settings.form.evaluateformon = "enter"; },
    },
    {
        name: "any",
        tooltip: "Evaluate Form Field On Any Change",
        fn: () => { Settings.form.evaluateformon = "any"; },
    },
]

export function addEventActionsListener() {
    Object.keys(EventActions).forEach(eventType => {
        document.addEventListener(eventType, event => {
            const eventActions = EventActions[eventType];

            if (typeof eventActions === 'function') {
                // Call standalone event function
                return eventActions(event);
            }

            Object.keys(eventActions).forEach(selector => {
                if (event.target.matches(selector)) {
                    const action = eventActions[selector];
                    action.length ? action(event) : action();
                }
            });
        });
    });
}

const InputFields = {
    '#objSearch': event => searchSpawnObject(event.target.textContent),
    // '#selectedScene': event => saveScene(),
    '#nearbyRange': event => getTrackedObjects(),
    '#animSearch': event => searchAnimDicts(document.getElementById('animSearch').textContent),
    '#animConfigureEntity': event => setSelectedAnimation('entity', document.getElementById('animConfigureEntity').textContent),
    '#animConfigureBlendIn': event => setSelectedAnimation('blendin', document.getElementById('animConfigureBlendIn').textContent),
    '#animConfigureBlendOut': event => setSelectedAnimation('blendout', document.getElementById('animConfigureBlendOut').textContent),
    '#animConfigureDuration': event => setSelectedAnimation('duration', document.getElementById('animConfigureDuration').textContent),
    '#animConfigureRate': event => setSelectedAnimation('rate', document.getElementById('animConfigureRate').textContent),
    '#animConfigureDelay': event => setSelectedAnimation('delay', document.getElementById('animConfigureDelay').textContent),
    '#objSettingsCurvedBorderAmount': () => setCurvedBorderAmount(),
};

const MouseActions = {
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
        ' ': event => clickElement(event),
        1: () => toggleAnimationSearchHUD(),
        2: () => toggleAnimationConfigureHUD(),
        h: () => toggleHelp('animHelp'),
        s: () => Pressed.Shift && !Pressed.Control && toggleSettingsHUD(),
        '?': () => toggleHelp('animHelp'),
        escape: () => {
            sendClientMessage('deactivateMode', { mode: 'animation' });
            toggleSettingsHUD(false);
        },
    },
    gizmo: {
        escape: () => {
            sendClientMessage('deactivateMode', { mode: 'gizmo' });
            toggleSettingsHUD(false);
        },
    },
    'object-hud': {
        ' ': event => clickElement(event),
        1: () => toggleObjectSpawnHUD(),
        2: () => toggleObjectSceneControlHUD(),
        3: () => toggleObjectNearbyHUD(),
        f: () => sendKey('f'),
        g: () => sendKey('g'),
        h: () => toggleHelp('objHelp'),
        '?': () => toggleHelp('objHelp'),
        r: () => sendKey('r'),
        s: () => {
            if (Pressed.Control) saveScene();
            if (Pressed.Shift && !Pressed.Control) toggleSettingsHUD();
        },
        t: () => sendKey('t'),
        x: () => sendKey('x'),
        escape: () => {
            sendClientMessage('deactivateMode', { mode: 'object' });
            toggleSettingsHUD(false);
        },
    },
    'import-hud': {
        ' ': event => clickElement(event),
        escape: () => handleEscape('importContent', 'import-hud', 'importExitOption'),
    },
    'export-hud': {
        ' ': event => clickElement(event),
        escape: () => handleEscape('exportContent', 'export-hud', 'exportExitOption'),
    },
    'camera-hud': {
        escape: () => {
            toggleHelp('camHelp', false);
            sendClientMessage('deactivateMode', { mode: 'freecam' });
            sendClientMessage('deactivateMode', { mode: 'noclip' });
            toggleSettingsHUD(false);
        },
        '?': () => toggleHelp('camHelp', false),
        h: () => toggleHelp('camHelp', false),
        s: () => Pressed.Shift && !Pressed.Control && toggleSettingsHUD(),
    },
};

export const EventActions = {
    click: {
        // Animation HUD
        '#button-animsearch': () => toggleAnimationSearchHUD(),
        '#button-animconfigure': () => toggleAnimationConfigureHUD(),

        '#button-animconf-play': () => playConfiguredAnimations(),
        '#button-animconf-stop': () => stopAnimation(),

        '#button-animconf-previewselected': () => playSelectedAnimation(),
        '#button-animconf-add': () => addAnimation(),
        '#button-animconf-resetselected': () => resetSelectedAnimConfig(),
        '#button-animconf-clear': () => clearAnimation(),
        '#button-animconf-deleteall': () => deleteAllAnimations(),

        // Object HUD
        '#button-spawn': () => toggleObjectSpawnHUD(),
        '#button-trackedobjlist': () => toggleObjectNearbyHUD(),
        '#button-scenecontrol': () => toggleObjectSceneControlHUD(),

        '#button-objDetailsPosition': () =>
            toggleObjectDetail('button-objDetailsPosition'),
        '#button-objDetailsStatus': () =>
            toggleObjectDetail('button-objDetailsStatus'),

        '#button-spawnpreview': () => {
            document.getElementById('button-spawnpreview').classList.toggle('selected');
        },
        '#button-spawnfavs': () => {
            document.getElementById('button-spawnfavs').classList.toggle('selected');
            searchSpawnObject(document.getElementById('objSearch').textContent);
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
        '#button-clearallscenes': () => clearAllScenes(),
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
        '#button-animExtras': () => toggleAnimDetail('button-animExtras'),
    },
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
        // JustPressed[event.key] = false;
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
        if (event.target.classList.contains('contentbox')) { return; }
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
            case 'Enter':
                Object.keys(InputFields).forEach(selector => {
                    if (shouldEvalForm(event.key) && event.target.matches(selector)) {
                        const action = InputFields[selector];
                        action.length ? action(event) : action();
                    }
                });
                event.preventDefault();
                break;
        }
        // JustPressed[event.key] = true;
        if (event.key == 'Escape' || !isInputField) {
            handleKeyPress(event, getActiveSection());
        }
        // JustPressed[event.key] = false;
    },
    input: event => {
        const isInputField =
            event.target.getAttribute('contenteditable') == 'true';
        if (isInputField) {
            Object.keys(InputFields).forEach(selector => {
                if (shouldEvalForm(event.key) && event.target.matches(selector)) {
                    const action = InputFields[selector];
                    action.length ? action(event) : action();
                }
            });
        }
    },
};

function shouldEvalForm(key) {
    if (Settings.form.evaluateformon == "any") {
        return true;
    } else if (Settings.form.evaluateformon == "enter") {
        return key == "Enter";
    }
}

export function addMessageListener() {
    window.addEventListener('message', msg => {
        const { type, ...data } = msg.data;
        if (MessageActions[type]) {
            MessageActions[type](data);
        }
    });
}

const MessageActions = {
    ui_trie: data => {
        console.log('trie', data.trie);
        if (data.trie) {
            initTrie(data.trie);
        }
        document.getElementById('dev-tree-hud').classList.toggle('hidden', data.state == false);
    },
    ui_animation: data => toggleAnimationHUD(data.state),
    ui_object: data => toggleObjectHUD(data.state),
    ui_camera: data => {
        document.getElementById('camera-hud').classList.toggle('hidden', data.state == false);
        document.getElementById('camStatus').classList.toggle('hidden', data.state == false);
    },
    updateCrosshair: data => {
        updateCrosshair(data);
        updateObjectDetails(data);
    },
    updateCamera: data => updateCamera(data.camera),
    // updateSceneObjects: data => updateSceneObjects(data.objects),
    clipboard: data => clipboardCopy(data.text),
    mcp: data => toggleMCP(data.active),
    setGizmoState: data => {
        GizmoActive = data.data.shown;
        document.getElementById('gizmo').classList.toggle('hidden', !GizmoActive);
    },
    toggleHelp: data => toggleHelp(data.mode, data.state, data.toggleCursor),
    keyPress: data => handleKeyPress({ key: data.key }, data.mode),
};

function getActiveSection() {
    const sections = document.querySelectorAll('section');
    for (let section of sections) {
        if (!section.classList.contains('hidden')) {
            return section.id;
        }
    }
    return null;
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

function toggleMCP(state) {
    MCP = state;
    toggleCrosshair(state);
}

export function clickElement(event) {
    const { target } = event;
    // If the target is an <li> with an onclick handler, trigger it.
    if (target.tagName === 'LI') {
        const clickEvent = new MouseEvent('click', {
            bubbles: true,
            cancelable: true,
            ctrlKey: event.ctrlKey,
            shiftKey: event.shiftKey,
            altKey: event.altKey,
        });
        target.dispatchEvent(clickEvent);
        return;
    }
    // Otherwise, use a keyed lookup for click handlers.
    const eventId = `#${target.id}`;
    const handler = EventActions.click[eventId];
    if (handler) {
        handler(event);
    }
}

// Handle hover events (pointerenter, pointerleave)
export function trackHandleHover(event) {
    const li = event.target.closest('li');
    if (!li) return;
    event.type === 'pointerenter'
        ? li.classList.add('li-hover')
        : li.classList.remove('li-hover');
    sendClientMessage('trackObject', {
        handle: li.dataset.handle,
        category: 'hover',
        remove: event.type === 'pointerleave',
    });
}

// Handle object selection (click event)
export function trackHandleClick(event) {
    const li = event.target.closest('li');
    if (!li) return;
    li.classList.add('li-select');
    sendClientMessage('trackObject', {
        handle: li.dataset.handle,
        category: 'select',
    });
}

function handleEscape(contentId, hudId, exitOptionId) {
    const content = document.getElementById(contentId);
    if (!content.matches(':focus')) {
        document.getElementById(hudId).classList.add('hidden');
    } else {
        document.activeElement.blur();
        window.getSelection().removeAllRanges();
        document.getElementById(exitOptionId).focus();
    }
}
