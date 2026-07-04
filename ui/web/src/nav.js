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
    // A hidden ancestor (e.g. the object-hud section) hides this element too,
    // but getComputedStyle only reports the element's own style. `.hidden` is
    // `display: none !important` — the app's single hide mechanism — so the
    // nearest-or-self `.hidden` reliably means "not rendered". This stops the
    // scene/obj/inspect polling loops when their whole mode is hidden.
    if (el.closest('.hidden')) {
        return false;
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
    el.innerHTML = '';
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
