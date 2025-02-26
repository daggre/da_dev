import { toggleCrosshair } from "./obj.js";
import { isVisible } from "../../utils/nav.js";

export function toggleHelp(elementId, state) {
    if (state === undefined) {
        state = !isVisible(elementId);
    }
    const settingsHidden = document.getElementById('button-settings').classList.toggle('hidden', state);
    const helpHidden = document.getElementById(elementId).classList.toggle('hidden', !state);
    if (elementId == 'objHelp') {
        toggleCrosshair(helpHidden);
    }
}
