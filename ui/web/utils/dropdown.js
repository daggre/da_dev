import { elementSetText } from "./nav.js";
import { showContextMenu } from "./contextmenu.js";

export let DropDownAdvOptions = {};
export let DropDownMultiOptions = {};
export let DropDownOptions = {};

export function dropdownListeners() {
    document.querySelectorAll(".entry.dropdown").forEach(dropdown => {
        dropdown.addEventListener("click", event => {
            let x = event.pageX;
            let y = event.pageY;
            if (DropDownOptions[dropdown.id]) {
                showContextMenu(Object.keys(DropDownOptions[dropdown.id]), x, y).then(option => {
                    if (option === null) { return; }
                    elementSetText(dropdown.id, option);
                    DropDownOptions[dropdown.id][option]()
                });
            } else if (DropDownAdvOptions[dropdown.id]) {
                DropDownAdvOptions[dropdown.id]().then(options => {
                    showContextMenu(options, x, y).then(option => {
                        if (option === null) { return; }
                        elementSetText(dropdown.id, option.fn());
                    });
                });
            } else if (DropDownMultiOptions[dropdown.id]) {
                DropDownMultiOptions[dropdown.id].fetch().then(options => {
                    showContextMenu(options, x, y, true).then(modifiedOptions => {
                        if (modifiedOptions === null) { return; }
                        modifiedOptions.forEach(option => option.fn());
                        DropDownMultiOptions[dropdown.id].result().then(result => {
                            elementSetText(dropdown.id, result);
                        });
                    });
                });
            }
        });
    });
}

