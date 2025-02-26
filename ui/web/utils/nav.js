import { EventActions } from '../script.js';

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

export function elementSetOnlyClass(elOrId, cls, classes) {
    const el =
        typeof elOrId === 'string' ? document.getElementById(elOrId) : elOrId;
    if (!el) {
        console.error(`Element not found: ${elOrId}`);
        return false; // Return false if the element is not found
    }

    const classList = el.classList;

    // Remove all classes from the provided list
    classes.forEach(c => {
        if (c !== cls) classList.remove(c);
    });

    // Add the target class
    classList.add(cls);

    return true; // Return true to confirm successful operation
}

/**
 * Add, remove, or toggle a class on an element.
 * @param {string|HTMLElement} elOrId - Element or element ID.
 * @param {string} cls - Class name to toggle/add/remove.
 * @param {boolean|undefined} [state] - Optional. true to add, false to remove, undefined to toggle.
 */
export function elementSetClass(elOrId, cls, state) {
    const el =
        typeof elOrId === 'string' ? document.getElementById(elOrId) : elOrId;

    if (!el) {
        console.error(`Element not found: ${elOrId}`);
        return;
    }

    if (state === true) {
        el.classList.add(cls); // Add class
    } else if (state === false) {
        el.classList.remove(cls); // Remove class
    } else {
        el.classList.toggle(cls); // Toggle class if state is undefined
    }
    return el.classList.contains(cls);
}

export function elementSetText(elOrId, text) {
    const el =
        typeof elOrId === 'string' ? document.getElementById(elOrId) : elOrId;
    if (!el) {
        console.error(`Element not found: ${elOrId}`);
        return false; // Return false if the element is not found
    }
    el.innerText = text;
}

export function isSelected(elOrId) {
    elementHasClass(elOrId, 'selected');
}

export function elementHasClass(elOrId, className) {
    const el =
        typeof elOrId === 'string' ? document.getElementById(elOrId) : elOrId;
    if (!el) {
        console.error(`Element not found: ${elOrId}`);
        return false; // Return false if the element is not found
    }
    return el.classList.contains(className);
}

export function isVisible(elOrId) {
    const el =
        typeof elOrId === 'string' ? document.getElementById(elOrId) : elOrId;
    if (!el) {
        console.error(`Element not found: ${elOrId}`);
        return false; // Return false if the element is not found
    }
    const style = window.getComputedStyle(el);
    if (style.display === 'none') {
        return false;
    }
    if (style.visibility === 'hidden') {
        return false;
    }
    return true;
}

/**
 * Initialize elements by hiding all elements except those in the visible list.
 * @param {string[]} allElements - List of all element IDs.
 * @param {string[]} visibleElements - List of element IDs to remain visible.
 */
export function initializeElements(allElements, visibleElements) {
    const visibleSet = new Set(visibleElements);

    allElements.forEach(elId => {
        const el = document.getElementById(elId);
        if (!el) return;

        const shouldBeHidden = !visibleSet.has(elId);
        updateElementVisibility(el, !shouldBeHidden);
    });
}

/**
 * Update the visibility of an element based on state.
 * @param {HTMLElement} el - The DOM element.
 * @param {boolean} isVisible - Whether the element should be visible.
 */
function updateElementVisibility(el, isVisible) {
    if (isVisible) {
        if (el.classList.contains('hidden')) el.classList.remove('hidden');
    } else {
        if (!el.classList.contains('hidden')) el.classList.add('hidden');
    }
}

export function resetList(elOrId) {
    const el =
        typeof elOrId === 'string' ? document.getElementById(elOrId) : elOrId;
    if (!el) {
        console.error(`Element not found: ${elOrId}`);
        return false; // Return false if the element is not found
    }
    el.textContent = '';
    el.style.minHeight = '0';
    el.scrollTop = 0;
    el.scrollLeft = 0;
}

export function isInterruptingElement(target) {
    return (
        target.classList.contains('entry') ||
        target.classList.contains('control') ||
        target.classList.contains('label') ||
        target.closest('.context-menu') ||
        target.closest('.label') ||
        target.closest('.entry') ||
        target.closest('.control')
    );
}
