// Prop mode UI: author a propset — model + bone + offset/rotation — against a live base entity.
//
// Lua (mode_prop_cl.lua) holds the live picture: every field edit sends the WHOLE config through
// `propApply`, which spawns/re-attaches the helper object. The deliverable is copy-Lua of a
// `Propset.<Name> = { ... }` block for da_anims' src/data/propset_cl.lua (or a plugin lib).
//
// The bone picker reuses bones_cl end to end: `getBones` enumerates the base's skeleton (via the
// object-mode `Select` global, which mode_prop points at the base), hovering a name highlights
// that bone in-world (`selectBone`), and closing the list turns the overlay off (`bonesActive`).
import { sendClientMessage } from '../src/msg.js';
import { clipboardCopy } from '../src/clipboard.js';
import { Settings } from '../src/settings.js';
import { invalidatePropsetCache } from '../src/scenario.js';

const cfg = {
    name: 'MyProp',
    model: '',
    bone: '',
    pos: { x: 0, y: 0, z: 0 },
    rot: { x: 0, y: 0, z: 0 },
};

let armed = false;      // base field clicked; next backdrop click picks the base
let applyTimer = null;
let status = '';
let sectionActive = false; // prop subsection is the one showing (gates the R = gizmo key)

// Set when the prop section was opened by a scenario field's "＋ new" — on the next successful
// save we write the name back into that field and return to the scenario editor.
let pendingReturn = null; // { apply(name) }

// Set when prop mode is editing a specific ATTACH ROW (the new model): Apply writes the model +
// placement back to that row and returns. This is the primary flow; save-as-reusable is secondary.
let pendingApply = null; // (model, { bone, position, rotation }) => void
let boundPropId = null;  // the prop id being placed, for the header
// True only while openPropForRow/openPropForNew is driving the section switch, so onPropShown can
// tell a seeded open from a bare key-3 open (which should clear any stale binding).
let programmaticOpen = false;

// Saved propsets persist in localStorage (like scenario drafts) as name -> authored fields, and
// are re-registered into da_anims' live table on load so the dropdowns have them every session.
const LS_PROPS = 'da_dev.savedPropsets';

function el(id) { return document.getElementById(id); }

function savedPropsets() {
    try { return JSON.parse(localStorage.getItem(LS_PROPS)) || {}; } catch { return {}; }
}

function persistPropset(name, entry) {
    const all = savedPropsets();
    all[name] = entry;
    localStorage.setItem(LS_PROPS, JSON.stringify(all));
}

function setStatus(text, ok) {
    status = text || '';
    const s = el('propStatus');
    s.textContent = status;
    s.className = ok === false ? 'scn-err' : 'scn-ok';
}

// One write path, debounced a touch so typing a coordinate doesn't re-attach per keystroke.
function apply() {
    clearTimeout(applyTimer);
    applyTimer = setTimeout(async () => {
        if (!cfg.model) return;
        const res = await sendClientMessage('propApply', {
            model: cfg.model, bone: cfg.bone, pos: cfg.pos, rot: cfg.rot,
        });
        setStatus(res?.ok ? `attached ${cfg.model}${cfg.bone ? ' → ' + cfg.bone : ''}`
                          : (res?.reason || 'apply failed'), res?.ok);
    }, 150);
}

// ── the emitted Lua ──

function fmtNum(n) {
    const v = Number(n) || 0;
    return Number.isInteger(v) ? v.toFixed(1) : String(v);
}

function vecText(v) {
    return `vec3(${fmtNum(v.x)}, ${fmtNum(v.y)}, ${fmtNum(v.z)})`;
}

function propsetLua() {
    const name = (cfg.name || 'MyProp').replace(/\W/g, '');
    const lines = [`Propset.${name} = {`];
    lines.push(`    objectHash = \`${cfg.model}\`,`);
    if (cfg.bone) lines.push(`    bone       = "${cfg.bone}",`);
    const zero = v => !Number(v.x) && !Number(v.y) && !Number(v.z);
    if (!zero(cfg.pos)) lines.push(`    position   = ${vecText(cfg.pos)},`);
    if (!zero(cfg.rot)) lines.push(`    rotation   = ${vecText(cfg.rot)},`);
    lines.push('}');
    return lines.join('\n');
}

// ── model search (the object spawn UI's data, filtered in place) ──

function renderModelList() {
    const list = el('propModelList');
    const q = el('propModel').textContent.trim().toLowerCase();
    list.innerHTML = '';
    if (q.length < 2) { list.classList.add('hidden'); return; }

    const src = Settings.spawn.object || [];
    const matches = [];
    for (const name of src) {
        if (name.toLowerCase().includes(q)) { matches.push(name); if (matches.length >= 60) break; }
    }
    if (!matches.length) { list.classList.add('hidden'); return; }

    const ul = document.createElement('ul');
    for (const name of matches) {
        const li = document.createElement('li');
        li.textContent = name;
        li.tabIndex = 16;
        li.onclick = () => {
            cfg.model = name;
            el('propModel').textContent = name;
            list.classList.add('hidden');
            apply();
        };
        ul.appendChild(li);
    }
    list.appendChild(ul);
    list.classList.remove('hidden');
}

// ── bone picker (bones_cl round-trip) ──

let boneNames = null;

async function openBoneList() {
    const res = await sendClientMessage('getBones', {});
    boneNames = res?.bones || [];
    sendClientMessage('bonesActive', { state: true });
    renderBoneList();
}

function closeBoneList() {
    el('propBoneList').classList.add('hidden');
    sendClientMessage('bonesActive', { state: false });
}

function renderBoneList() {
    const list = el('propBoneList');
    list.innerHTML = '';
    if (!boneNames) { list.classList.add('hidden'); return; }
    const q = el('propBone').textContent.trim().toLowerCase();
    // keep the in-world bone labels tracking the list filter (bones_cl draws matching bones only)
    sendClientMessage('setBoneFilter', { filter: q });

    const ul = document.createElement('ul');
    const none = document.createElement('li');
    none.textContent = '(root — no bone)';
    none.tabIndex = 16;
    none.onclick = () => { pickBone(''); };
    ul.appendChild(none);

    for (const name of boneNames) {
        if (q && !name.toLowerCase().includes(q)) continue;
        const li = document.createElement('li');
        li.textContent = name;
        li.tabIndex = 16;
        // Hover = highlight that bone on the (x-rayed) base in-world. THE way to find a hand
        // bone out of two hundred names.
        li.onpointerenter = () => sendClientMessage('selectBone', { name });
        li.onclick = () => { pickBone(name); };
        ul.appendChild(li);
    }
    list.appendChild(ul);
    if (boneNames.length === 0) {
        const li = document.createElement('li');
        li.textContent = '(base is not a ped — root attach only)';
        ul.appendChild(li);
    }
    list.classList.remove('hidden');
}

function pickBone(name) {
    cfg.bone = name;
    el('propBone').textContent = name || '(root)';
    closeBoneList();
    apply();
}

// ── base picking (click the game window) ──

function armBasePick() {
    armed = true;
    el('propBase').classList.add('selected');
    setStatus('move over an entity — it boxes; click to pick (Esc to cancel)');
    sendClientMessage('propArmBase', { state: true });
}

function disarmBasePick() {
    if (!armed) return;
    armed = false;
    el('propBase').classList.remove('selected');
    sendClientMessage('propArmBase', { state: false });
}

// Feed the NUI cursor to the Lua draw thread while armed, throttled so a mousemove storm doesn't
// flood NUI. The draw thread rays from this to box the hovered entity.
let cursorSentAt = 0;
function onArmedMouseMove(e) {
    if (!armed) return;
    const now = performance.now();
    if (now - cursorSentAt < 30) return;
    cursorSentAt = now;
    sendClientMessage('propCursor', {
        x: e.clientX / window.innerWidth,
        y: e.clientY / window.innerHeight,
    });
}

async function onBackdropClick(e) {
    if (!armed) return;
    // Only a click on the BACKDROP (the game view) picks — clicks on cards/fields do their thing.
    if (e.target.closest('.card, .control, .entry, li, .bar, .list')) return;
    // Pick FIRST (Lua resolves the boxed hover, then stops picking), then drop the local armed
    // state — so disarming can't null the hover out from under the pick.
    const res = await sendClientMessage('propSetBase', {
        x: e.clientX / window.innerWidth,
        y: e.clientY / window.innerHeight,
    });
    armed = false;
    el('propBase').classList.remove('selected');
    if (!res?.ok) { setStatus('no entity under the cursor', false); return; }
    el('propBase').textContent = `${res.model} (${res.handle})`;
    boneNames = null; // a new base has a new skeleton
    setStatus(res.isPed ? 'base picked' : 'base picked (not a ped — no bone list)', true);
    apply();
}

async function resetBase() {
    await sendClientMessage('propBaseReset', {});
    el('propBase').textContent = 'player';
    boneNames = null;
    apply();
}

// ── numeric fields ──

function numEntry(id, obj, key) {
    const entry = el(id);
    entry.textContent = String(obj[key]);
    const commit = () => {
        const n = Number(entry.textContent.trim());
        obj[key] = Number.isFinite(n) ? n : 0;
        entry.textContent = String(obj[key]);
        apply();
    };
    entry.addEventListener('blur', commit);
    entry.addEventListener('keydown', e => {
        if (e.key === 'Enter') { e.preventDefault(); entry.blur(); }
        if (e.key === 'Escape') { entry.textContent = String(obj[key]); entry.blur(); }
        e.stopPropagation();
    });
}

// Push the in-memory config into the DOM fields — used when a launch seeds prop mode from a
// scenario field, so the section opens already showing what it's about to author.
function syncFields() {
    el('propName').textContent = cfg.name;
    el('propModel').textContent = cfg.model;
    el('propBone').textContent = cfg.bone || '(root)';
    el('propPosX').textContent = String(cfg.pos.x);
    el('propPosY').textContent = String(cfg.pos.y);
    el('propPosZ').textContent = String(cfg.pos.z);
    el('propRotX').textContent = String(cfg.rot.x);
    el('propRotY').textContent = String(cfg.rot.y);
    el('propRotZ').textContent = String(cfg.rot.z);
}

// The live-registration half of a save: push the authored fields into da_anims' Propset table
// (model NAME hashed on the Lua side). A dotted name registers as an attach variant.
function registerSaved(name, entry) {
    return sendClientMessage('propRegister', {
        name, model: entry.model, bone: entry.bone, pos: entry.pos, rot: entry.rot,
    });
}

// Save: register live, persist to localStorage, refresh the scenario dropdown cache. If we were
// launched from a scenario field, write the name back into it and return to the editor.
async function saveProp() {
    if (!cfg.model) { setStatus('pick a model first', false); return; }
    const name = (cfg.name || '').trim();
    if (!name) { setStatus('name the propset first', false); return; }
    const entry = { model: cfg.model, bone: cfg.bone, pos: { ...cfg.pos }, rot: { ...cfg.rot } };
    const res = await registerSaved(name, entry);
    if (!res?.ok) { setStatus(res?.error || 'save failed', false); return; }
    persistPropset(name, entry);
    invalidatePropsetCache();
    setStatus(`saved "${name}" — now in the prop dropdown`, true);
    if (pendingReturn) {
        const back = pendingReturn; pendingReturn = null;
        back.apply(name);
        returnToScenario();
    }
}

// On load, re-push every saved propset into the live table so the dropdowns carry them this
// session too. Bases before variants — a variant's base must already be registered.
async function reRegisterSaved() {
    const all = savedPropsets();
    const names = Object.keys(all).sort(
        (a, b) => a.split('.').length - b.split('.').length || a.localeCompare(b));
    for (const name of names) await registerSaved(name, all[name]);
    if (names.length) invalidatePropsetCache();
}

function returnToScenario() {
    document.getElementById('button-animscenario').click();
    onPropShown(false); // the scenario toggle doesn't notify us; reset picking/overlay ourselves
}

// The scenario editor's "edit in 3D" calls this: bind prop mode to a specific attach row. The
// model is the prop's (fixed — picking one here sets it), bone/offset/rotation are the row's
// placement, edited live on your ped. Apply writes model + placement back through onApply.
// `seed`: { prop, model, attach:{bone,position,rotation}, onApply(model, placement), hint }.
export function openPropForRow(seed) {
    const a = seed.attach || {};
    cfg.name = seed.prop || 'prop';
    cfg.model = seed.model || '';
    cfg.bone = a.bone || '';
    cfg.pos = { x: (a.position && a.position.x) || 0, y: (a.position && a.position.y) || 0, z: (a.position && a.position.z) || 0 };
    cfg.rot = { x: (a.rotation && a.rotation.x) || 0, y: (a.rotation && a.rotation.y) || 0, z: (a.rotation && a.rotation.z) || 0 };
    pendingApply = seed.onApply || null;
    pendingReturn = null;
    boundPropId = seed.prop || null;
    programmaticOpen = true;
    document.getElementById('button-animprop').click(); // switch to the prop section
    syncFields();
    updateBound();
    if (cfg.model) apply(); // live preview if the model is already known
    setStatus(seed.hint || 'place the prop, then Apply', true);
}

// Write the model + placement back to the bound row and return to the scenario editor.
function applyToRow() {
    if (!pendingApply) { setStatus('nothing to apply to', false); return; }
    const placement = {
        position: { ...cfg.pos },
        rotation: { ...cfg.rot },
    };
    if (cfg.bone) placement.bone = cfg.bone; // blank bone = entity root, omit the key
    const back = pendingApply;
    pendingApply = null;
    boundPropId = null;
    back(cfg.model || '', placement);
    returnToScenario();
}

// Show/hide the Apply button + prop-id header depending on whether we're bound to a row.
function updateBound() {
    const applyBtn = document.getElementById('button-prop-apply');
    const hdr = document.getElementById('propBoundHdr');
    if (applyBtn) applyBtn.classList.toggle('hidden', !pendingApply);
    if (hdr) {
        hdr.textContent = boundPropId ? `placing: ${boundPropId}` : '';
        hdr.classList.toggle('hidden', !boundPropId);
    }
}

// The scenario editor's "＋ new" affordance calls this: open the prop section seeded to author a
// new base propset or attach variant, and remember to write the saved name back into the field.
// `seed`: { name, onSaved(name), hint }.
export function openPropForNew(seed) {
    pendingApply = null;
    boundPropId = null;
    cfg.name = seed.name || 'MyProp';
    cfg.model = '';
    cfg.bone = '';
    cfg.pos = { x: 0, y: 0, z: 0 };
    cfg.rot = { x: 0, y: 0, z: 0 };
    pendingReturn = seed.onSaved ? { apply: seed.onSaved } : null;
    programmaticOpen = true;
    document.getElementById('button-animprop').click(); // switch to the prop section
    syncFields();
    updateBound();
    setStatus(seed.hint || 'author the prop, then Save', true);
}

// Called by hud/anim.js when the prop section shows/hides, so Lua can point `Select` at the base
// (bone picker) and shut the skeleton overlay off when the section closes.
export function onPropShown(state) {
    sectionActive = !!state;
    sendClientMessage('propModeActive', { state: !!state });
    if (state) {
        // A bare open (key 3 / the nav button) starts a fresh standalone session — drop any stale
        // row binding left over from an "edit in 3D" the user navigated away from. A seeded open
        // (openPropForRow/New) sets programmaticOpen so its binding survives.
        if (!programmaticOpen) {
            pendingApply = null;
            pendingReturn = null;
            boundPropId = null;
            updateBound();
        }
        programmaticOpen = false;
    } else {
        disarmBasePick();
        closeBoneList();
    }
}

// Grab the attached prop with the gizmo (R key / the gizmo button). No-op unless the prop
// subsection is showing (the `r` key is shared across anim-hud subsections). Surfaces the Lua-side
// gate — "bone math not locked" — as a status line, so it reads clearly while the feature is inert.
export async function launchPropGizmo() {
    if (!sectionActive) return;
    // Don't fire from an `r` typed into a field (the anim-hud `r` key is shared across subsections).
    const ae = document.activeElement;
    if (ae && (ae.isContentEditable || ae.tagName === 'INPUT')) return;
    if (!cfg.model) { setStatus('pick a model first', false); return; }
    const res = await sendClientMessage('propGizmo', {});
    if (!res?.ok) { setStatus(res?.reason || 'gizmo unavailable', false); return; }
    setStatus('gizmo active — drag to place; Esc to finish', true);
}

// Lua pushes the freshly-computed bone-local offset each gizmo drag frame; mirror it into the
// fields so they track live. Rounded for a clean display + clean emitted Lua (sub-mm / 0.01°).
export function applyGizmoOffset(pos, rot) {
    const r4 = n => Math.round((Number(n) || 0) * 1e4) / 1e4;
    const r2 = n => Math.round((Number(n) || 0) * 1e2) / 1e2;
    if (pos) cfg.pos = { x: r4(pos.x), y: r4(pos.y), z: r4(pos.z) };
    if (rot) cfg.rot = { x: r2(rot.x), y: r2(rot.y), z: r2(rot.z) };
    // Only the six numeric fields — leave name/model/bone untouched during a live drag.
    el('propPosX').textContent = String(cfg.pos.x);
    el('propPosY').textContent = String(cfg.pos.y);
    el('propPosZ').textContent = String(cfg.pos.z);
    el('propRotX').textContent = String(cfg.rot.x);
    el('propRotY').textContent = String(cfg.rot.y);
    el('propRotZ').textContent = String(cfg.rot.z);
}

export function initProp() {
    el('propBase').onclick = () => armed ? disarmBasePick() : armBasePick();
    el('button-propbase-reset').onclick = resetBase;

    const model = el('propModel');
    model.addEventListener('input', renderModelList);
    model.addEventListener('keydown', e => {
        if (e.key === 'Enter') {
            e.preventDefault();
            cfg.model = model.textContent.trim();
            el('propModelList').classList.add('hidden');
            apply();
        }
        e.stopPropagation();
    });

    const bone = el('propBone');
    bone.addEventListener('click', () => {
        const list = el('propBoneList');
        if (list.classList.contains('hidden')) openBoneList(); else closeBoneList();
    });
    bone.addEventListener('input', renderBoneList);
    bone.addEventListener('keydown', e => e.stopPropagation());

    const name = el('propName');
    name.textContent = cfg.name;
    name.addEventListener('blur', () => { cfg.name = name.textContent.trim() || 'MyProp'; });
    name.addEventListener('keydown', e => {
        if (e.key === 'Enter') { e.preventDefault(); name.blur(); }
        e.stopPropagation();
    });

    numEntry('propPosX', cfg.pos, 'x');
    numEntry('propPosY', cfg.pos, 'y');
    numEntry('propPosZ', cfg.pos, 'z');
    numEntry('propRotX', cfg.rot, 'x');
    numEntry('propRotY', cfg.rot, 'y');
    numEntry('propRotZ', cfg.rot, 'z');

    el('button-prop-gizmo').onclick = launchPropGizmo;
    el('button-prop-apply').onclick = applyToRow;
    el('button-prop-reset').onclick = () => {
        // Zero the offset and rotation (model + bone kept) and re-attach live.
        cfg.pos = { x: 0, y: 0, z: 0 };
        cfg.rot = { x: 0, y: 0, z: 0 };
        syncFields();
        apply();
        setStatus('offset & rotation reset', true);
    };
    el('button-prop-save').onclick = saveProp;
    updateBound();
    el('button-prop-copy').onclick = () => {
        if (!cfg.model) { setStatus('pick a model first', false); return; }
        clipboardCopy(propsetLua());
        setStatus('propset Lua copied', true);
    };
    el('button-prop-clear').onclick = async () => {
        await sendClientMessage('propClear', {});
        setStatus('helper removed');
    };

    reRegisterSaved(); // seed the live table + dropdowns from this session's saved props

    document.addEventListener('click', onBackdropClick, true);
    document.addEventListener('mousemove', onArmedMouseMove);
    document.addEventListener('keydown', e => {
        if (e.key === 'Escape' && armed) disarmBasePick();
    });
}
