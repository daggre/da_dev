export function toggleHUD(state, hud, section, button, onShow = null) {
    const firstEl = document.getElementById(hud.sections[section][0]);
    const buttonEl = document.getElementById(button);

    state = state ?? firstEl.classList.contains('hidden');

    toggleSection(state, hud.sections[section], hud.visible, hud.all);

    if (state) {
        Object.values(hud.buttons).forEach(b => {
            const el = document.getElementById(b);
            el.classList.toggle('selected', el === buttonEl);
        });
        document.getElementById(button).focus();
        if (onShow) onShow();
    } else {
        buttonEl.classList.toggle('selected', state);
    }
}

/**
 * Toggle visibility for a specific section and its subsections.
 * @param {boolean} state - State to determine if elements should be visible.
 * @param {string} parentElementId - The main parent element's ID always visible.
 * @param {string[]} elementsToShow - List of element IDs to show when state is true.
 * @param {string[]} elementsIgnored - List of element IDs not to change.
 * @param {string[]} allElements - List of all relevant element IDs for this section.
 */
export function toggleSection(
    state,
    elementsToShow,
    elementsIgnored,
    allElements
) {
    const visibleSet = new Set(elementsToShow);

    allElements.forEach(elId => {
        const el = document.getElementById(elId);
        if (!el) return;
        if (elementsIgnored.includes(elId)) return;

        const shouldBeVisible = state && visibleSet.has(elId);
        el.classList.toggle('hidden', !shouldBeVisible);
    });
}
