import { Settings } from './settings.js';
import { DropDownOptions } from './dropdown.js';
import { MouseDown } from '../script.js';
import { sendClientMessage } from '../utils/msg.js';
import {
    resetList,
    isVisible,
    elementSetClass,
    elementHasClass,
    elementSetText,
} from '../utils/nav.js';

let TrackedObjectsLoopRunning = false;
let SelectedObjectSpawnType = 'objects';

export function searchSpawnObject(searchString) {
    resetList('objSpawnList');
    searchObjects(
        searchString,
        Settings.Spawn[SelectedObjectSpawnType],
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

    const isPreviewSelected = elementHasClass(
        'button-spawnpreview',
        'selected'
    );
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
        if (currentNearbyRange !== Settings.Nearby.range) {
            Settings.Nearby.range = currentNearbyRange;
            sendClientMessage('setObjSettings', {
                nearby: JSON.stringify(Settings.Nearby),
            });
        }

        const resp = await sendClientMessage('nearbyObjects', {
            range: currentNearbyRange,
            origin: Settings.Nearby.origin,
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
                if (objType && !Settings.Nearby[objType]) return; // Skip if not allowed
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
    elementSetText('activeObject', object);
    sendClientMessage('selectSpawnObject', { name: object });
}

export function toggleNearbyFilter(type) {
    const selected = elementSetClass(`button-nearby-${type}`, 'selected');
    Settings.Nearby[type] = selected;
    sendClientMessage('setObjSettings', {
        nearby: JSON.stringify(Settings.Nearby),
    });
}

export function tagSelectSort(sortType) {
    elementSetClass(`button-tagsortby${Settings.Tag.sort}`, 'selected', false);
    elementSetClass(`button-tagsortby${sortType}`, 'selected', true);
    Settings.Tag.sort = sortType;
    sendClientMessage('setObjSettings', { tags: JSON.stringify(Settings.Tag) });
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

    elementSetClass(`${prefix}${formatId(prevValue)}`, 'selected', false);
    elementSetClass(`${prefix}${formatId(newValue)}`, 'selected', true);

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
            if (newValue) Settings.Nearby.origin = newValue;
            return Settings.Nearby.origin;
        },
        newValue => {
            elementSetText('activeNearbyOrigin', newValue);
            sendClientMessage(
                'setNearbyOriginPos',
                newValue === 'set position' ? {} : { remove: true }
            );
            sendClientMessage('setObjSettings', {
                nearby: JSON.stringify(Settings.Nearby),
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
    const state = elementHasClass('objDetailsEntityVisible', 'selected');
    sendClientMessage('setVisible', { handle: handle, state: !state });
}

export function toggleFrozen(
    handle = document.getElementById('objDetailsEntityHandle')?.textContent
) {
    const state = elementHasClass('objDetailsEntityFrozen', 'selected');
    sendClientMessage('setFrozen', { handle: handle, state: !state });
}

export function toggleCollision(
    handle = document.getElementById('objDetailsEntityHandle')?.textContent
) {
    const state = elementHasClass('objDetailsEntityCollision', 'selected');
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
