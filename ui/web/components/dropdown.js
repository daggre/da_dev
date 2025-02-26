export let DropDownAdvOptions = {};
export let DropDownMultiOptions = {};
export let DropDownOptions = {};

export function dropdownListeners() {
    document.querySelectorAll('.entry.dropdown').forEach(dropdown => {
        dropdown.addEventListener('click', event => {
            let x = event.pageX;
            let y = event.pageY;
            if (DropDownOptions[dropdown.id]) {
                showDropdown(
                    Object.keys(DropDownOptions[dropdown.id]),
                    x,
                    y
                ).then(option => {
                    if (option === null) {
                        return;
                    }
                    document.getElementById(dropdown.id).textContent = option;
                    DropDownOptions[dropdown.id][option]();
                });
            } else if (DropDownAdvOptions[dropdown.id]) {
                DropDownAdvOptions[dropdown.id]().then(options => {
                    showDropdown(options, x, y).then(option => {
                        if (option === null) {
                            return;
                        }
                        console.log(option, dropdown);
                        document.getElementById(dropdown.id).textContent = option.name;
                    });
                });
            } else if (DropDownMultiOptions[dropdown.id]) {
                DropDownMultiOptions[dropdown.id].fetch().then(options => {
                    showDropdown(options, x, y, true).then(modifiedOptions => {
                        if (modifiedOptions === null) {
                            return;
                        }
                        modifiedOptions.forEach(option => option.fn());
                        DropDownMultiOptions[dropdown.id]
                            .result()
                            .then(result => {
                                console.log(result, dropdown);
                                document.getElementById(dropdown.id).textContent = result;
                            });
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
 * @returns {Promise<string | null>} Resolves with the selected option, or null if dismissed.
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

        function handleKeyPress(event) {
            if (event.key === 'Enter') {
                cleanup();
                resolve(
                    multiSelect
                        ? Array.from(modifiedItems)
                        : menuItems[activeIndex].textContent
                );
            } else if (event.key === 'Escape') {
                cleanup();
                resolve(null);
            } else if (event.key === 'ArrowDown') {
                event.preventDefault();
                activeIndex = (activeIndex + 1) % menuItems.length;
                menuItems[activeIndex].focus();
            } else if (event.key === 'ArrowUp') {
                event.preventDefault();
                activeIndex =
                    (activeIndex - 1 + menuItems.length) % menuItems.length;
                menuItems[activeIndex].focus();
            } else if (event.key === ' ' && activeIndex !== -1) {
                menuItems[activeIndex].click();
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
