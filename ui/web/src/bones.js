import { sendClientMessage } from './msg.js';
import { resetList } from './nav.js';

// Inspect tab, "bones" sub-section — ped skeleton viewer. Mirrors the obj.js list
// pattern: a filterable, clickable bone list whose selection/filter/transparency are
// pushed to Lua, which draws the matching bones in-world (see src/bones_cl.lua).
//
// The visibility/selection watcher lives in inspect.js (shared across sub-tabs); this
// module just loads/renders the list and exposes stopBones() so the controller can
// halt the in-world draw when bones is hidden.

let BoneNames = []; // names of bones present on the inspected ped (from getBones)
let SelectedBone = null; // highlighted bone name

function currentFilter() {
    const f = document.getElementById('bonesSearch');
    // Trim so a whitespace-only field counts as empty (= show all bones).
    return (f ? f.textContent : '').trim().toLowerCase();
}

// Re-apply the transparency field to the inspected entity (e.g. on tab open or when a
// new ped is selected) so a non-default alpha persists instead of resetting to opaque.
function applyAlphaIfSet() {
    if (BoneNames.length === 0) return; // no ped selected / nothing to dim
    const raw = document.getElementById('bonesAlpha').textContent.trim();
    const alpha = Number(raw);
    if (raw !== '' && !Number.isNaN(alpha) && alpha !== 255) {
        setBonesAlpha(raw);
    }
}

function renderBones() {
    const el = document.getElementById('bonesList');
    resetList(el);

    const filter = currentFilter();
    const results = BoneNames.filter(name => name.includes(filter));

    const ul = document.createElement('ul');
    const fragment = document.createDocumentFragment();
    results.forEach(name => {
        const li = document.createElement('li');
        li.dataset.name = name;
        li.textContent = name;
        if (name === SelectedBone) li.classList.add('li-select');
        fragment.appendChild(li);
    });
    ul.appendChild(fragment);
    el.appendChild(ul);

    ul.addEventListener('click', bonesHandleClick);

    el.style.minHeight = `${Math.min(results.length * 0.4, 30)}vh`;
    el.scrollTop = 0;
}

function bonesHandleClick(event) {
    const li = event.target.closest('li');
    if (!li) return;

    const listEl = li.closest('ul').parentElement;
    listEl.querySelectorAll('li').forEach(n => n.classList.remove('li-select'));
    li.classList.add('li-select');

    SelectedBone = li.dataset.name;
    sendClientMessage('selectBone', { name: SelectedBone });
}

async function fetchBones() {
    const resp = await sendClientMessage('getBones', {});
    BoneNames = resp.bones || [];
    SelectedBone = null;
    renderBones();
    applyAlphaIfSet();
}

// Load bones for the current selection. Called by inspect.js when the bones sub-tab
// is shown and whenever the selected entity changes while it's open.
export async function loadBones() {
    await fetchBones();
}

// Tell Lua to stop drawing and reset alpha. Called when the bones sub-tab is hidden
// (sub-tab switch) or the inspect panel closes.
export function stopBones() {
    sendClientMessage('bonesActive', { state: false });
}

export function searchBones(value) {
    renderBones();
    sendClientMessage('setBoneFilter', { filter: currentFilter() });
}

export function setBonesAlpha(value) {
    sendClientMessage('setBoneAlpha', { alpha: value });
}
