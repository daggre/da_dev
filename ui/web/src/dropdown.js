export let DropDownOptions = {};
export let DropDownMapOptions = {};
export let DropDownAdvOptions = {};
export let DropDownMultiOptions = {};

export function addDropdownsListener() {
    document.querySelectorAll('.entry.dropdown').forEach(dropdown => {
        dropdown.addEventListener('click', event => {
            let x = event.pageX;
            let y = event.pageY;
            if (DropDownOptions[dropdown.id]) {
                showDropdown( Object.keys(DropDownOptions[dropdown.id]), x, y)
                    .then(option => {
                        if (option === null) { return; }
                        document.getElementById(dropdown.id).textContent = option;
                        DropDownOptions[dropdown.id][option]();
                    });

            } else if (DropDownMapOptions[dropdown.id]) {
                showDropdown(Object.values(DropDownMapOptions[dropdown.id]), x, y)
                    .then(option => {
                        if (option === null) { return; }
                        document.getElementById(dropdown.id).textContent = option.name;
                        if (option.fn) { option.fn(); }
                    });

            } else if (DropDownAdvOptions[dropdown.id]) {
                DropDownAdvOptions[dropdown.id]()
                    .then(options => {
                        showDropdown(options, x, y)
                            .then(option => {
                                if (option === null) { return; }
                                if (option.fn) { option.fn(); }
                                document.getElementById(dropdown.id).textContent = option.name;
                            });
                    });

            } else if (DropDownMultiOptions[dropdown.id]) {
                DropDownMultiOptions[dropdown.id].fetch().then(options => {
                    showDropdown(options, x, y, true)
                        .then(modifiedOptions => {
                            if (modifiedOptions === null) { return; }
                            modifiedOptions.forEach(option => option.fn());
                            DropDownMultiOptions[dropdown.id]
                        });
                });
            }
        });
    });
}

/**
 * Show a right-click popup with a list of options.
 * @param {Array<string | { name: string, tooltip?: string }>} options - List of options to display.
 * @param {number} x - The X coordinate for the popup position.
 * @param {number} y - The Y coordinate for the popup position.
 * @returns {Promise<string | object | Array | null>} Resolves with the option that was chosen — the
 *   very item you passed in, so a `{ name, value }` comes back whole — whether it was chosen by mouse
 *   or by keyboard. An array of the toggled options in multi-select. null if dismissed.
 */
export function showDropdown(options, x, y, multiSelect = false) {
    return new Promise(resolve => {
        const menu = document.createElement('div');
        menu.classList.add('context-menu');

        // Positioning and styling
        menu.style.top = `${y}px`;
        menu.style.left = `${x}px`;
        menu.style.maxHeight = '50vh';
        menu.style.overflowY = 'auto';

        const lastFocusedElement = document.activeElement;

        // Keyboard activation has no pointer. `el.click()` synthesises an event whose pageX/pageY are
        // 0, so every menu opened with Enter or Space would appear in the top-left corner of the
        // screen, nowhere near the control that opened it. Anchor it under that control instead —
        // which is the focused element, by definition of how it was just activated.
        //
        // Fixed here rather than at the ten call sites: they all pass `e.pageX, e.pageY` and none of
        // them should have to know how the click arrived.
        if (!x && !y && lastFocusedElement && lastFocusedElement.getBoundingClientRect) {
            const from = lastFocusedElement.getBoundingClientRect();
            if (from.width || from.height) {
                x = from.left + window.scrollX;
                y = from.bottom + window.scrollY + 2;
                menu.style.top = `${y}px`;
                menu.style.left = `${x}px`;
            }
        }

        const fragment = document.createDocumentFragment();

        let activeIndex = -1;
        let menuItems = [];

        // For multi-select, keep track of selected options
        const modifiedItems = new Set();

        options.forEach(option => {
            const name = typeof option === 'string' ? option : option.name;
            const tooltip = typeof option === 'string' ? '' : option.tooltip;
            let selected =
                typeof option === 'string' ? undefined : option.selected;
            const item = document.createElement('div');

            if (tooltip) item.setAttribute('aria-label', tooltip);
            item.classList.add('context-menu-item');

            // Function to update the displayed text based on selection state
            function updateText() {
                if (multiSelect) {
                    item.textContent = `${selected ? '󰄲' : ''} ${name}`;
                } else {
                    item.textContent = name;
                }
            }
            updateText();
            item.tabIndex = 0;
            menuItems.push(item);

            item.addEventListener('click', () => {
                if (multiSelect) {
                    // Toggle selection without closing the menu.
                    selected = !selected;
                    if (option.click) {
                        option.click(selected);
                    }
                    if (modifiedItems.has(option)) {
                        modifiedItems.delete(option);
                    } else {
                        modifiedItems.add(option);
                    }
                    updateText();
                } else {
                    cleanup();
                    resolve(option);
                }
            });

            fragment.appendChild(item);
        });

        menu.appendChild(fragment);
        document.body.appendChild(menu);

        // Keep the menu on-screen: if it would spill past the bottom edge (e.g. the state chip
        // sits low, above the timeline), flip it up so it opens above the click. Same for the right
        // edge. Measured after append because the height isn't known until it's laid out.
        const rect = menu.getBoundingClientRect();
        if (y + rect.height > window.innerHeight) {
            menu.style.top = `${Math.max(4, y - rect.height)}px`;
        }
        if (x + rect.width > window.innerWidth) {
            menu.style.left = `${Math.max(4, window.innerWidth - rect.width - 4)}px`;
        }

        function cleanup() {
            menu.remove();
            document.removeEventListener('pointerdown', handleOutsideClick, {
                capture: true,
            });
            document.removeEventListener('keydown', handleKeyPress);
            if (lastFocusedElement) lastFocusedElement.focus();
        }

        function handleOutsideClick(event) {
            if (!menu.contains(event.target)) {
                cleanup();
                // If its multi-select, resolve with the set of selected items
                // otherwise  dont select anything
                resolve(multiSelect ? Array.from(modifiedItems) : null);
            }
        }

        // The keyboard contract, and it is the SAME contract everywhere a dropdown opens:
        //
        //   Up / Down   move the highlight (wrapping — a menu is a ring)
        //   Enter       choose the highlighted row, exactly as clicking it would
        //   Space       toggle a row in a multi-select, leaving the menu open
        //   Escape      cancel, choosing nothing
        //
        // Enter used to resolve `menuItems[activeIndex].textContent` — a STRING — while clicking
        // resolved the option OBJECT. Every caller that passes `{ name, value }` and reads
        // `picked.value` (the scenario editor's select fields, the propset picker, the state chip)
        // therefore got `undefined` from the keyboard and silently CLEARED the field it was setting,
        // while the mouse set it correctly. So Enter now goes through the item's own click handler:
        // one path, one resolved value, no second implementation to drift.
        function handleKeyPress(event) {
            const handled = ['Enter', 'Escape', 'ArrowDown', 'ArrowUp', ' '];
            if (!handled.includes(event.key)) return;
            // A dropdown is modal while it's up: bare keys elsewhere switch HUD views, and arrows
            // scroll the page out from under it.
            event.preventDefault();
            event.stopPropagation();

            if (event.key === 'Escape') {
                cleanup();
                resolve(null);
                return;
            }
            // An empty menu can still be escaped, but there is nothing to move to or choose — and
            // `% 0` is NaN, which would take the arrows straight into a TypeError.
            if (menuItems.length === 0) return;

            if (event.key === 'Enter') {
                if (multiSelect) {
                    cleanup();
                    resolve(Array.from(modifiedItems));
                } else if (activeIndex !== -1) {
                    menuItems[activeIndex].click();   // cleanup + resolve(option), the click path
                }
            } else if (event.key === ' ') {
                // Space keeps working as it always has: it clicks the highlighted row. In a
                // multi-select that toggles and leaves the menu open; in a single-select it chooses,
                // which is also what Space does to a focused control everywhere else in this UI.
                if (activeIndex !== -1) menuItems[activeIndex].click();
            } else {
                const step = event.key === 'ArrowDown' ? 1 : -1;
                activeIndex =
                    (activeIndex + step + menuItems.length) % menuItems.length;
                menuItems[activeIndex].focus();
            }
        }

        // Add event listeners after the menu is added
        setTimeout(() => {
            document.addEventListener('pointerdown', handleOutsideClick, {
                capture: true,
            });
            document.addEventListener('keydown', handleKeyPress);
        }, 0);

        // Set initial focus for accessibility
        if (menuItems.length > 0) {
            menuItems[0].focus();
            activeIndex = 0;
        }
    });
}
