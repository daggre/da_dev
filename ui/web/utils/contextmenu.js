/**
 * Show a right-click popup with a list of options.
 * @param {Array<string | { name: string, tooltip?: string }>} options - List of options to display.
 * @param {number} x - The X coordinate for the popup position.
 * @param {number} y - The Y coordinate for the popup position.
 * @returns {Promise<string | null>} Resolves with the selected option, or null if dismissed.
 */
export function showContextMenu(options, x, y, multiSelect = false) {
    return new Promise((resolve) => {
        const menu = document.createElement("div");
        menu.classList.add("context-menu");

        // Positioning and styling
        menu.style.top = `${y}px`;
        menu.style.left = `${x}px`;
        menu.style.maxHeight = "50vh";
        menu.style.overflowY = "auto";

        const lastFocusedElement = document.activeElement;
        const fragment = document.createDocumentFragment();

        let activeIndex = -1;
        let menuItems = [];

        // For multi-select, keep track of selected options
        const modifiedItems = new Set();

        options.forEach((option) => {
            const name = typeof option === "string" ? option : option.name;
            const tooltip = typeof option === "string" ? "" : option.tooltip;
            let selected = typeof option === "string" ? undefined : option.selected;
            const item = document.createElement("div");

            if (tooltip) item.setAttribute("aria-label", tooltip);
            item.classList.add("context-menu-item");

            // Function to update the displayed text based on selection state
            function updateText() {
                if (multiSelect) {
                    item.textContent = `${selected ? "󰄲" : ""} ${name}`;
                } else {
                    item.textContent = name;
                }
            }
            updateText();
            item.tabIndex = 0;
            menuItems.push(item);

            item.addEventListener("click", () => {
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
            document.removeEventListener("pointerdown", handleOutsideClick, { capture: true });
            document.removeEventListener("keydown", handleKeyPress);
            if (lastFocusedElement) lastFocusedElement.focus();
        }

        function handleOutsideClick(event) {
            if (!menu.contains(event.target)) {
                cleanup();
                resolve(multiSelect ? Array.from(modifiedItems) : null);
            }
        }

        function handleKeyPress(event) {
            if (event.key === "Enter") {
                cleanup();
                resolve(multiSelect ? Array.from(modifiedItems) : null);
            } else if (event.key === "Escape") {
                cleanup();
                resolve(null);
            } else if (event.key === "ArrowDown") {
                event.preventDefault();
                activeIndex = (activeIndex + 1) % menuItems.length;
                menuItems[activeIndex].focus();
            } else if (event.key === "ArrowUp") {
                event.preventDefault();
                activeIndex = (activeIndex - 1 + menuItems.length) % menuItems.length;
                menuItems[activeIndex].focus();
            } else if (event.key === " " && activeIndex !== -1) {
                menuItems[activeIndex].click();
            }
        }

        // Add event listeners after the menu is added
        setTimeout(() => {
            document.addEventListener("pointerdown", handleOutsideClick, { capture: true });
            document.addEventListener("keydown", handleKeyPress);
        }, 0);

        // Set initial focus for accessibility
        if (menuItems.length > 0) {
            menuItems[0].focus();
            activeIndex = 0;
        }
    });
}

// export function showContextMenu(options, x, y) {
//     return new Promise((resolve) => {
//         const menu = document.createElement("div");
//         menu.classList.add("context-menu");
//
//         // Ensure menu stays within viewport
//         const menuWidth = 200; // Approximate width
//         const menuHeight = options.length * 30; // Approximate height per item
//         menu.style.top = `${y}px`;
//         menu.style.left = `${x}px`;
//         menu.style.maxHeight = "50vh";
//         menu.style.overflowY = "auto";
//
//         const lastFocusedElement = document.activeElement;
//         const fragment = document.createDocumentFragment();
//
//         let activeIndex = -1; // Track focused item for keyboard navigation
//         let menuItems = []; // Store references to all menu items
//
//         console.log(options);
//         options.forEach((option, index) => {
//             console.log(option,index);
//             const name = typeof option === "string" ? option : option.name;
//             const tooltip = typeof option === "string" ? "" : option.tooltip;
//             const selected = typeof option === "string" ? undefined : option.selected;
//             const item = document.createElement("div");
//
//             if (tooltip) item.setAttribute("aria-label", tooltip);
//             item.classList.add("context-menu-item");
//             if (selected !== undefined) {
//                 console.log(name, selected)
//                 item.textContent = `${selected ? "󰄲" : ""} ${name}`;
//             } else {
//                 item.textContent = name;
//             }
//             item.tabIndex = 0; // Allow focus via keyboard
//             menuItems.push(item);
//
//             item.addEventListener("click", () => {
//                 cleanup();
//                 resolve(option);
//             });
//
//             fragment.appendChild(item);
//         });
//
//         menu.appendChild(fragment);
//         document.body.appendChild(menu);
//
//         function cleanup() {
//             menu.remove();
//             document.removeEventListener("pointerdown", handleOutsideClick, { capture: true });
//             document.removeEventListener("keydown", handleKeyPress);
//             if (lastFocusedElement) lastFocusedElement.focus();
//         }
//
//         function handleOutsideClick(event) {
//             if (!menu.contains(event.target)) {
//                 cleanup();
//                 resolve(null);
//             }
//         }
//
//         function handleKeyPress(event) {
//             if (event.key === "Escape") {
//                 cleanup();
//                 resolve(null);
//             } else if (event.key === "ArrowDown") {
//                 event.preventDefault();
//                 activeIndex = (activeIndex + 1) % menuItems.length;
//                 menuItems[activeIndex].focus();
//             } else if (event.key === "ArrowUp") {
//                 event.preventDefault();
//                 activeIndex = (activeIndex - 1 + menuItems.length) % menuItems.length;
//                 menuItems[activeIndex].focus();
//             } else if (event.key === "Enter" && activeIndex !== -1) {
//                 menuItems[activeIndex].click();
//             }
//         }
//
//         // Ensure the events are added after the menu is added
//         setTimeout(() => {
//             document.addEventListener("pointerdown", handleOutsideClick, { capture: true });
//             document.addEventListener("keydown", handleKeyPress);
//         }, 0);
//
//         // Set initial focus on the first item for accessibility
//         if (menuItems.length > 0) {
//             menuItems[0].focus();
//             activeIndex = 0;
//         }
//     });
// }
