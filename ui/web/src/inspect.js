import { isVisible } from './nav.js';
import { loadBones, stopBones } from './bones.js';
import { loadAttributes, stopAttributes } from './attributes.js';

// Inspect tab sub-navigation controller. The inspect left column hosts two
// sub-sections — bones (ped skeleton viewer) and attributes (ped-type stats) — and
// this module owns which one is active plus the single watcher that (a) tells the
// active sub-tab to stop when the panel closes and (b) reloads it when the selected
// entity changes. Each sub-tab module exposes load()/stop() so they're interchangeable.

const Sub = {
    bones: {
        section: 'objInspectBones',
        button: 'inspect-sub-bones',
        load: loadBones,
        stop: stopBones,
    },
    attributes: {
        section: 'objInspectAttributes',
        button: 'inspect-sub-attributes',
        load: loadAttributes,
        stop: stopAttributes,
    },
};

let active = 'bones';
let watching = false;
let loadedHandle = null;

function currentHandle() {
    return document.getElementById('objDetailsEntityHandle').textContent || null;
}

// Show one sub-section, hide the others, sync the sub-tab buttons, and (re)load it.
function activate(name) {
    Object.entries(Sub).forEach(([key, sub]) => {
        const on = key === name;
        document.getElementById(sub.section).classList.toggle('hidden', !on);
        const btn = document.getElementById(sub.button);
        btn.classList.toggle('selected', on);
        btn.setAttribute('aria-pressed', on ? 'true' : 'false');
    });
    active = name;
    loadedHandle = currentHandle();
    Sub[name].load();
}

// Called by toggleObjectInspectHUD's onShow. Activates the last-used sub-tab and
// starts the watcher.
export function showInspect() {
    activate(active);
    startWatch();
}

// Called from the sub-tab button clicks (events.js). Stops the outgoing sub-tab so
// its in-world draw / state is torn down before the new one loads.
export function switchInspectSub(name) {
    if (name === active || !Sub[name]) return;
    Sub[active].stop();
    activate(name);
}

function startWatch() {
    if (watching) return;
    watching = true;

    const el = document.getElementById('objInspectLeftColumn');
    const loopId = setInterval(() => {
        if (!isVisible(el)) {
            clearInterval(loopId);
            watching = false;
            Sub[active].stop();
            return;
        }
        // Reload the active sub-tab when the player selects a different entity.
        const handle = currentHandle();
        if (handle !== loadedHandle) {
            loadedHandle = handle;
            Sub[active].load();
        }
    }, 300);
}
