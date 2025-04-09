import { toggleCrosshair } from "../../src/hud/obj.js";
import { isVisible } from "../../src/nav.js";

export function toggleHelp(elementId, state) {
    if (state === undefined) {
        state = !isVisible(elementId);
    }
    const helpHidden = document.getElementById(elementId).classList.toggle('hidden', !state);
    if (elementId == 'objHelp') {
        toggleCrosshair(helpHidden);
    }
}
