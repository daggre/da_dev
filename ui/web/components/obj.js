import { Settings } from './settings.js';
import { DropDownOptions } from './dropdown.js';
import { MouseDown } from './events.js';
import { sendClientMessage } from '../utils/msg.js';
import { resetList, isVisible, } from '../utils/nav.js';

let TrackedObjectsLoopRunning = false;
let SelectedObjectSpawnType = 'objects';


export const ObjectContextOptions = {
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

export function searchSpawnObject(searchString) {
    resetList('objSpawnList');
    searchObjects(
        searchString,
        Settings.spawn[SelectedObjectSpawnType],
        'objSpawnList',
        3
    );
}

function searchObjects(searchValue, searchList, elementId, tabIndex) {
    const el = document.getElementById(elementId);
    el.style.minHeight = '0';
    if (!searchValue) return;

    const maxResults = 10000;
    const selectedObject = document.getElementById('activeObject').textContent;

    if (!searchList) return;

    // Optimize filter by pre-lowering searchValue once
    const searchLower = searchValue.toLowerCase();
    const results = searchList.filter(str =>
        str.toLowerCase().includes(searchLower)
    );

    // Create fragment for efficient DOM updates
    const ul = document.createElement('ul');
    const fragment = document.createDocumentFragment();

    results.slice(0, maxResults).forEach(name => {
        const li = document.createElement('li');
        li.dataset.name = name; // Store name in dataset
        li.textContent = name;

        if (name === selectedObject) {
            li.classList.add('li-select');
        }

        if (tabIndex) li.setAttribute('tabindex', tabIndex);
        fragment.appendChild(li);
    });

    ul.appendChild(fragment);
    el.appendChild(ul);

    // Event Delegation for Hover & Click
    ul.addEventListener('pointerenter', searchHandleHover, true);
    ul.addEventListener('pointerleave', searchHandleHover, true);
    ul.addEventListener('click', searchHandleClick);

    // Set minHeight dynamically
    el.style.minHeight = `${Math.min(results.length * 0.4, 30)}vh`;
    el.scrollTop = 0;
    el.scrollLeft = 0;
}

// Handle hover events (pointerenter, pointerleave)
function searchHandleHover(event) {
    const li = event.target.closest('li');
    if (!li) return;

    const isPreviewSelected = document.getElementById('button-spawnpreview').classList.contains('selected');
    if (event.type === 'pointerenter') {
        li.classList.add('li-hover');
        if (isPreviewSelected) {
            sendClientMessage('spawnPreviewObject', { name: li.dataset.name });
        }
    } else {
        li.classList.remove('li-hover');
        if (isPreviewSelected) {
            sendClientMessage('removePreviewObject', {});
        }
    }
}

// Handle object selection (click event)
function searchHandleClick(event) {
    const li = event.target.closest('li');
    if (!li) return;

    const el = li.closest('ul').parentElement;
    el.querySelectorAll('li').forEach(li => li.classList.remove('li-select'));

    li.classList.add('li-select');
    selectSpawnObject(li.dataset.name);
}

export function getTrackedObjects() {
    if (TrackedObjectsLoopRunning) return;
    TrackedObjectsLoopRunning = true;

    const el = document.getElementById('objNearbyResults');
    resetList(el);

    const loopId = setInterval(async () => {
        if (!isVisible(el)) {
            clearInterval(loopId);
            TrackedObjectsLoopRunning = false;
            return;
        }

        if (MouseDown) return;

        const currentNearbyRange =
            document.getElementById('nearbyRange').textContent;
        if (currentNearbyRange !== Settings.nearby.range) {
            Settings.nearby.range = currentNearbyRange;
            sendClientMessage('saveSettings', {
                nearby: JSON.stringify(Settings.nearby),
            });
        }

        const resp = await sendClientMessage('nearbyObjects', {
            range: currentNearbyRange,
            origin: Settings.nearby.origin,
        });

        const objects = (resp.nearbyObjects || []).sort(
            (a, b) => a.distance - b.distance
        );
        el.textContent = '';

        const ul = document.createElement('ul');
        const fragment = document.createDocumentFragment();
        let filteredLength = 0;

        objects.forEach(
            ({
                objType,
                handle,
                networkId,
                distance,
                modelName,
                select,
                hover,
            }) => {
                if (objType && !Settings.nearby[objType]) return; // Skip if not allowed
                filteredLength++;

                const li = document.createElement('li');
                li.dataset.handle = handle;
                li.textContent = `${distance.toFixed(2)} ${handle}${networkId ? ` [${networkId}]` : ''} ${modelName}`;

                if (select) {
                    li.classList.add('li-select', 'li-pseudo-focus');
                }
                if (hover) {
                    li.classList.add('li-hover');
                }

                fragment.appendChild(li);
            }
        );

        ul.appendChild(fragment);
        el.appendChild(ul);

        // Event Delegation for Hover & Click
        ul.addEventListener('pointerenter', trackHandleHover, true);
        ul.addEventListener('pointerleave', trackHandleHover, true);
        ul.addEventListener('click', trackHandleClick);

        // Set minHeight dynamically
        el.style.minHeight = `${Math.min(filteredLength * 0.4, 15.4)}vh`;
    }, 250);
}

// Handle hover events (pointerenter, pointerleave)
function trackHandleHover(event) {
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
function trackHandleClick(event) {
    const li = event.target.closest('li');
    if (!li) return;
    console.log('trackHandleClick', li);
    li.classList.add('li-select');
    sendClientMessage('trackObject', {
        handle: li.dataset.handle,
        category: 'select',
    });
}

function selectSpawnObject(object) {
    document.getElementById('activeObject').textContent = object;
    sendClientMessage('selectSpawnObject', { name: object });
}

export function toggleNearbyFilter(type) {
    const selected = document.getElementById(`button-nearby-${type}`).classList.toggle('selected');
    Settings.nearby[type] = selected;
    sendClientMessage('saveSettings', {
        nearby: JSON.stringify(Settings.nearby),
    });
}

export function tagSelectSort(sortType) {
    document.getElementById(`button-tagsortby${Settings.tag.sort}`).classList.remove('selected');
    document.getElementById(`button-tagsortby${sortType}`).classList.add('selected');
    Settings.tag.sort = sortType;
    sendClientMessage('saveSettings', { tags: JSON.stringify(Settings.tag) });
}

const PREFIX_OBJ_SPAWN = 'button-spawn';
const PREFIX_NEARBY_ORIGIN = 'button-nearbyOrigin-';
const validSpawns = new Set([
    'objects',
    'peds',
    'vehicles',
    'propsets',
    'pickups',
    'other',
]);
const validOrigins = new Set([
    'camera',
    'offset',
    'player',
    'raycast',
    'select',
    'set position',
]);

/**
 * Generic function to handle selection changes and UI updates.
 * @param {string} type - The type of selection (e.g., "spawn", "origin").
 * @param {Set<string>} validOptions - A set of valid options.
 * @param {string} newValue - The new value to set.
 * @param {string} prefix - The button prefix for UI updates.
 * @param {Function} updateState - Function to update the global state.
 * @param {Function} onChange - Optional callback to execute when a new selection is made.
 */
function selectOption(
    type,
    validOptions,
    newValue,
    prefix,
    updateState,
    onChange = null
) {
    const prevValue = updateState(); // Get current value
    if (!prevValue || !newValue) {
        console.error(`Invalid ${type} value:`, { prevValue, newValue });
        return;
    }
    if (newValue === prevValue) return;
    if (!validOptions.has(newValue)) {
        console.error(`Invalid ${type} type:`, newValue);
        return;
    }

    updateState(newValue); // Update the state

    document.getElementById(`${prefix}${formatId(prevValue)}`).classList.remove('selected');
    document.getElementById(`${prefix}${formatId(newValue)}`).classList.add('selected');

    if (onChange) onChange(newValue); // Execute additional logic if provided
}

/**
 * Select the object spawn type.
 * @param {string} spawn - The new spawn type to select.
 */
export function selectSpawnType(spawn) {
    selectOption(
        'spawn',
        validSpawns,
        spawn,
        PREFIX_OBJ_SPAWN,
        newValue => {
            if (newValue) SelectedObjectSpawnType = newValue;
            return SelectedObjectSpawnType;
        },
        () =>
            searchSpawnObject(document.getElementById('objSearch').textContent)
    );
}

/**
 * Select the nearby origin.
 * @param {string} origin - The new nearby origin to select.
 */
export function selectNearbyOrigin(origin) {
    selectOption(
        'origin',
        validOrigins,
        origin,
        PREFIX_NEARBY_ORIGIN,
        newValue => {
            if (newValue) Settings.nearby.origin = newValue;
            return Settings.nearby.origin;
        },
        newValue => {
            document.getElementById('activeNearbyOrigin').textContent = newValue;
            sendClientMessage(
                'setNearbyOriginPos',
                newValue === 'set position' ? {} : { remove: true }
            );
            sendClientMessage('saveSettings', {
                nearby: JSON.stringify(Settings.nearby),
            });
        }
    );
}

/**
 * Format a string to be used in an ID (replaces spaces with hyphens).
 * @param {string} str - The string to format.
 * @returns {string} - The formatted string.
 */
function formatId(str) {
    return str.replace(/ /g, '-');
}

DropDownOptions.activeNearbyOrigin = Object.fromEntries(
    [...validOrigins].map(origin => [origin, () => selectNearbyOrigin(origin)])
);

export function toggleVisible(
    handle = document.getElementById('objDetailsEntityHandle')?.textContent
) {
    const state = document.getElementById('objDetailsEntityVisible').classList.contains('selected');
    sendClientMessage('setVisible', { handle: handle, state: !state });
}

export function toggleFrozen(
    handle = document.getElementById('objDetailsEntityHandle')?.textContent
) {
    const state = document.getElementById('objDetailsEntityFrozen').classList.contains('selected');
    sendClientMessage('setFrozen', { handle: handle, state: !state });
}

export function toggleCollision(
    handle = document.getElementById('objDetailsEntityHandle')?.textContent
) {
    const state = document.getElementById('objDetailsEntityCollision').classList.contains('selected');
    sendClientMessage('setCollision', { handle: handle, state: !state });
}

export function setRotation(
    handle = document.getElementById('objDetailsEntityHandle')?.textContent,
    x,
    y,
    z
) {
    sendClientMessage('setRotation', { handle: handle, x: x, y: y, z: z });
}

export function placeOnGround(
    handle = document.getElementById('objDetailsEntityHandle')?.textContent
) {
    sendClientMessage('placeOnGround', { handle: handle });
}
