// Scenario editor: author a da_anims scenario config visually.
//
// The DOCUMENT here is the AUTHORED config — "@suffix" dicts, omitted fields stay omitted — the
// exact table a lib file would pass to da_anims.scenario(). It is never modelled against a schema
// in this file: every edit is round-tripped through da_anims' real registry (scnRegister →
// animsRegisterLive), so validation errors are the actual validator's words and the timeline is
// drawn from measured lengths the real Timeline reports. The tree edits; the timeline shows.
//
// JS owns the document (autosaved to localStorage); the Lua side is stateless.
import { sendClientMessage } from '../src/msg.js';
import { clipboardCopy } from '../src/clipboard.js';
import { showDropdown } from '../src/dropdown.js';
import { showConfirm } from '../src/confirm.js';
import { openPropForNew, openPropForRow } from '../src/prop.js';
import { Settings } from '../src/settings.js';
// Reuse the configure HUD's flag/filter data (AF_* bits, AIK_* bits, task filters) so the two
// editors can't drift on what a flag or a filter is.
import { getAnimFlags, getAnimIKFlags, getTaskFilters, getAnimations } from './anims.js';

const LS_DRAFTS = 'da_dev.scnDrafts';
const LS_LAST = 'da_dev.scnLast';

const ROLE_RANK = { enter: 1, idle: 2, fidget: 3, transition: 4, exit: 5 };
const ROLES = ['enter', 'idle', 'fidget', 'transition', 'exit'];

// Mirrors da_anims' Flag presets (core_cl_ctl.lua — composed from da_lib's AF_* bits, which are
// stable data). Used only to LABEL numbers in the UI; the Lua serializer does its own naming.
const FLAG_PRESETS = {
    Loop: 1,
    HoldLastFrame: 2,
    NotInterruptable: 4,
    UpperBody: 8,
    Secondary: 16,
    DontSuppressLoco: 1 << 16,
    UpperBodyTags: 1 << 26,
    LoopLoco: 1 | (1 << 16),
    Move: 8 | 16,
    MoveLoop: 8 | 16 | 1,
    MoveHigh: 8 | 16 | (1 << 26),
    MoveHighLoop: 8 | 16 | (1 << 26) | 1,
};

// The engine's built-in anim-row defaults — what a row plays with when neither the row nor the
// scenario `defaults` sets the field. Mirrors timeline_cl_ctl.lua (BLEND_IN_DEFAULT = 3.0,
// BLEND_OUT_DEFAULT = 0.5, `row.rate or 0.0`, `row.flag or 0`). Shown dimmed as the effective value.
const ENGINE_ROW_DEFAULTS = { blendIn: 3.0, blendOut: 0.5, rate: 0.0, flag: 0 };

let doc = null; // the authored config
let docId = 'my_scenario'; // the id it serializes under (and the draft name)
let sel = { kind: 'scenario' }; // {kind:'scenario'} | {kind:'state', state} | {kind:'row', state, i}
let live = null; // last scnRegister response: { ok, errors, scenario } — only from play/export
let importedDropped = []; // hook paths getRaw couldn't carry over
let dirty = true; // edited since the last register; validation is therefore not current
const collapsed = new Set(); // state ids whose rows are hidden in the tree

// Timeline zoom, in pixels per millisecond — persisted so a session keeps its scale.
const LS_ZOOM = 'da_dev.scnZoom';
const ZOOM_MIN = 0.008;
const ZOOM_MAX = 3;
let pxPerMs = clampZoom(Number(localStorage.getItem(LS_ZOOM)) || 0.12);

function clampZoom(v) {
    return Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, Number.isFinite(v) ? v : 0.12));
}

// Snap-to-grid for every timeline drag — anim bars, prop lifecycle handles and the await cutoff all
// go through `snapActive` + `snapDragAt`, so one toggle and one modifier govern the whole strip: a
// 100ms grid plus edge-snap to neighbouring bars. Toggled from the timeline head, persisted, and
// flipped BOTH WAYS by holding Ctrl during a drag (snap-on → Ctrl frees it; snap-off → Ctrl snaps
// it). Defaults OFF.
const LS_SNAP = 'da_dev.scnSnap';
const SNAP_GRID = 100; // ms
const SNAP_PX = 8;     // edge-snap pulls in within this many screen pixels of a neighbour's edge
let snapEnabled = localStorage.getItem(LS_SNAP) === '1';

// Snap in effect for this pointer event: the toggle, XOR'd with Ctrl — so Ctrl means "the other
// mode right now" whichever way the toggle is set.
function snapActive(ev) { return snapEnabled !== !!ev.ctrlKey; }

// ===================== document =====================

function blankDoc() {
    return {
        name: 'My Scenario',
        dict: '',
        states: {
            // No `await = auto` on the blank exit: auto MEASURES the primary anim row, and a
            // rowless exit has nothing to measure — the registry refuses it. Set it once a row
            // is added.
            enter: { role: 'enter', next: 'idle', anims: [] },
            idle: { role: 'idle', anims: [] },
            exit: { role: 'exit', anims: [] },
        },
    };
}

function drafts() {
    try { return JSON.parse(localStorage.getItem(LS_DRAFTS)) || {}; } catch { return {}; }
}

function saveDraft() {
    const all = drafts();
    all[docId] = { cfg: doc, at: Date.now() };
    localStorage.setItem(LS_DRAFTS, JSON.stringify(all));
    localStorage.setItem(LS_LAST, docId);
}

function renameDraft(oldId, newId) {
    const all = drafts();
    delete all[oldId];
    localStorage.setItem(LS_DRAFTS, JSON.stringify(all));
    docId = newId;
    saveDraft();
}

// Drop a draft from localStorage for good. Drafts are the only thing in this editor with no undo and
// no copy anywhere else, so every caller asks first.
//
// Deleting the one you're EDITING has to start a fresh scenario, not just forget the entry: the
// document would still be in memory under the same id, and the next keystroke's autosave would write
// it straight back. Deleting something and watching it return is worse than not being able to delete.
function deleteDraft(name) {
    const all = drafts();
    delete all[name];
    localStorage.setItem(LS_DRAFTS, JSON.stringify(all));
    if (localStorage.getItem(LS_LAST) === name) localStorage.removeItem(LS_LAST);
    if (docId === name) newScenario();
}

// Move a draft out of the way under the next free `<id>_N`, so opening something else over the top
// of it costs nothing. Returns the name it was kept under.
function preserveDraft(id) {
    const all = drafts();
    const existing = all[id];
    if (!existing) return null;
    let n = 1;
    while (all[`${id}_${n}`]) n++;
    const kept = `${id}_${n}`;
    all[kept] = existing;
    delete all[id];           // the incoming document takes this id
    localStorage.setItem(LS_DRAFTS, JSON.stringify(all));
    return kept;
}

// Called before loading anything OVER an id that may already have a draft: the working copy you were
// editing is the one thing here with no other copy anywhere, so it is never simply dropped.
//
// Nothing is kept when the draft is byte-identical to what's arriving — that isn't a rescue, it's
// litter, and it would leave `pipe_1`, `pipe_2`, `pipe_3` behind every time you reopened the same
// saved scenario to look at it.
function keepDraftAside(id, incomingCfg) {
    const existing = drafts()[id];
    if (!existing) return null;
    if (JSON.stringify(existing.cfg) === JSON.stringify(incomingCfg)) return null;
    return preserveDraft(id);
}

// Ask, then delete. `after` runs only if it actually happened, so a list can redraw itself.
function confirmDeleteDraft(name, after) {
    showConfirm(`Delete the draft "${name}"? This cannot be undone.`, 'Delete', 'Cancel')
        .then(yes => {
            if (!yes) return;
            deleteDraft(name);
            setStatus(`deleted draft "${name}"`, 'scn-note');
            if (after) after();
        });
}

// ===================== engine sync =====================

// Remove events rows that carry neither `lookup` nor `run` — the validator refuses them. The editor
// never creates events rows; these only arrive from an imported scenario whose `run` hooks were
// stripped. The Lua import path prunes them too, but a DRAFT saved to localStorage before that
// pruning existed still holds the dead row, so guard here as well — this is the boundary every doc
// crosses before it reaches the registry.
function sanitizeDoc(cfg) {
    if (!cfg || !cfg.states) return;
    for (const st of Object.values(cfg.states)) {
        if (st && Array.isArray(st.events)) {
            st.events = st.events.filter(r => r && (r.lookup !== undefined || r.run !== undefined));
            if (st.events.length === 0) delete st.events;
        }
    }
    pruneOrphanProps(cfg);
}

// Drop orphaned prop declarations — declared, but no row anywhere acts on them (latent leftovers
// from renaming/repointing). They'd otherwise clutter the id pickers and ride into the exported
// config as dead declarations.
function pruneOrphanProps(cfg = doc) {
    if (!cfg || !cfg.props) return;
    const used = new Set();
    for (const st of Object.values(cfg.states || {})) {
        for (const row of (st.props || [])) if (row.prop) used.add(row.prop);
    }
    for (const id of Object.keys(cfg.props)) {
        if (!used.has(id)) delete cfg.props[id];
    }
    if (Object.keys(cfg.props).length === 0) delete cfg.props;
}

// A row is "unconfigured" — drawn as a red box and left out of what gets registered/played — when it
// can't resolve to a real animation yet. These are the row-level things the registry would refuse
// the WHOLE scenario over (a fresh row with nothing filled in), caught here so the editor stays
// forgiving: the bad row shows red, the rest of the scenario still registers and plays.
function rowInvalidReason(r) {
    if (!r || !r.anim) return 'no anim';
    const ed = effectiveDict(r);
    if (!ed) return 'no dict';
    if (ed[0] === '@') return 'no scenario dict for "@…"';
    return null;
}

// ── prop rows ──
//
// A prop row is an ACTION at an offset — spawn/attach/detach/discard/anim, one per row (the
// validator's exclusivity rule), with `expression` allowed to ride along or stand alone.

const PROP_ACTIONS = ['spawn', 'attach', 'detach', 'discard', 'anim'];

function propAction(r) {
    if (!r) return null;
    for (const a of PROP_ACTIONS) if (r[a] !== undefined) return a;
    return null;
}

// The dict a prop-anim row resolves to. UNLIKE anim rows there is no fallback to the scenario
// dict — the registry only resolves `row.dict` (registry_cl_ctl: `row.dict and resolveDict(...)
// or nil`), so an omitted dict is a hole, not an inheritance.
function effectivePropDict(r) {
    const d = r.dict;
    if (d == null || d === '') return '';
    if (d[0] === '@') return (doc.dict || '') + d;
    return d;
}

// The prop-row mirror of rowInvalidReason: the row-level things the registry would refuse the
// whole scenario over, caught here so the bad row shows red and the rest still plays.
function propRowInvalidReason(r) {
    if (!r || !r.prop) return 'no prop';
    if (!doc.props || !doc.props[r.prop]) return `undeclared prop '${r.prop}'`;
    const decl = doc.props[r.prop];
    if (!decl.model && !decl.propset) return 'declaration has no model';
    if (r.detach !== undefined && r.discard !== undefined) {
        return 'detach + discard — nest it: detach = { …, discard = true }';
    }
    const action = propAction(r);
    if (!action && r.expression === undefined) return 'no action';
    // An inline attach placement draws its model from the declaration, so the declaration must
    // carry one (mirrors the registry's validation).
    if (action === 'attach' && isInlineAttach(r) && !decl.model) return 'attach needs a model on the declaration';
    if (r.anim !== undefined) {
        if (!r.anim) return 'no anim';
        const ed = effectivePropDict(r);
        if (!ed) return 'no dict';
        if (ed[0] === '@') return 'no scenario dict for "@…"';
    }
    return null;
}

// Switch a prop row's action: clear EVERY action key (and the anim action's rider fields), then
// seed the new one — which is how the panel's radio enforces the validator's one-action rule.
function setPropAction(r, a) {
    delete r.spawn; delete r.attach; delete r.detach; delete r.discard;
    delete r.anim; delete r.dict; delete r.loop; delete r.stayInAnim;
    if (a === 'spawn') r.spawn = {};
    // A new attach is an INLINE placement — model from the declaration, bone/offset/rotation here.
    else if (a === 'attach') r.attach = {};
    else if (a === 'detach') r.detach = {};
    else if (a === 'discard') r.discard = true;
    else if (a === 'anim') r.anim = '';
}

// Is this attach row an inline placement (the new shape) rather than a legacy propset ref? A ref is
// a string or `true`; a binding is a table with `from`; an inline placement is any other table (or
// absent, which we treat as a fresh inline one).
function isInlineAttach(r) {
    const a = r.attach;
    if (typeof a === 'string' || a === true) return false;
    if (a && typeof a === 'object' && a.from !== undefined) return false;
    return true;
}

// The x/y/z of an attach vector, as three number fields on one row.
function vec3Fields(obj, key, label, hint) {
    if (typeof obj[key] !== 'object' || obj[key] === null) obj[key] = { x: 0, y: 0, z: 0 };
    const v = obj[key];
    const row = h('div', 'field');
    row.appendChild(h('span', 'flabel', label));
    if (hint) row.title = hint;
    for (const axis of ['x', 'y', 'z']) {
        const entry = h('div', 'entry scn-entry prop-num');
        entry.contentEditable = 'true';
        entry.tabIndex = 15;
        entry.textContent = String(v[axis] ?? 0);
        entry.setAttribute('aria-label', `${label} ${axis}`);
        const commit = () => {
            const n = Number(entry.textContent.trim());
            v[axis] = Number.isFinite(n) ? n : 0;
            entry.textContent = String(v[axis]);
            changed();
        };
        entry.addEventListener('blur', commit);
        entry.addEventListener('keydown', e => {
            if (e.key === 'Enter') { e.preventDefault(); entry.blur(); }
            if (e.key === 'Escape') { entry.textContent = String(v[axis] ?? 0); entry.blur(); }
            e.stopPropagation();
        });
        row.appendChild(entry);
    }
    return row;
}

// The doc with unconfigured rows removed, per state — what actually gets registered and played, so a
// half-authored row never blocks the rest. The FULL doc is still what the timeline draws (the bad
// rows show red there); this is only the runnable projection of it.
function playableDoc() {
    const states = {};
    for (const [sid, st] of Object.entries(doc.states || {})) {
        states[sid] = { ...st, anims: (st.anims || []).filter(r => !rowInvalidReason(r)) };
        if (st.props) states[sid].props = st.props.filter(r => !propRowInvalidReason(r));
    }
    return { ...doc, states };
}

// ===================== measurement without registering =====================
//
// The timeline needs exactly two things from the engine: each row's real length, and the state's
// resolved `await`. Both used to ride along on a full register per edit. They're fetched here
// instead, with two cheap calls that hit the SAME engine functions (Core.timeline.animLength /
// resolveAuto) — so no drift — and are cached so a redraw costs nothing.

const animLen = new Map();    // "dict|anim" -> ms, or null when the engine doesn't know
const pendingLen = new Set();
const lenKey = (dict, anim) => dict + '|' + anim;

// The flag a row really plays with: its own, else the scenario's row defaults.
function effectiveFlag(r) {
    if (r.flag !== undefined) return r.flag;
    return (doc.defaults && doc.defaults.flag) || 0;
}

// A row's drawn length: an explicit `hold`, else the measured natural length once it has arrived
// (null until then — the bar draws dashed at a fallback width).
function rowLenOf(r) {
    if (r.hold > 0) return r.hold;
    const v = animLen.get(lenKey(effectiveDict(r), r.anim));
    return v === undefined ? null : v;
}

// Fetch any lengths the drawn rows still need, then redraw when they land. One call per unique
// dict+anim, ever — the answer is a property of the asset.
function ensureLengths(rows) {
    for (const r of rows) {
        if (rowInvalidReason(r)) continue;
        const dict = effectiveDict(r);
        const k = lenKey(dict, r.anim);
        if (animLen.has(k) || pendingLen.has(k)) continue;
        pendingLen.add(k);
        sendClientMessage('scnAnimLength', { dict, anim: r.anim }).then(res => {
            pendingLen.delete(k);
            animLen.set(k, res && typeof res.len === 'number' ? res.len : null);
            redraw();
        });
    }
}

// Prop-anim rows (the `anim` action) are the one prop shape with a real duration — same cache,
// same engine call, keyed by the prop row's own dict resolution (no scenario-dict fallback).
function propRowLenOf(r) {
    if (r.anim === undefined) return null;
    const v = animLen.get(lenKey(effectivePropDict(r), r.anim));
    return v === undefined ? null : v;
}

function ensurePropLengths(rows) {
    for (const r of rows) {
        if (r.anim === undefined || propRowInvalidReason(r)) continue;
        const dict = effectivePropDict(r);
        const k = lenKey(dict, r.anim);
        if (animLen.has(k) || pendingLen.has(k)) continue;
        pendingLen.add(k);
        sendClientMessage('scnAnimLength', { dict, anim: r.anim }).then(res => {
            pendingLen.delete(k);
            animLen.set(k, res && typeof res.len === 'number' ? res.len : null);
            redraw();
        });
    }
}

// The propset catalogue — flat names (incl. dotted variants) with bone/model/fadeIn — fetched
// once from the engine. The declaration picker, the attach-ref picker and the timeline's
// fade-in head all read it; until it lands those just draw without the propset detail.
let propsetCatalogue = null;
let propsetsPending = false;
function ensurePropsets() {
    if (propsetCatalogue || propsetsPending) return;
    propsetsPending = true;
    sendClientMessage('scnPropsets', {}).then(res => {
        propsetsPending = false;
        propsetCatalogue = (res && res.propsets) || [];
        redraw();
    });
}
async function getPropsets() {
    if (propsetCatalogue) return propsetCatalogue;
    const res = await sendClientMessage('scnPropsets', {});
    propsetCatalogue = (res && res.propsets) || [];
    return propsetCatalogue;
}

// Prop mode calls this after saving a propset into the live table, so the next dropdown fetch
// (declaration picker, attach-ref picker) re-reads the catalogue and the new name is there.
export function invalidatePropsetCache() {
    propsetCatalogue = null;
    propsetsPending = false;
    redraw(); // a lane's fade-in head reads the catalogue too
}
function propsetInfo(ref) {
    if (!propsetCatalogue || typeof ref !== 'string') return null;
    return propsetCatalogue.find(p => p.name === ref) || null;
}

// What a prop row's attach actually references: an explicit ref string, or `true` = the
// declaration's propset.
function attachRefOf(r) {
    if (typeof r.attach === 'string') return r.attach;
    const decl = doc.props && doc.props[r.prop];
    return (decl && decl.propset) || null;
}

// A human label for an attach: the bone (inline placement) or the propset ref (legacy).
function attachLabel(r) {
    if (isInlineAttach(r)) return (r.attach && r.attach.bone) || 'root';
    return attachRefOf(r) || '(declared default)';
}

// Whether an attach draws a fade-in head: from the declaration for an inline placement, else the
// propset's own `fadeIn` flag.
function attachFadesIn(r) {
    const decl = doc.props && doc.props[r.prop];
    if (isInlineAttach(r)) return !!(decl && decl.fadeIn);
    const info = propsetInfo(attachRefOf(r));
    return !!(info && info.fadeIn);
}

// `await` resolution. A number, `false` or an omitted await need NO engine at all — which is the
// whole point: dragging the await handle produces a number, so it redraws instantly. Only "auto"
// asks the engine, and the answer is cached against the rows it's derived from.
const awaitResolved = new Map(); // signature -> ms | false | undefined
const pendingAwait = new Set();

function awaitSig(sid) {
    const st = doc.states[sid];
    const rows = (st.anims || [])
        .filter(r => !rowInvalidReason(r))
        .map(r => `${r.at || 0}:${effectiveDict(r)}:${r.anim}:${effectiveFlag(r)}`)
        .join(',');
    return JSON.stringify(st.await ?? null) + '|' + rows;
}

function resolveAwaitFor(sid) {
    const st = doc.states[sid];
    if (!st) return undefined;
    const a = st.await;
    if (typeof a === 'number') return a;
    if (a === false) return false;
    if (a === undefined || a === null) return undefined; // omitted = the poll

    const sig = awaitSig(sid);
    if (awaitResolved.has(sig)) return awaitResolved.get(sig);
    if (!pendingAwait.has(sig)) {
        pendingAwait.add(sig);
        const anims = (st.anims || []).filter(r => !rowInvalidReason(r)).map(r => ({
            at: r.at || 0, dict: effectiveDict(r), anim: r.anim, flag: effectiveFlag(r),
        }));
        sendClientMessage('scnResolveAwait', { await: a, anims }).then(res => {
            pendingAwait.delete(sig);
            awaitResolved.set(sig, res && typeof res.ms === 'number' ? res.ms : undefined);
            redraw();
        });
    }
    return undefined; // draw as the poll until the real answer lands
}

// What a POLLING state is actually waiting for, in ms — the number to pin its await at.
//
// The engine's poll blocks on the PRIMARY row: the first full-body row, or the first row at all if
// every row is a layer (timeline_cl_ctl's primaryRow). Its `at` counts, because a row starting 400ms
// in doesn't finish until 400ms later than its length. `items` are the drawn rows, so their lengths
// are the ones already measured and cached.
//
// null when there's nothing honest to offer: no valid rows, or the primary's length isn't known yet
// (a dict still streaming, or a typo'd anim the engine can't measure). Guessing there would write a
// number the state was never waiting for.
function pollLengthMs(items) {
    const valid = items.filter(it => !it.invalid);
    const primary = valid.find(it => !it.isLayer) || valid[0];
    if (!primary || !primary.len) return null;
    return Math.round(primary.at + primary.len);
}

function invalidRowCount() {
    let n = 0;
    for (const st of Object.values(doc.states || {})) {
        for (const r of (st.anims || [])) if (rowInvalidReason(r)) n++;
        for (const r of (st.props || [])) if (propRowInvalidReason(r)) n++;
    }
    return n;
}

// Every edit funnels through here: autosave and redraw — and NOTHING else.
//
// This used to re-register the whole draft through the registry on a 400ms debounce, which is what
// made editing lag: registerLive re-validates every state, rebuilds every row and marshals the whole
// normalized scenario back across NUI — far too much to sit behind a keystroke or an await drag.
// REGISTER NOW ONLY HAPPENS ON PLAY AND EXPORT. In between, the timeline measures itself with two
// cheap cached calls (animLength / resolveAwait), and most edits — dragging `await` to a number,
// moving a bar, renaming — need no engine round-trip at all.
function changed() {
    saveDraft();
    dirty = true;
    renderStatus();
    refreshSavedBadge();   // the draft has just moved away from (or back to) the saved copy
    redraw();
}

// Register the draft through the REAL registry. This is the slow one (it re-validates every state and
// marshals the normalized scenario back), so it is called ONLY from play and export — never from an
// edit. It's what produces validation errors, and what `play` actually runs.
async function sync() {
    sanitizeDoc(doc);
    const focus = timelineStateId();
    // Register the CLEANED draft — unconfigured rows stripped — so one half-authored row can't refuse
    // the whole scenario. The timeline still draws them (red) from the full doc.
    const res = await sendClientMessage('scnRegister', { cfg: playableDoc(), focus });
    live = res || { ok: false, errors: ['no response from da_dev'] };
    if (live) live.focus = focus;
    dirty = false;
    renderStatus();
    renderStateSelect();
    redraw();
}

// The toolbar status is always SHORT — a symbol and a count — so a multi-sentence validator
// message can never stretch the toolbar. The messages themselves go in the clamped errors box.
function setStatus(text, cls) {
    const el = document.getElementById('scnStatus');
    el.textContent = text;
    el.className = cls;
}

// Strip the scratch-id noise and the useless "REFUSED" trailer so a validator message reads plainly
// ("state 'sit' anim row 2 has no anim", not "anims: scenario '_edit_dev': state 'sit'…").
function cleanErrors(errs) {
    return errs
        .filter(e => !/REFUSED — fix the errors above/.test(e))
        .map(e => e.replace(/^anims: scenario '[^']*':\s*/, '').replace(/^anims:\s*/, ''));
}

// The status line (short) plus the messages box below it. Unconfigured rows are a friendly NOTE, not
// an error — they don't stop the scenario registering; they're just shown red and skipped on play.
function renderStatus() {
    const box = document.getElementById('scnErrors');
    box.innerHTML = '';

    const lines = []; // { text, cls }
    const bad = invalidRowCount();
    if (bad > 0) lines.push({
        text: `${bad} unconfigured ${bad === 1 ? 'entry' : 'entries'} — shown red on the timeline, left out of play`,
        cls: 'scn-note-line',
    });
    for (const p of importedDropped) lines.push({ text: `hook not imported: ${p}`, cls: 'scn-note-line' });

    if (dirty || !live) {
        // Validation is deliberately NOT run on every edit (it's slow) — it runs on play/export.
        setStatus('✎ edited · validates on play / export', 'scn-note');
    } else if (live.ok) {
        setStatus((bad ? '⚠ ' : '✓ ') + 'registered' + (bad ? ` · ${bad} skipped` : ''),
            bad ? 'scn-warn' : 'scn-ok');
    } else {
        const errs = cleanErrors(live.errors || ['refused']);
        for (const e of errs) lines.push({ text: e, cls: 'scn-err-line' });
        setStatus(`✗ ${errs.length} error${errs.length === 1 ? '' : 's'}`, 'scn-err');
    }

    if (lines.length === 0) { box.classList.add('hidden'); return; }
    for (const l of lines) box.appendChild(h('div', l.cls, l.text));
    box.classList.remove('hidden');
}

// ===================== value spellings =====================
//
// Text forms for the fields whose values aren't plain scalars. Parse/print pairs — keep inverse.

function awaitText(v) {
    if (v === undefined || v === null) return '';
    if (v === false) return 'false';
    if (v === 'auto') return 'auto';
    if (typeof v === 'object') {
        if (typeof v.auto === 'number') return 'auto ' + v.auto;
        if (v.trim !== undefined) return 'auto trim ' + v.trim;
        return 'auto';
    }
    return String(v);
}

function parseAwait(text) {
    const t = text.trim().toLowerCase();
    if (t === '') return undefined; // omitted = the poll
    if (t === 'false') return false;
    if (t === 'auto') return 'auto';
    let m = t.match(/^auto\s+trim\s+(\d+)$/);
    if (m) return { auto: true, trim: Number(m[1]) };
    m = t.match(/^auto\s+(0?\.\d+|1(\.0)?)$/);
    if (m) return { auto: Number(m[1]) };
    const n = Number(t);
    return Number.isFinite(n) ? n : undefined;
}

function whenText(w) {
    if (!w) return '';
    return Object.keys(w).sort()
        .map(k => `${k}=${w[k] === 'allow' ? 'allow' : w[k]}`)
        .join(', ');
}

function parseWhen(text) {
    const t = text.trim();
    if (t === '') return undefined;
    const out = {};
    for (const part of t.split(',')) {
        const [k, v] = part.split('=').map(s => s.trim());
        if (!k) continue;
        out[k] = v === 'allow' ? 'allow' : v !== 'false';
    }
    return Object.keys(out).length ? out : undefined;
}

function menuText(m) {
    if (!m) return '';
    return Object.keys(m).sort().map(tag => `${tag}:${m[tag].key || ''}`).join(', ');
}

function parseMenu(text) {
    const t = text.trim();
    if (t === '') return undefined;
    const out = {};
    for (const part of t.split(',')) {
        const [tag, key] = part.split(':').map(s => s.trim());
        if (tag) out[tag] = key ? { key } : {};
    }
    return Object.keys(out).length ? out : undefined;
}

function flagText(v) {
    if (v === undefined || v === null) return '';
    for (const [name, val] of Object.entries(FLAG_PRESETS)) {
        if (val === v) return name;
    }
    return String(v);
}

// A prop `expression`: `0.7` SETS the model's DOF morph, `add -0.15` MOVES it (the apple being
// eaten, the bowl emptying). Parse/print pair, kept inverse.
function exprText(v) {
    if (v === undefined || v === null) return '';
    if (typeof v === 'number') return String(v);
    if (typeof v === 'object' && v.add !== undefined) return 'add ' + v.add;
    return '';
}

function parseExpr(text) {
    const t = text.trim().toLowerCase();
    if (t === '') return undefined;
    const m = t.match(/^add\s+(-?\d*\.?\d+)$/);
    if (m) return { add: Number(m[1]) };
    const n = Number(t);
    return Number.isFinite(n) ? n : undefined;
}

// ===================== field factory =====================
//
// EVERY field goes through here — one construction site, so when bindings ({ from = "args.x" })
// arrive, the literal/binding toggle lands in one place instead of on thirty ad-hoc inputs.
//
// spec: { label, get(), set(text) — parse and mutate the doc; text in, undefined clears }

function h(tag, cls, text) {
    const el = document.createElement(tag);
    if (cls) el.className = cls;
    if (text !== undefined) el.textContent = text;
    return el;
}

function field(spec) {
    const row = h('div', 'field');
    row.appendChild(h('span', 'flabel', spec.label));
    const entry = h('div', 'entry scn-entry');
    entry.contentEditable = 'true';
    entry.tabIndex = 15;
    entry.setAttribute('aria-label', spec.label);
    if (spec.hint) entry.title = spec.hint;

    // When the field has no value of its own but INHERITS one (a scenario default, the scenario
    // dict), show that inherited value dimmed — so you can see what the row will actually use
    // without it looking like an explicit setting. Focus clears the placeholder to type your own.
    paintInherited(entry, spec);
    entry.addEventListener('focus', () => {
        if (entry.classList.contains('scn-inherited')) {
            entry.textContent = '';
            entry.classList.remove('scn-inherited');
        }
    });

    const commit = () => {
        spec.set(entry.textContent);
        changed();
        renderTree(); // names/ids/roles show in the tree
        paintInherited(entry, spec); // re-show the inherited value dimmed if the field was cleared
    };
    entry.addEventListener('blur', commit);
    entry.addEventListener('keydown', e => {
        if (e.key === 'Enter') { e.preventDefault(); entry.blur(); }
        if (e.key === 'Escape') { entry.textContent = spec.get() ?? ''; entry.blur(); }
        e.stopPropagation(); // keys 1/2/3 etc. must not switch HUD views mid-typing
    });
    row.appendChild(entry);
    return row;
}

// Paint an entry from a spec's own value, falling back to a dimmed inherited value. `spec.inherited`
// (optional) returns the effective value the row would use if this field stays empty.
function isBlank(v) { return v === undefined || v === null || v === ''; }
function paintInherited(entry, spec) {
    const own = spec.get();
    if (!isBlank(own)) {
        entry.textContent = own;
        entry.classList.remove('scn-inherited');
        return;
    }
    const inh = spec.inherited ? spec.inherited() : undefined;
    if (!isBlank(inh)) {
        entry.textContent = String(inh);
        entry.classList.add('scn-inherited');
    } else {
        entry.textContent = '';
        entry.classList.remove('scn-inherited');
    }
}

// Scalar accessors: text <-> number/string on a target table, deleting the key when cleared.
// `inherited` (optional) returns the value the row would use if this key stays unset — shown dimmed.
function numField(obj, key, label, hint, inherited) {
    return field({
        label, hint, inherited,
        get: () => obj[key] === undefined ? '' : String(obj[key]),
        set: t => {
            const n = Number(t.trim());
            if (t.trim() === '' || !Number.isFinite(n)) delete obj[key];
            else obj[key] = n;
        },
    });
}

function strField(obj, key, label, hint) {
    return field({
        label, hint,
        get: () => obj[key] ?? '',
        set: t => {
            const v = t.trim();
            if (v === '') delete obj[key]; else obj[key] = v;
        },
    });
}

// A field backed by a fixed set of acceptable values — a click opens the same dropdown the
// configure HUD uses. `options` is an array (or a function returning a Promise of one) of
// { name, value } — value is what lands in the doc; name is what shows.
function selectField(spec) {
    const row = h('div', 'field');
    row.appendChild(h('span', 'flabel', spec.label));
    const entry = h('div', 'entry dropdown scn-entry');
    entry.tabIndex = 15;
    // Own value, else a dimmed inherited one (the field rebuilds on change via renderPanel, so the
    // initial paint is enough).
    paintInherited(entry, spec);
    if (spec.hint) entry.title = spec.hint;

    entry.onclick = async e => {
        const opts = typeof spec.options === 'function' ? await spec.options() : spec.options;
        const picked = await showDropdown(opts, e.pageX, e.pageY);
        if (picked === null) return;
        spec.set(picked.value);
        changed();
        // Re-render the panel too: picking a role of `transition` reveals the `to` field, and a
        // new role re-sorts the tree.
        renderTree();
        renderPanel();
    };
    row.appendChild(entry);
    // Optional trailing ＋ affordance (the propset/attach pickers use it to jump into prop mode).
    if (spec.plus) {
        const plus = h('span', 'scn-pick scn-plus', '＋');
        plus.tabIndex = 15;
        plus.setAttribute('role', 'button');
        plus.title = spec.plusHint || 'create new';
        plus.onclick = ev => { ev.stopPropagation(); spec.plus(); };
        row.appendChild(plus);
    }
    return row;
}

// The propset picker, shared by the declaration `propset` field and the attach row `attach` field.
// It's a select field with two extra affordances that both jump into prop mode to author a new
// propset (or attach variant): a "＋ new…" entry at the top of the dropdown, and a ＋ button beside
// the field. On save, prop mode writes the new name back through `onNew`'s returned setter.
const NEW_PROPSET = ' new';
function propsetField(spec) {
    return selectField({
        label: spec.label,
        hint: spec.hint,
        options: async () => {
            const base = await propsetOptions(spec.withDefault)();
            return [{ name: '＋ new…', value: NEW_PROPSET, tooltip: 'author a new one in prop mode' }]
                .concat(base);
        },
        get: spec.get,
        set: v => { if (v === NEW_PROPSET) spec.onNew(); else spec.set(v); },
        plus: spec.onNew,
        plusHint: spec.plusHint,
    });
}

// An optional boolean — `true` in the doc, or absent. Spelled as a two-option dropdown so the
// omitted state stays visibly "not set" rather than a lying unchecked checkbox.
function boolField(obj, key, label, hint) {
    return selectField({
        label, hint,
        options: [{ name: '—', value: undefined }, { name: 'true', value: true }],
        get: () => obj[key] === undefined ? '—' : String(obj[key]),
        set: v => { if (v === undefined) delete obj[key]; else obj[key] = v; },
    });
}

// A bitmask field — a MULTI-select dropdown of the individual bits, exactly as the configure HUD
// does flags. `fetch()` returns [{ name, value, note }]; toggling applies live. The stored value is
// the OR of the set bits, which the Lua serializer re-collapses into a `Flag.*` preset name.
function bitmaskField(spec) {
    const row = h('div', 'field');
    row.appendChild(h('span', 'flabel', spec.label));
    const entry = h('div', 'entry dropdown scn-entry');
    entry.tabIndex = 15;
    const show = v => spec.label === 'flag' ? (flagText(v) || '0') : String(v);
    const paint = () => {
        const v = spec.get();
        if (v !== undefined && v !== null) {
            entry.textContent = show(v);
            entry.classList.remove('scn-inherited');
            return;
        }
        // Unset: show the inherited value dimmed if there is one, else the empty dash.
        const inh = spec.inherited ? spec.inherited() : undefined;
        if (!isBlank(inh)) { entry.textContent = String(inh); entry.classList.add('scn-inherited'); }
        else { entry.textContent = '—'; entry.classList.remove('scn-inherited'); }
    };
    paint();
    if (spec.hint) entry.title = spec.hint;

    entry.onclick = async e => {
        const bits = await spec.fetch();
        let cur = spec.get() || 0;
        const opts = bits.map(b => ({
            name: b.name.toLowerCase(),
            tooltip: `${b.value}: ${b.note || ''}`,
            selected: b.value !== 0 && (cur & b.value) === b.value,
            // Toggling applies immediately (matches the configure HUD); the dropdown stays open.
            click: sel => {
                cur = sel ? (cur | b.value) : (cur & ~b.value);
                spec.set(cur || undefined);
                paint();
                changed();
            },
        }));
        await showDropdown(opts, e.pageX, e.pageY, true);
    };
    row.appendChild(entry);
    return row;
}

// ===================== dict / anim pickers =====================
//
// The row's `dict` and `anim` shouldn't be blind free-text — the search HUD already carries the
// whole anim database (dict -> [anim]). So the dict field autocompletes against it as you type, and
// once a dict is chosen the anim field offers that dict's anims from a dropdown. Both stay editable:
// a streamed dict that isn't in the shipped database can still be typed by hand.

// The effective dict a row resolves to, mirroring the registry (registry_cl_ctl.lua resolveDict):
// "@suffix" is appended to the scenario dict (the @ is kept), absolute is itself, blank = scenario.
function effectiveDict(r) {
    const d = r.dict;
    if (d == null || d === '') return doc.dict || '';
    if (d[0] === '@') return (doc.dict || '') + d;
    return d;
}

// Dicts whose name contains `q`, capped so a two-letter query can't try to render 30k rows.
async function dictMatches(q, cap) {
    const db = await getAnimations();
    const out = [];
    for (const d of Object.keys(db)) {
        if (d.toLowerCase().includes(q)) { out.push(d); if (out.length >= cap) break; }
    }
    return out;
}

async function animsForDict(dict) {
    if (!dict) return [];
    const db = await getAnimations();
    return db[dict] || [];
}

// The distinct dicts already referenced anywhere in this scenario (the default dict and every row's
// dict, as authored — so "@suffix" forms come back too). Offered when an empty dict field is
// focused: the dict you want is usually one another row already uses.
function scenarioDicts() {
    const set = new Set();
    if (doc.dict) set.add(doc.dict);
    for (const st of Object.values(doc.states || {})) {
        for (const r of (st.anims || [])) {
            if (r.dict) set.add(r.dict);
        }
    }
    return [...set].sort();
}

// The dict autocomplete is a single popup on document.body — NOT a child of the field — so it can
// outlive a panel re-render (add a row, switch selection) that replaces the field without ever
// blurring it. Track it in one place and close it from every such path, so it can't be orphaned.
let dictPopup = null;
function closeDictPopup() {
    if (!dictPopup) return;
    dictPopup.remove();
    dictPopup = null;
    document.removeEventListener('pointerdown', dictPopupOutside, true);
}
function dictPopupOutside(e) {
    if (dictPopup && !dictPopup.contains(e.target) && e.target !== dictPopup._anchor) {
        closeDictPopup();
    }
}

// A lightweight autocomplete popup anchored under a field. Reuses the .context-menu look. Items are
// picked on mousedown (before the field's blur fires) so the pick lands instead of being lost.
//
// It carries the SAME keyboard contract as a dropdown — up/down highlight, Enter chooses, Escape
// closes — because to the person typing there is no difference between the two: both are a list that
// appeared under the thing they're editing. The keys arrive from the FIELD (`autocompleteKeys`
// below), since focus stays in the text you're typing; this side owns the highlight and exposes what
// to do with it.
function buildAutocomplete(items, anchor, onPick) {
    closeDictPopup(); // only ever one open
    const menu = h('div', 'context-menu scn-autocomplete');
    menu._anchor = anchor;
    menu._items = items;
    menu._onPick = onPick;
    menu._active = -1;   // nothing highlighted: Enter commits what you typed, as it always did
    const rect = anchor.getBoundingClientRect();
    menu.style.left = (rect.left + window.scrollX) + 'px';
    menu.style.top = (rect.bottom + window.scrollY + 2) + 'px';
    menu.style.maxHeight = '40vh';
    menu.style.overflowY = 'auto';
    for (const it of items) {
        const el = h('div', 'context-menu-item', it);
        el.addEventListener('mousedown', e => { e.preventDefault(); onPick(it); });
        menu.appendChild(el);
    }
    document.body.appendChild(menu);
    // flip above the field if it would spill off the bottom
    const r2 = menu.getBoundingClientRect();
    if (r2.bottom > window.innerHeight) {
        menu.style.top = Math.max(4, rect.top + window.scrollY - r2.height - 2) + 'px';
    }
    dictPopup = menu;
    // dismiss on any click outside the popup or its field (deferred so the click that opened it
    // doesn't immediately close it)
    setTimeout(() => document.addEventListener('pointerdown', dictPopupOutside, true), 0);
    return menu;
}

// Move the highlight in the open autocomplete. Wraps, like a dropdown does, and scrolls the row into
// view — a 40vh popup over the whole anim database is mostly off-screen.
function moveAutocomplete(step) {
    const menu = dictPopup;
    if (!menu || !menu._items || menu._items.length === 0) return false;
    const rows = menu.children;
    if (menu._active >= 0 && rows[menu._active]) rows[menu._active].classList.remove('selected');
    menu._active = (menu._active + step + rows.length) % rows.length;
    const row = rows[menu._active];
    row.classList.add('selected');
    if (row.scrollIntoView) row.scrollIntoView({ block: 'nearest' });
    return true;
}

// The field side of the contract. Call it FIRST in a field's keydown: if it returns true the key was
// the popup's, and the field should do nothing else with it.
//
//   Down / Up   highlight a suggestion (opening nothing — the list is already there)
//   Enter       take the highlighted suggestion; with none highlighted, fall through so Enter still
//               commits whatever you typed, which is what it did before there was a highlight
//   Escape      close the list, leaving the text alone — the field's own Escape then reverts it
function autocompleteKeys(e) {
    if (!dictPopup) return false;
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        if (!moveAutocomplete(e.key === 'ArrowDown' ? 1 : -1)) return false;
        e.preventDefault();
        return true;
    }
    if (e.key === 'Enter' && dictPopup._active >= 0) {
        const menu = dictPopup;
        const picked = menu._items[menu._active];
        e.preventDefault();
        menu._onPick(picked);   // same callback the mousedown path uses
        return true;
    }
    return false;
}

// The dict field: editable, with type-to-filter autocomplete against the anim database.
function dictField(obj, key, label, hint, inherited) {
    const row = h('div', 'field');
    row.appendChild(h('span', 'flabel', label));
    const entry = h('div', 'entry scn-entry');
    entry.contentEditable = 'true';
    entry.tabIndex = 15;
    if (hint) entry.title = hint;

    // Own dict, else the scenario dict it inherits (dimmed). A row that leaves `dict` blank plays
    // in the scenario dict, so showing it dimmed makes the effective dict visible.
    const paint = () => paintInherited(entry, { get: () => obj[key] ?? '', inherited });
    paint();

    let suppressCommit = false;
    const commit = () => {
        const v = entry.textContent.trim();
        if (v === '') delete obj[key]; else obj[key] = v;
        changed();
        renderTree();
        renderPanel(); // the anim field's known-anim list depends on the dict
    };
    const pick = d => {
        // renderPanel() below removes this (focused) entry, which fires its blur; that blur's
        // deferred commit would read the empty node and wipe the value we just set. Guard it.
        suppressCommit = true;
        obj[key] = d;
        closeDictPopup();
        changed();
        renderTree();
        renderPanel();
    };

    // Empty field, just focused: clear any dimmed inherited placeholder, then offer the dicts
    // already used in this scenario — no typing needed.
    entry.addEventListener('focus', () => {
        if (entry.classList.contains('scn-inherited')) {
            entry.textContent = '';
            entry.classList.remove('scn-inherited');
        }
        if (entry.textContent.trim() !== '') return;
        const dicts = scenarioDicts();
        if (dicts.length) buildAutocomplete(dicts, entry, pick); else closeDictPopup();
    });
    entry.addEventListener('input', async () => {
        const q = entry.textContent.trim().toLowerCase();
        if (q.length < 2) { closeDictPopup(); return; } // don't dump the whole database on one char
        const dicts = await dictMatches(q, 40);
        if (dicts.length) buildAutocomplete(dicts, entry, pick); else closeDictPopup();
    });
    entry.addEventListener('blur', () => {
        setTimeout(() => { if (suppressCommit) return; closeDictPopup(); commit(); }, 120);
    });
    entry.addEventListener('keydown', e => {
        // The open suggestion list gets first refusal on arrows, and on Enter while a row is
        // highlighted. Anything it doesn't take is the field's own key, as before.
        if (autocompleteKeys(e)) { e.stopPropagation(); return; }
        if (e.key === 'Enter') { e.preventDefault(); entry.blur(); }
        if (e.key === 'Escape') { closeDictPopup(); entry.textContent = obj[key] ?? ''; entry.blur(); }
        e.stopPropagation();
    });
    row.appendChild(entry);
    return row;
}

// The anim field: editable, plus a picker that lists the row dict's known anims in a dropdown.
// `dictOf` is how THIS row resolves its dict — anim rows fall back to the scenario dict,
// prop-anim rows don't (pass effectivePropDict).
function animField(r, dictOf = effectiveDict) {
    const row = h('div', 'field');
    row.appendChild(h('span', 'flabel', 'anim'));
    const entry = h('div', 'entry scn-entry');
    entry.contentEditable = 'true';
    entry.tabIndex = 15;
    entry.textContent = r.anim ?? '';

    const commit = () => {
        const v = entry.textContent.trim();
        if (v === '') delete r.anim; else r.anim = v;
        changed();
        renderTree();
        entry.textContent = r.anim ?? '';
    };
    entry.addEventListener('blur', commit);
    entry.addEventListener('keydown', e => {
        if (e.key === 'Enter') { e.preventDefault(); entry.blur(); }
        if (e.key === 'Escape') { entry.textContent = r.anim ?? ''; entry.blur(); }
        e.stopPropagation();
    });
    row.appendChild(entry);

    // the picker affordance: a caret that opens the dict's anims
    const pick = h('span', 'scn-pick', '▾');
    pick.tabIndex = 15;
    pick.setAttribute('role', 'button');
    pick.title = 'pick from this dict';
    pick.onclick = async e => {
        const dict = dictOf(r);
        const anims = await animsForDict(dict);
        if (!anims.length) {
            setStatus('no known anims for dict: ' + (dict || '(none)'), 'scn-err');
            return;
        }
        const picked = await showDropdown(anims.map(a => ({ name: a, value: a })), e.pageX, e.pageY);
        if (picked === null) return;
        r.anim = picked.value;
        changed();
        renderTree();
        renderPanel();
    };
    row.appendChild(pick);
    return row;
}

// ===================== searchable text fields (model, bone) =====================
//
// An editable field with type-to-filter autocomplete against a name list. `matchFn(q, cap)` returns
// the matches — the object spawn list for a model, the ped bone list for a bone.

function modelMatches(q, cap) {
    const src = Settings.spawn.object || [];
    const out = [];
    const ql = q.toLowerCase();
    for (const name of src) {
        if (name.toLowerCase().includes(ql)) { out.push(name); if (out.length >= cap) break; }
    }
    return out;
}

// The static ped bone vocabulary (da_lib/data/bones.lua), fetched once from the client and cached.
let boneNamesCache = null;
let boneNamesPending = false;
function ensureBoneNames() {
    if (boneNamesCache || boneNamesPending) return;
    boneNamesPending = true;
    sendClientMessage('scnBoneNames', {}).then(res => {
        boneNamesPending = false;
        boneNamesCache = (res && res.bones) || [];
    });
}
function boneMatches(q, cap) {
    const src = boneNamesCache || [];
    const out = [];
    const ql = q.toLowerCase();
    for (const name of src) {
        // Bone names are matched case-insensitively (joaat lowercases), so present and store them
        // lowercase — the config reads cleaner and still resolves.
        const lc = name.toLowerCase();
        if (lc.includes(ql)) { out.push(lc); if (out.length >= cap) break; }
    }
    return out;
}

function autocompleteField(obj, key, label, hint, matchFn) {
    const row = h('div', 'field');
    row.appendChild(h('span', 'flabel', label));
    const entry = h('div', 'entry scn-entry');
    entry.contentEditable = 'true';
    entry.tabIndex = 15;
    entry.textContent = obj[key] ?? '';
    if (hint) entry.title = hint;

    let suppressCommit = false;
    const commit = () => {
        const v = entry.textContent.trim();
        if (v === '') delete obj[key]; else obj[key] = v;
        changed();
        renderPanel();
    };
    const pick = m => {
        suppressCommit = true;
        obj[key] = m;
        closeDictPopup();
        changed();
        renderPanel();
    };
    entry.addEventListener('input', () => {
        const q = entry.textContent.trim();
        if (q.length < 2) { closeDictPopup(); return; }
        const hits = matchFn(q, 40);
        if (hits.length) buildAutocomplete(hits, entry, pick); else closeDictPopup();
    });
    entry.addEventListener('blur', () => {
        setTimeout(() => { if (suppressCommit) return; closeDictPopup(); commit(); }, 120);
    });
    entry.addEventListener('keydown', e => {
        // The open suggestion list gets first refusal on arrows, and on Enter while a row is
        // highlighted. Anything it doesn't take is the field's own key, as before.
        if (autocompleteKeys(e)) { e.stopPropagation(); return; }
        if (e.key === 'Enter') { e.preventDefault(); entry.blur(); }
        if (e.key === 'Escape') { closeDictPopup(); entry.textContent = obj[key] ?? ''; entry.blur(); }
        e.stopPropagation();
    });
    row.appendChild(entry);
    return row;
}

function modelField(obj, key, label, hint) {
    return autocompleteField(obj, key, label, hint, modelMatches);
}

function boneField(obj, key, label, hint) {
    ensureBoneNames();
    return autocompleteField(obj, key, label, hint, boneMatches);
}

// The prop-row's `prop` id — editable, with autocomplete of the scenario's other prop ids. Typing a
// NEW name renames this prop (it starts life as prop_#); typing an EXISTING id points the row at
// that prop instead, cleaning up the one it left if nothing else uses it. No dropdown, no ＋: a new
// prop comes from the "+ prop" button, and this field is how you name or repoint it.
function propIdField(r) {
    const row = h('div', 'field');
    row.appendChild(h('span', 'flabel', 'prop'));
    const entry = h('div', 'entry scn-entry');
    entry.contentEditable = 'true';
    entry.tabIndex = 15;
    entry.textContent = r.prop ?? '';
    entry.title = 'the prop id — rename it, or type another prop’s id to point this entry at it';

    let suppress = false;
    const retargetOrRename = v => {
        const old = r.prop;
        if (!v || v === old) return;
        if (doc.props && doc.props[v]) {
            r.prop = v; // point at an existing prop
            if (doc.props[old] && propDeclRowCount(old) === 0) delete doc.props[old]; // drop the orphan
        } else if (propDeclRowCount(old) <= 1) {
            renamePropDecl(old, v); // this row is the only user — a plain rename (sibling rows follow)
        } else {
            // `old` is shared by other rows — branch a NEW prop off it (same model as a starting
            // point) and point just this row at it, leaving the others on `old`.
            doc.props[v] = { model: (doc.props[old] || {}).model || '' };
            r.prop = v;
        }
        changed();
        renderTree();
        renderPanel();
    };
    const pick = id => { suppress = true; closeDictPopup(); retargetOrRename(id); };
    entry.addEventListener('input', () => {
        const q = entry.textContent.trim().toLowerCase();
        // Only VALID (in-use) prop ids — never latent/orphaned declarations.
        const ids = propIdsInUse().filter(n => n !== r.prop && n.toLowerCase().includes(q));
        if (ids.length) buildAutocomplete(ids, entry, pick); else closeDictPopup();
    });
    entry.addEventListener('blur', () => {
        setTimeout(() => {
            if (suppress) { suppress = false; return; }
            closeDictPopup();
            retargetOrRename(entry.textContent.trim());
            entry.textContent = r.prop ?? '';
        }, 120);
    });
    entry.addEventListener('keydown', e => {
        if (autocompleteKeys(e)) { e.stopPropagation(); return; }
        if (e.key === 'Enter') { e.preventDefault(); entry.blur(); }
        if (e.key === 'Escape') { closeDictPopup(); entry.textContent = r.prop ?? ''; entry.blur(); }
        e.stopPropagation();
    });
    row.appendChild(entry);

    // A dropdown caret listing the prop ids ACTUALLY USED by rows (excludes orphaned declarations —
    // ones that exist but nothing references) — pick one to point this row at it.
    const caret = h('span', 'scn-pick', '▾');
    caret.tabIndex = 15;
    caret.setAttribute('role', 'button');
    caret.title = 'prop ids in use';
    caret.onclick = async e => {
        const ids = propIdsInUse();
        if (!ids.length) { setStatus('no props in use yet', 'scn-err'); return; }
        const picked = await showDropdown(ids.map(id => ({ name: id, value: id })), e.pageX, e.pageY);
        if (picked === null) return;
        retargetOrRename(picked.value);
    };
    row.appendChild(caret);
    return row;
}

// The prop ids REFERENCED by at least one prop row anywhere in the scenario — the props actually in
// use. Excludes orphaned declarations (declared, but no row acts on them).
function propIdsInUse() {
    const set = new Set();
    for (const st of Object.values(doc.states || {})) {
        for (const row of (st.props || [])) if (row.prop) set.add(row.prop);
    }
    return [...set].sort();
}

// ===================== tree =====================

function stateIds() {
    return Object.keys(doc.states).sort((a, b) => {
        const ra = ROLE_RANK[doc.states[a].role] || 9;
        const rb = ROLE_RANK[doc.states[b].role] || 9;
        return ra !== rb ? ra - rb : a.localeCompare(b);
    });
}

function select(s) {
    sel = s;
    renderAll(); // measurement for a newly-drawn state is fetched by renderTimeline, not a register
}

// ── carried-in props (preview inheritance) ──
//
// A state that isn't `enter` inherits the props its predecessors left on the ped — the lantern
// `enter` lit is still in hand during the idle and its fidgets. The engine reconstructs this for a
// preview (da_anims: Queue.carriedStates → Timeline.establishProps); these helpers compute what's on
// the ped at a state's START, so the author can SEE a prop is present without a row for it here.
//
// One deliberate difference from the engine's carriedStates: for a FIDGET this folds the idle too.
// The engine only ESTABLISHES `enter` for a fidget because it PLAYS the idle (a fidget layers over
// it) — but that means the idle's prop rows HAVE run by the time the fidget starts, so for an honest
// "what's in hand and where" the display has to read the idle's final attach. Same on-ped result,
// reached two ways. The predecessor rule otherwise tracks the Lua — change one, check the other.

// The scenario's single enter / idle state ids, by role (mirrors the engine's s.enter / s.idle).
function stateByRole(role) {
    for (const sid of Object.keys(doc.states)) {
        if (doc.states[sid].role === role) return sid;
    }
    return null;
}

// ===================== the in-scenario menu =====================
//
// A fidget's player-facing NAME and its key are not on the fidget. They live in a `menu` entry on the
// state you pick it FROM — the idle — because that's the list the trie builds:
//
//     idle = { role = "idle", menu = { { fidget = "puff", key = "s", label = "Smoke" } } }
//
// Which is correct for the engine and backwards for an author, who is looking at the fidget and asking
// "what is this called?". Nothing in the editor showed these at all: an imported scenario kept its
// labels (the document is the authored config, so they round-tripped into the export) but they were
// invisible and unsettable, and `addState` makes a fidget with no entry anywhere — unreachable in
// game, with no way to fix that from here. So the fidget's card edits its own entry, wherever it
// lives, and the owning state lists what its menu holds.

// The entry pointing at `sid`, and who owns it. Folders are walked, and an entry inside one is
// returned in place — editing it must not restructure the menu the author built.
function findMenuEntry(sid) {
    const walk = (list, folder) => {
        for (const opt of (list || [])) {
            if (opt.folder) {
                const hit = walk(opt.options, opt.folder);
                if (hit) return hit;
            } else if (opt.fidget === sid) {
                return { entry: opt, folder };
            }
        }
        return null;
    };
    for (const owner of stateIds()) {
        const hit = walk(doc.states[owner].menu, null);
        if (hit) return { owner, ...hit };
    }
    return null;
}

// Where a NEW entry goes: the idle's menu, since that's the state a fidget is picked from. Returns
// null when there's nowhere to put one (no idle, or the idle itself) — the caller then offers no
// fields rather than writing an entry nothing can reach.
function menuHomeFor(sid) {
    const idle = stateByRole('idle');
    return idle && idle !== sid ? idle : null;
}

function ensureMenuEntry(sid) {
    const found = findMenuEntry(sid);
    if (found) return found.entry;
    const home = menuHomeFor(sid);
    if (!home) return null;
    const st = doc.states[home];
    st.menu = st.menu || [];
    const entry = { fidget: sid };
    st.menu.push(entry);
    return entry;
}

// Menu entries are the one cross-reference between states that the registry REFUSES over ("menu: no
// such fidget state 'x'"), so renaming or deleting a state has to carry them. `next` is the same kind
// of reference and the same kind of refusal, so it rides along here.
function repointStateRefs(oldId, newId) {
    const walk = list => {
        for (const opt of (list || [])) {
            if (opt.folder) walk(opt.options);
            else if (opt.fidget === oldId) {
                if (newId) opt.fidget = newId; else opt._drop = true;
            }
        }
        if (list) {
            for (let i = list.length - 1; i >= 0; i--) if (list[i]._drop) list.splice(i, 1);
        }
    };
    for (const sid of Object.keys(doc.states)) {
        const st = doc.states[sid];
        walk(st.menu);
        if (st.menu && st.menu.length === 0) delete st.menu;
        // A dangling `next` is refused too; dropping it falls back to the one idle, which is the
        // sane resting place for a state whose successor just went away.
        if (st.next === oldId) { if (newId) st.next = newId; else delete st.next; }
    }
}

// The predecessor states whose prop rows have run by the time `sid` starts: enter is always upstream;
// the idle is upstream of everything except itself and enter (a fidget layers over it, an exit/
// transition passed through it). See the block comment for why a fidget folds the idle here.
function carriedPredecessors(sid) {
    const role = doc.states[sid] && doc.states[sid].role;
    if (!role || role === 'enter') return [];
    const out = [];
    const e = stateByRole('enter');
    if (e) out.push(e);
    if (role !== 'idle') {
        const idle = stateByRole('idle');
        if (idle && idle !== sid) out.push(idle);
    }
    return out;
}

// ===================== who forces this state's arrival blend =====================
//
// `nextBlendIn` is declared by the state you LEAVE and spent on the state you enter, so the number
// that governs an arrival row's blend can live anywhere in the config except on the row itself. That
// is invisible in an editor that shows one node at a time, and it is exactly the question an author
// asks ("why does my idle ease in when it says 3.0?"). So the row says who is overriding it.
//
// The edges INTO `sid`, as the queue walks them:
//   * a state whose `next` names it
//   * an enter or fidget with NO `next` — those fall back to the one idle
//   * a menu entry pointing at it (a fidget pick leaves whichever state offered the menu)
// A `transition` is not an edge here: it lands on ANOTHER scenario's idle, outside this document.
function incomingEdges(sid) {
    const idle = stateByRole('idle');
    const out = [];
    for (const from of stateIds()) {
        if (from === sid) continue;
        const st = doc.states[from];
        if (!st) continue;

        let reaches = st.next === sid;
        if (!reaches && st.next === undefined && sid === idle &&
            (st.role === 'enter' || st.role === 'fidget')) reaches = true;
        if (!reaches) {
            const walk = list => (list || []).some(o =>
                o.folder ? walk(o.options) : o.fidget === sid);
            reaches = walk(st.menu);
        }
        if (reaches) out.push(from);
    }
    return out;
}

// Only the ARRIVAL rows (`at = 0`) cross-fade with the outgoing anim, so only they can be overridden
// — mirrors playAnimRow in timeline_cl_ctl.lua.
function arrivalOverrides(sid) {
    return incomingEdges(sid)
        .filter(from => typeof doc.states[from].nextBlendIn === 'number')
        .map(from => ({ from, value: doc.states[from].nextBlendIn }));
}

// Does `sid` hand off to anything at all? An enter/fidget follows `next` or falls back to the one
// idle, an idle is left by whichever fidget the menu picks, a transition lands on another scenario's
// idle — but nothing follows an exit, so `nextBlendIn` has nothing to spend itself on there.
function handsOff(sid) {
    const st = doc.states[sid];
    if (!st) return false;
    if (st.role === 'exit') return false;
    if (st.role === 'transition') return true;
    if (st.next) return true;
    if (st.role === 'idle') return true;
    const idle = stateByRole('idle');
    return !!idle && idle !== sid;
}

// One field of this state's own menu entry (`key` or `label`), edited from the fidget's card. The
// entry is CREATED on the idle's menu the moment you type into either — which is how a new fidget
// becomes reachable at all — and clearing a field deletes just that key, never the entry: an entry
// with no key is auto-keyed and one with no label shows the state id, both still on the menu.
function menuEntryField(sid, key, label, hint, fallback) {
    return field({
        label, hint,
        inherited: fallback,
        get: () => {
            const found = findMenuEntry(sid);
            return (found && found.entry[key]) || '';
        },
        set: t => {
            const v = t.trim();
            const found = findMenuEntry(sid);
            if (v === '') {
                if (found) delete found.entry[key];
                return;
            }
            const entry = found ? found.entry : ensureMenuEntry(sid);
            if (!entry) return;
            entry[key] = v;
            // Creating an entry changes what the card should SAY (which state owns it), and the
            // commit that called us paints only this one field. Re-render after it finishes.
            if (!found) queueMicrotask(() => { if (sel.kind === 'state' && sel.state === sid) renderPanel(); });
        },
    });
}

// A state's menu, as the player will read it: key, label, what it points at. Read-only here — each
// entry's key and label are edited on the state it names — but clicking a row jumps to that state,
// so "rename this option" is one click from seeing it.
function menuOverviewNodes(st) {
    const out = [];
    const add = (list, depth) => {
        for (const opt of (list || [])) {
            const target = opt.fidget || opt.scenario || null;
            const line = h('div', 'scn-menu-line');
            line.style.paddingLeft = (8 + depth * 12) + 'px';
            line.appendChild(h('span', 'scn-menu-key', opt.key || '·'));
            line.appendChild(h('span', 'scn-menu-label', opt.label || opt.folder || target || '(empty)'));
            line.appendChild(h('span', 'scn-menu-target',
                opt.folder ? 'folder' : opt.scenario ? `→ scenario ${opt.scenario}` : `→ ${target}`));

            if (opt.fidget && doc.states[opt.fidget]) {
                line.title = `'${opt.fidget}' — click to edit its key and label on its own card` +
                    (opt.label ? '' : `\nNo label: the menu shows the state id, '${opt.fidget}'.`);
                line.onclick = () => select({ kind: 'state', state: opt.fidget });
            } else if (opt.fidget) {
                // The registry refuses the whole scenario over this, so it can't be a quiet nothing.
                line.classList.add('scn-danger');
                line.title = `'${opt.fidget}' is not a state in this scenario — registration will fail`;
            }
            out.push(line);
            if (opt.folder) add(opt.options, depth + 1);
        }
    };
    add(st.menu, 0);
    return out;
}

// The `next blend-in` editor. One field, two places: on the state card, and again at the foot of
// every anim row of that state — because tuning blends is a ROW job (blend-in, blend-out and this one
// are the same conversation), and making an author leave the row they're listening to in order to
// reach it is how the old `nextBlendInSpeed` got forgotten. It is the STATE's key either way: edit it
// from any row and it's the same number, which is what the separator above it says.
function nextBlendField(st, sid) {
    return numField(st, 'nextBlendIn', 'next blend-in',
        'blend-in forced on the at=0 animations of the state this one hands off to, for that handoff only ' +
        "— blank means the arriving state uses its own. Belongs to the state '" + sid + "'.");
}

// ===================== duplicate / delete =====================
//
// One implementation each, called from the panel's buttons AND the tree's right-click menu, so the
// two can't drift into doing subtly different things to the document.
//
// The document is plain JSON by construction — it crosses NUI, and hooks can't come with it — so a
// JSON round-trip is a complete deep copy and needs no per-shape clone code to keep in step with the
// config schema.
function deepCopy(v) { return JSON.parse(JSON.stringify(v)); }

// A duplicated ANIM row lands AFTER the one it came from, not on top of it. Two identical rows at the
// same offset are invisible (the bars sit exactly on each other) and, when the row is upper-body, a
// registration error — the engine holds one upper-body layer at a time, so `validateLayers` refuses
// the whole scenario. Offset by the source's measured length: the copy is the next beat, which is
// what "another one of these" means on a timeline, and it's one drag from anywhere else.
function duplicateAnimRow(sid, i) {
    const st = doc.states[sid];
    const src = st && st.anims && st.anims[i];
    if (!src) return;
    const copy = deepCopy(src);
    copy.at = (src.at || 0) + (rowLenOf(src) || DRAW_FALLBACK);
    st.anims.splice(i + 1, 0, copy);
    select({ kind: 'row', state: sid, i: i + 1 });
    changed();
}

// A prop row is an instant, not a span — no length to step past and no layer rule to break — so the
// copy keeps the original's offset. Same instant, one row down: usually you're about to point it at a
// different prop, or change the action.
function duplicatePropRow(sid, i) {
    const st = doc.states[sid];
    const src = st && st.props && st.props[i];
    if (!src) return;
    st.props.splice(i + 1, 0, deepCopy(src));
    select({ kind: 'prop', state: sid, i: i + 1 });
    changed();
}

// A duplicated STATE needs a free id, and a menu entry of its own if the original had one — a fidget
// nothing points at is unreachable in game. The copy's entry deliberately carries NO key: two
// unconditional entries sharing one is a hard registration error, and the trie assigns a free key to
// an entry that doesn't ask for one.
function duplicateState(sid) {
    const src = doc.states[sid];
    if (!src) return;

    let id = `${sid}_copy`, n = 2;
    while (doc.states[id]) id = `${sid}_copy${n++}`;
    doc.states[id] = deepCopy(src);

    // Exactly one idle, exactly one enter, exactly one exit — the registry refuses a second of any of
    // them, so the copy of a singleton becomes a fidget, which is the only thing it could be.
    const role = doc.states[id].role;
    if (role === 'idle' || role === 'enter' || role === 'exit') doc.states[id].role = 'fidget';

    const entry = findMenuEntry(sid);
    if (entry) {
        const copy = { fidget: id };
        if (entry.entry.label) copy.label = `${entry.entry.label} copy`;
        // Into the same list the original sits in — a folder member's copy belongs in that folder.
        const list = entry.folder
            ? (doc.states[entry.owner].menu.find(o => o.folder === entry.folder) || {}).options
            : doc.states[entry.owner].menu;
        if (list) list.push(copy);
    }

    select({ kind: 'state', state: id });
    changed();
}

function deleteAnimRow(sid, i) {
    const st = doc.states[sid];
    if (!st || !st.anims) return;
    st.anims.splice(i, 1);
    select({ kind: 'state', state: sid });
    changed();
}

function deletePropRow(sid, i) {
    const st = doc.states[sid];
    if (!st || !st.props) return;
    st.props.splice(i, 1);
    if (st.props.length === 0) delete st.props;
    pruneOrphanProps(); // the prop may now be unused — drop its declaration
    select({ kind: 'state', state: sid });
    changed();
}

function deleteState(sid) {
    delete doc.states[sid];
    // Take its menu entry and any `next` pointing at it with it — a dangling reference is refused at
    // registration, so a delete would otherwise break the whole scenario.
    repointStateRefs(sid, null);
    select({ kind: 'scenario' });
    changed();
}

// The tree's right-click: the same two operations, on the node under the pointer. Wired onto every
// state and row node, because "duplicate this" is a thing you want where you can SEE the list, not
// only after selecting a node and looking at the panel.
function nodeContextMenu(e, kind, sid, i) {
    e.preventDefault();
    e.stopPropagation();
    const what = kind === 'state' ? 'state' : kind === 'prop' ? 'prop' : 'animation';
    showDropdown([
        { name: `duplicate ${what}`, value: 'duplicate' },
        { name: `delete ${what}`, value: 'delete' },
    ], e.pageX, e.pageY).then(picked => {
        if (picked === null) return;
        if (picked.value === 'duplicate') {
            if (kind === 'state') duplicateState(sid);
            else if (kind === 'row') duplicateAnimRow(sid, i);
            else duplicatePropRow(sid, i);
        } else {
            if (kind === 'state') deleteState(sid);
            else if (kind === 'row') deleteAnimRow(sid, i);
            else deletePropRow(sid, i);
        }
    });
}

// A dim, informational line naming what overrides this state's arrival blend — not part of the
// config, and not editable here: you fix it on the state that forces it. Two sources listed means
// two edges in, each with its own blend, which is the whole point of the field.
function arrivalNote(sid) {
    const list = arrivalOverrides(sid);
    if (list.length === 0) return null;
    const el = h('div', 'scn-arrival',
        '↳ arrives at ' + list.map(o => `${o.value} from ${o.from}`).join(' · '));
    el.title = 'These states declare `nextBlendIn`, which overrides the blend-in of this state\'s ' +
        'at=0 animations for that one handoff. Later ones keep their own. Edit the number ' +
        'on the state that forces it.';
    return el;
}

// The bone an attach lands a prop on: the inline placement's bone, else the propset's own bone.
function heldBoneLabel(r) {
    if (isInlineAttach(r)) return (r.attach && r.attach.bone) || 'root';
    const info = propsetInfo(attachRefOf(r));
    return (info && info.bone) || attachRefOf(r) || 'attached';
}

// Fold one predecessor's prop rows onto a running presence map (prop -> { bone, sid, i }): spawn
// makes a prop present but loose, attach records the bone it lands on, detach leaves it present but
// loose, discard removes it, anim/expression change nothing. Row order, so a spawn later discarded
// in the same state nets out to absent — the same result the engine's replay reaches.
function foldPropPresence(present, sid) {
    const rows = (doc.states[sid] && doc.states[sid].props) || [];
    rows.map((r, i) => ({ r, i }))
        .sort((a, b) => (a.r.at || 0) - (b.r.at || 0) || a.i - b.i)
        .forEach(({ r, i }) => {
            if (!r.prop) return;
            const a = propAction(r);
            if (a === 'discard') present.delete(r.prop);
            else if (a === 'detach') { const e = present.get(r.prop); if (e) e.bone = null; }
            else if (a === 'spawn') { if (!present.has(r.prop)) present.set(r.prop, { bone: null, sid, i }); }
            else if (a === 'attach') present.set(r.prop, { bone: heldBoneLabel(r), sid, i });
        });
}

// The props a state inherits but has NO row of its own for — the ones with no other cue in the tree
// that they're already on the ped. Props the state does act on are left out: their own row is the cue.
function carriedInProps(sid) {
    const present = new Map();
    for (const pid of carriedPredecessors(sid)) foldPropPresence(present, pid);
    if (present.size === 0) return [];

    const acted = new Set(((doc.states[sid] && doc.states[sid].props) || [])
        .map(r => r.prop).filter(Boolean));

    const out = [];
    for (const [prop, at] of present) {
        if (!acted.has(prop)) out.push({ prop, bone: at.bone, from: at.sid, fromI: at.i });
    }
    return out;
}

function renderTree() {
    const ul = document.getElementById('scnTree');
    ul.innerHTML = '';

    const scnLi = h('li', 'scn-node scn-scenario' + (sel.kind === 'scenario' ? ' selected' : ''));
    scnLi.appendChild(h('span', 'scn-caret', ''));
    scnLi.appendChild(h('span', 'scn-label', `${docId} — ${doc.name || ''}`));
    scnLi.onclick = () => select({ kind: 'scenario' });
    // The scenario node offers what the scenario CARD offers — the same two actions, reachable from
    // the tree like every other node's are. `delete saved` only appears when there is one to delete.
    scnLi.oncontextmenu = e => {
        e.preventDefault();
        e.stopPropagation();
        const opts = [
            { name: 'save scenario', value: 'save' },
            { name: 'delete draft', value: 'draft' },
        ];
        if (savedIds.has(docId)) opts.push({ name: `delete saved "${docId}"`, value: 'saved' });
        showDropdown(opts, e.pageX, e.pageY).then(picked => {
            if (picked === null) return;
            if (picked.value === 'save') { saveScenario(); return; }
            if (picked.value === 'draft') { confirmDeleteDraft(docId); return; }
            showConfirm(`Delete the saved scenario "${docId}"? This cannot be undone.`,
                'Delete', 'Cancel').then(async yes => {
                if (!yes) return;
                const del = await sendClientMessage('scnSavedDelete', { id: docId });
                if (!del?.ok) { setStatus(del?.error || 'delete failed', 'scn-err'); return; }
                savedIds.delete(docId);
                savedSnapshot = null;
                setStatus(`deleted saved "${docId}" — the draft is untouched`, 'scn-note');
                renderPanel();
            });
        });
    };
    ul.appendChild(scnLi);

    for (const sid of stateIds()) {
        const st = doc.states[sid];
        const rows = st.anims || [];
        const pRows = st.props || [];
        const carried = carriedInProps(sid);
        const nRows = rows.length + pRows.length;
        const hasChildren = nRows + carried.length;
        const isCollapsed = collapsed.has(sid);

        const li = h('li', 'scn-node scn-state' +
            (sel.kind === 'state' && sel.state === sid ? ' selected' : ''));
        // Caret toggles collapse without moving the selection; the label selects.
        const caret = h('span', 'scn-caret', hasChildren ? (isCollapsed ? '▸' : '▾') : '·');
        if (hasChildren) {
            caret.classList.add('scn-caret-active');
            caret.onclick = e => {
                e.stopPropagation();
                if (isCollapsed) collapsed.delete(sid); else collapsed.add(sid);
                renderTree();
            };
        }
        li.appendChild(caret);
        const count = `${rows.length}` + (pRows.length ? `+${pRows.length}p` : '');
        li.appendChild(h('span', 'scn-label', `${sid}  ·  ${st.role || '?'}  (${count})`));
        // The player-facing name, after the structure: `puff · fidget (1)  Smoke`. It's kept in a
        // menu entry on ANOTHER state, so without this the tree is a list of ids and the labels are
        // one click away each. Only shown when the entry actually sets one — the engine falls back to
        // the id, which is already the first thing on this line.
        const named = findMenuEntry(sid);
        if (named && named.entry.label) {
            const tag = h('span', 'scn-menu-name', named.entry.label);
            tag.title = `what the player reads for '${sid}' — from the menu entry on '${named.owner}'`;
            li.appendChild(tag);
        }
        li.onclick = () => select({ kind: 'state', state: sid });
        // Right-click acts on the node under the pointer, whether or not it's the selected one.
        li.oncontextmenu = e => nodeContextMenu(e, 'state', sid);
        ul.appendChild(li);

        if (isCollapsed) continue;
        rows.forEach((r, i) => {
            const rowLi = h('li', 'scn-node scn-row' +
                (sel.kind === 'row' && sel.state === sid && sel.i === i ? ' selected' : ''));
            rowLi.appendChild(h('span', 'scn-caret', ''));
            rowLi.appendChild(h('span', 'scn-label', `@${r.at || 0}  ${r.anim || '(no anim)'}`));
            rowLi.onclick = () => select({ kind: 'row', state: sid, i });
            rowLi.oncontextmenu = e => nodeContextMenu(e, 'row', sid, i);
            ul.appendChild(rowLi);
        });
        pRows.forEach((r, i) => {
            const rowLi = h('li', 'scn-node scn-row scn-row-prop' +
                (sel.kind === 'prop' && sel.state === sid && sel.i === i ? ' selected' : ''));
            rowLi.appendChild(h('span', 'scn-caret', ''));
            const what = r.expression !== undefined && !propAction(r) ? 'expression' : (propAction(r) || '…');
            rowLi.appendChild(h('span', 'scn-label', `@${r.at || 0}  ${r.prop || '(no prop)'} · ${what}`));
            rowLi.onclick = () => select({ kind: 'prop', state: sid, i });
            rowLi.oncontextmenu = e => nodeContextMenu(e, 'prop', sid, i);
            ul.appendChild(rowLi);
        });
        // Carried-in props: dimmed, informational, not part of the config. Clicking jumps to the
        // predecessor row that establishes the prop, so "where did this come from?" is one click.
        carried.forEach(c => {
            const ghost = h('li', 'scn-node scn-row scn-row-carried');
            ghost.appendChild(h('span', 'scn-caret', ''));
            const held = c.bone ? `holding · ${c.bone}` : 'present · loose';
            ghost.appendChild(h('span', 'scn-label', `↳ ${c.prop} · ${held}`));
            ghost.title = `inherited — established in '${c.from}', still on the ped when '${sid}' starts.\n` +
                `Preview reconstructs it; it is NOT declared here. Click to jump to the prop that sets it up.`;
            ghost.onclick = () => select({ kind: 'prop', state: c.from, i: c.fromI });
            ul.appendChild(ghost);
        });
    }
}

// ===================== panel =====================

function panelInto(el, title, nodes) {
    document.getElementById('scnPanelTitle').textContent = title;
    el.innerHTML = '';
    nodes.forEach(n => el.appendChild(n));
}

function actionButton(label, fn, danger) {
    const b = h('div', 'control' + (danger ? ' scn-danger' : ''), label);
    b.tabIndex = 15;
    b.setAttribute('role', 'button');
    b.onclick = fn;
    return b;
}

// ── option sets for the dropdown fields ──

function roleOptions() {
    return ROLES.map(r => ({ name: r, value: r }));
}

// The scenario's own states — for `next`. Blank clears the key (defaults to the idle).
function nextOptions() {
    return [{ name: '(default idle)', value: undefined }]
        .concat(stateIds().map(s => ({ name: s, value: s })));
}

// The task-filter list (da_lib/data/taskFilter.lua) already carries the two special values a config
// cares about — `false` (opt out of an inherited filter) and "" (None). Prepend "(inherit)" =
// delete the key so the row falls back to the scenario/defaults filter.
async function taskFilterOptions() {
    const list = await getTaskFilters();
    return [{ name: '(inherit)', value: undefined }]
        .concat(list.map(t => ({ name: t.name, value: t.value, tooltip: t.note })));
}

function taskFilterLabel(v) {
    if (v === undefined) return '(inherit)';
    if (v === false) return 'false';
    if (v === '') return 'None';
    return v;
}

// ── prop declarations (scenario-level) ──
//
// `props = { banjo = { propset = "Banjo", persist = true } }` — declare once, act in rows.

function renamePropDecl(oldName, newName) {
    if (!newName || newName === oldName) return;
    if (doc.props[newName]) { setStatus(`prop '${newName}' already declared`, 'scn-err'); return; }
    doc.props[newName] = doc.props[oldName];
    delete doc.props[oldName];
    // every row referencing the old name follows it — a rename is not an orphaning
    for (const st of Object.values(doc.states || {})) {
        for (const r of (st.props || [])) if (r.prop === oldName) r.prop = newName;
    }
}

function propDeclRowCount(name) {
    let n = 0;
    for (const st of Object.values(doc.states || {})) {
        for (const r of (st.props || [])) if (r.prop === name) n++;
    }
    return n;
}

function propsetOptions(withDefault) {
    return async () => {
        const list = await getPropsets();
        const opts = list.map(p => ({
            name: p.name,
            value: p.name,
            tooltip: p.bone ? `bone ${p.bone}` : undefined,
        }));
        return withDefault
            ? [{ name: '(declared default)', value: true }].concat(opts)
            : opts;
    };
}

// The declarations section of the scenario panel: one block per declared prop.
// A compact, read-only overview of the scenario's props — id → model, one line each, so all of them
// are visible at a glance. Everything about a prop is now edited from its ROWS (id + model on the
// row, fade in on spawn/attach, persist on detach/discard), so the scenario card only shows them.
// Clicking a line jumps to that prop's first row. Only props actually used by rows are listed.
function propDeclNodes() {
    const ids = propIdsInUse();
    if (!ids.length) {
        return [h('div', 'scn-prop-empty', 'no props — add one with “+ prop” on a state')];
    }
    const nodes = [];
    for (const id of ids) {
        const decl = doc.props[id] || {};
        const model = decl.model || decl.propset || '(no model)';
        const line = h('div', 'scn-prop-line');
        line.appendChild(h('span', 'scn-prop-id', id));
        line.appendChild(h('span', 'scn-prop-model', model));
        line.title = 'jump to this prop’s first entry';
        line.onclick = () => {
            for (const sid of stateIds()) {
                const rows = doc.states[sid].props || [];
                const i = rows.findIndex(r => r.prop === id);
                if (i !== -1) { select({ kind: 'prop', state: sid, i }); return; }
            }
        };
        nodes.push(line);
    }
    return nodes;
}

function renderPanel() {
    closeDictPopup(); // a rebuild replaces the fields; don't leave a dict popup floating over them
    const el = document.getElementById('scnPanel');

    if (sel.kind === 'scenario') {
        doc.defaults = doc.defaults || {};
        const nodes = [
            savedBadgeNode(),
            field({
                label: 'id',
                hint: 'the id EVERYTHING keys off: the draft this autosaves to, the saved copy it ' +
                      'writes, and the id the emitted Lua carries. Changing it renames the draft.',
                get: () => docId,
                set: t => { const v = t.trim(); if (v) renameDraft(docId, v); },
            }),
            strField(doc, 'name', 'name', 'what the player reads'),
            dictField(doc, 'dict', 'dict', 'default dict; animations may use "@suffix" of it'),
            field({
                label: 'menu', hint: 'placement: tag:key, tag:key — e.g. stand:q',
                get: () => menuText(doc.menu),
                set: t => { doc.menu = parseMenu(t); },
            }),
            field({
                label: 'when', hint: 'keyword=true/false/allow, comma-separated',
                get: () => whenText(doc.when),
                set: t => { doc.when = parseWhen(t); },
            }),
            h('div', 'flabel scn-sep', 'animation defaults'),
            bitmaskField({
                label: 'flag', fetch: getAnimFlags,
                get: () => doc.defaults.flag,
                set: v => { if (v === undefined) delete doc.defaults.flag; else doc.defaults.flag = v; },
            }),
            numField(doc.defaults, 'blendIn', 'blend-in'),
            numField(doc.defaults, 'blendOut', 'blend-out'),
            numField(doc.defaults, 'rate', 'rate'),
            selectField({
                label: 'taskfilter', options: taskFilterOptions,
                get: () => taskFilterLabel(doc.defaults.taskFilter),
                set: v => { if (v === undefined) delete doc.defaults.taskFilter; else doc.defaults.taskFilter = v; },
            }),
        ];
        if (Object.keys(doc.defaults).length === 0) delete doc.defaults;
        nodes.push(h('div', 'flabel scn-sep', 'props'));
        nodes.push(...propDeclNodes());

        // (the indicator is prepended below, so it sits at the TOP of the card)

        // The scenario's own actions, on the scenario's own card: saving it, and deleting the draft
        // you're looking at (which leaves you on a fresh scenario rather than on a document whose
        // next autosave would write the draft back — see deleteDraft). The toolbar above stays for
        // things that act on the EDITOR — new, import, export, the transport.
        const bar = h('div', 'subbar');
        bar.appendChild(actionButton('save scenario', saveScenario));
        bar.appendChild(actionButton('delete draft', () => confirmDeleteDraft(docId), true));
        nodes.push(bar);

        panelInto(el, `scenario · ${docId}`, nodes);
        return;
    }

    const st = doc.states[sel.state];
    if (!st) { panelInto(el, '', []); return; }

    if (sel.kind === 'state') {
        const sid = sel.state;
        // Held so the notes and a transition's `to` can be positioned against it by identity rather
        // than by a hardcoded index that shifts whenever a field is added.
        const nextBlend = nextBlendField(st, sid);
        const nodes = [
            field({
                label: 'id',
                get: () => sid,
                set: t => {
                    const v = t.trim();
                    if (!v || v === sid || doc.states[v]) return;
                    doc.states[v] = st;
                    delete doc.states[sid];
                    // Menu entries and `next` name states by id; leaving them on the old name is a
                    // config the registry refuses.
                    repointStateRefs(sid, v);
                    sel = { kind: 'state', state: v };
                },
            }),
            selectField({
                label: 'role', hint: ROLES.join(' / '), options: roleOptions,
                get: () => st.role ?? '',
                set: v => { if (v) st.role = v; },
            }),
            selectField({
                label: 'next', hint: 'state to go to; defaults to the idle', options: nextOptions,
                get: () => st.next ?? '',
                set: v => { if (v === undefined) delete st.next; else st.next = v; },
            }),
            // Not the blend of THIS state — the blend of whatever it hands off to. Named on the
            // source because `blendIn` belongs to the arriving state and one number can't serve two
            // edges in: a weighty enter wants the idle to ease in under it, the fidget flicking back
            // to that same idle wants it snapped on.
            nextBlend,
            field({
                label: 'await', hint: 'ms, "auto", "auto 0.8", "auto trim 0", "false", blank = poll',
                get: () => awaitText(st.await),
                set: t => {
                    const v = parseAwait(t);
                    if (v === undefined) delete st.await; else st.await = v;
                },
            }),
            field({
                label: 'loop from', hint: 'ms — makes the state a loop region (await = cycle)',
                get: () => (st.loop && st.loop.from !== undefined) ? String(st.loop.from) : '',
                set: t => {
                    const n = Number(t.trim());
                    if (t.trim() === '' || !Number.isFinite(n)) delete st.loop;
                    else st.loop = { from: n };
                },
            }),
            field({
                label: 'when',
                get: () => whenText(st.when),
                set: t => { st.when = parseWhen(t); },
            }),
        ];
        // `to` sits after `next blend-in`, matching the key order the serializer emits
        // (role, next, nextBlendIn, to, await).
        if (st.role === 'transition') {
            nodes.splice(nodes.indexOf(nextBlend) + 1, 0,
                strField(st, 'to', 'to', 'target scenario id'));
        }
        // Who overrides THIS state's arrival, if anyone — the other half of `next blend-in`, read
        // from the receiving end.
        const arriving = arrivalNote(sid);
        if (arriving) nodes.push(arriving);

        // How the player REACHES this one: its key and its name on the menu it appears in. Only
        // fidgets and transitions are menu options — an enter is reached by the scenario's own key
        // (the scenario card's `menu`), an idle and an exit are reached by playing.
        if (st.role === 'fidget' || st.role === 'transition') {
            const entry = findMenuEntry(sid);
            const home = entry ? entry.owner : menuHomeFor(sid);
            if (home) {
                nodes.push(h('div', 'flabel scn-sep', entry
                    ? `menu · in '${home}'` + (entry.folder ? ` > ${entry.folder}` : '')
                    : `menu · not on one yet — typing adds it to '${home}'`));
                nodes.push(menuEntryField(sid, 'key', 'menu key',
                    'the key the player presses for this option; blank lets the trie assign one'));
                nodes.push(menuEntryField(sid, 'label', 'menu label',
                    'what the player reads. Blank shows the state id.', () => sid));
            }
        }

        // What this state's OWN menu offers (an idle's, mostly) — the list the labels above land in.
        if (st.menu && st.menu.length) {
            nodes.push(h('div', 'flabel scn-sep', 'menu offers'));
            nodes.push(...menuOverviewNodes(st));
        }

        const bar = h('div', 'subbar');
        // No per-state "play" button — the timeline transport plays whatever state is focused, and
        // selecting a state focuses it, so "play" always runs what you're looking at.
        bar.appendChild(actionButton('duplicate state', () => duplicateState(sid)));
        bar.appendChild(actionButton('delete state', () => deleteState(sid), true));
        nodes.push(bar);
        panelInto(el, `state · ${sid}`, nodes);
        return;
    }

    if (sel.kind === 'prop') {
        const r = (st.props || [])[sel.i];
        if (!r) { panelInto(el, '', []); return; }
        const action = propAction(r);
        const decl = doc.props && doc.props[r.prop];

        // Row-specific options first: which prop, when in the state, under what condition, doing what.
        const nodes = [
            propIdField(r),
            numField(r, 'at', 'at', 'offset ms from the start of the state'),
            field({
                label: 'when',
                get: () => whenText(r.when),
                set: t => { r.when = parseWhen(t); },
            }),
            selectField({
                label: 'action',
                hint: 'one per prop entry — exclusive; expression may ride along or stand alone',
                options: PROP_ACTIONS.map(a => ({ name: a, value: a }))
                    .concat([{ name: '(none — expression only)', value: undefined }]),
                get: () => action || (r.expression !== undefined ? '(expression only)' : '—'),
                set: v => setPropAction(r, v),
            }),
        ];

        // Then the PROP specifics for the chosen action, under a separator so the two groups read
        // apart. A searchable `model` field (writing the declaration's model, since a prop id has
        // one model) opens the actions that instantiate it.
        nodes.push(h('div', 'flabel scn-sep', action ? `${action}` : 'prop'));

        // A hand-written config may spell these as non-tables; normalize so the sub-fields have a
        // table to write into.
        if (action === 'spawn' && (typeof r.spawn !== 'object' || r.spawn === null)) r.spawn = {};
        if (action === 'detach' && (typeof r.detach !== 'object' || r.detach === null)) r.detach = {};

        if (action === 'spawn') {
            if (decl) nodes.push(modelField(decl, 'model', 'model', 'the object this prop is — a prop id has one model'));
            nodes.push(
                numField(r.spawn, 'angle', 'angle', 'degrees around the ped; 0 = facing direction'),
                numField(r.spawn, 'dist', 'dist', 'metres from the ped'),
                numField(r.spawn, 'z', 'z', 'height offset — -1.0 is the ground at your feet'),
                boolField(r, 'fadeIn', 'fade in', 'fade the prop in as it spawns (only if not already spawned)'),
            );
        } else if (action === 'attach' && isInlineAttach(r)) {
            // The inline placement: the model is the prop's (searchable here, writes the
            // declaration); bone/offset/rotation are this attach's, tunable in the row or in 3D.
            if (typeof r.attach !== 'object' || r.attach === null) r.attach = {};
            if (decl) nodes.push(modelField(decl, 'model', 'model', 'the object this prop is — a prop id has one model'));
            nodes.push(boneField(r.attach, 'bone', 'bone', 'skeleton bone to attach to; blank = entity root'));
            nodes.push(vec3Fields(r.attach, 'position', 'offset', 'metres from the bone'));
            nodes.push(vec3Fields(r.attach, 'rotation', 'rotation', 'degrees'));
            nodes.push(boolField(r, 'fadeIn', 'fade in', 'fade the prop in on attach (only if not already spawned)'));
            const bar = h('div', 'subbar');
            bar.appendChild(actionButton('✥ edit in 3D', () => openPropForRow({
                prop: r.prop,
                model: (decl && decl.model) || '',
                attach: r.attach,
                hint: `place "${r.prop}" — pick a model if unset, tune bone/offset/rotation, then Apply`,
                onApply: (model, placement) => {
                    // Prop mode may have set the model (first time) — it's the declaration's.
                    if (model && decl) decl.model = model;
                    r.attach = placement;
                    changed();
                    renderPanel();
                },
            })));
            // Zero the offset and rotation (bone kept) — back to sitting on the bone origin.
            bar.appendChild(actionButton('reset', () => {
                r.attach.position = { x: 0, y: 0, z: 0 };
                r.attach.rotation = { x: 0, y: 0, z: 0 };
                changed();
                renderPanel();
            }));
            nodes.push(bar);
        } else if (action === 'attach') {
            // A LEGACY imported attach: a propset ref/variant. Keep it editable so old scenarios
            // round-trip; "convert to inline" moves it to the new shape.
            nodes.push(propsetField({
                label: 'attach', hint: 'legacy propset ref/variant; use “convert to inline” for the new shape',
                withDefault: true,
                get: () => r.attach === true ? '(declared default)' : (r.attach ?? ''),
                set: v => { r.attach = v; },
                plusHint: 'author a new propset in prop mode',
                onNew: () => openPropForNew({
                    name: 'MyProp',
                    hint: 'author the propset, then Save',
                    onSaved: nm => { r.attach = nm; changed(); renderPanel(); },
                }),
            }));
            const bar = h('div', 'subbar');
            bar.appendChild(actionButton('convert to inline', () => {
                r.attach = {}; // drop the ref; the placement is now authored inline
                changed();
                renderPanel();
            }));
            nodes.push(bar);
        } else if (action === 'detach') {
            nodes.push(
                numField(r.detach, 'velocity', 'velocity', 'upward m/s — negative slams it down, ~0.8 is a drop'),
                numField(r.detach, 'distance', 'distance', 'metres of forward throw'),
                numField(r.detach, 'angle', 'angle', 'degrees off the facing direction'),
                numField(r.detach, 'settle', 'settle', 'ms to let it come to rest before releasing it'),
                boolField(r.detach, 'discard', 'then discard', 'delete it once settled — the legal spelling of throw-then-delete'),
            );
            if (decl) nodes.push(boolField(decl, 'persist', 'persist', 'the prop outlives the run — survives scenario transitions instead of being cleaned up'));
        } else if (action === 'discard') {
            if (decl) nodes.push(boolField(decl, 'persist', 'persist', 'the prop outlives the run — survives scenario transitions instead of being cleaned up'));
        } else if (action === 'anim') {
            nodes.push(
                dictField(r, 'dict', 'dict', '"@suffix" of the scenario dict or absolute — props do NOT inherit the scenario dict'),
                animField(r, effectivePropDict),
                boolField(r, 'loop', 'loop'),
                boolField(r, 'stayInAnim', 'stay in anim'),
            );
        }

        // `expression` rides any action (or stands alone) — it morphs the model, so it's a prop
        // specific, listed last.
        nodes.push(field({
            label: 'expression', hint: 'DOF morph on the prop\'s model: "0.7" sets, "add -0.15" moves',
            get: () => exprText(r.expression),
            set: t => {
                const v = parseExpr(t);
                if (v === undefined) delete r.expression; else r.expression = v;
            },
        }));

        const bar = h('div', 'subbar');
        bar.appendChild(actionButton('duplicate prop', () => duplicatePropRow(sel.state, sel.i)));
        bar.appendChild(actionButton('delete prop', () => deletePropRow(sel.state, sel.i), true));
        nodes.push(bar);
        panelInto(el, `prop · ${sel.state}[${sel.i + 1}]`, nodes);
        return;
    }

    // row
    const r = (st.anims || [])[sel.i];
    if (!r) { panelInto(el, '', []); return; }
    // What a blank field inherits, shown dimmed: the scenario's row default if it sets one, else the
    // engine's built-in default (ENGINE_ROW_DEFAULTS) — so the effective value is always visible.
    const d = doc.defaults || {};
    const inh = key => d[key] !== undefined ? d[key] : ENGINE_ROW_DEFAULTS[key];
    // Held so the arrival note can be slotted in directly beneath the field it qualifies.
    const blendInField = numField(r, 'blendIn', 'blend-in', undefined, () => inh('blendIn'));
    const nodes = [
        numField(r, 'at', 'at', 'offset ms from the start of the state'),
        dictField(r, 'dict', 'dict', '"@suffix" of the scenario dict, absolute, or blank = scenario dict',
            () => doc.dict),
        animField(r),
        numField(r, 'hold', 'hold', 'ms this animation plays; -1/blank = natural end'),
        bitmaskField({
            label: 'flag', hint: Object.keys(FLAG_PRESETS).join(' '), fetch: getAnimFlags,
            get: () => r.flag,
            set: v => { if (v === undefined) delete r.flag; else r.flag = v; },
            inherited: () => flagText(inh('flag')),
        }),
        // Sits with `flag` because it's about the same thing: which slot this row occupies and what
        // it does to the one that's already there.
        boolField(r, 'clearLayers', 'clear layers',
            "stop the ped's upper-body layer as this animation starts — how a full-body one " +
            'interrupts a looping upper-body one, instead of a throwaway 10ms animation to evict it'),
        blendInField,
        numField(r, 'blendOut', 'blend-out', undefined, () => inh('blendOut')),
        numField(r, 'rate', 'rate', undefined, () => inh('rate')),
        bitmaskField({
            label: 'ik-flags', fetch: getAnimIKFlags,
            get: () => r.ikFlags,
            set: v => { if (v === undefined) delete r.ikFlags; else r.ikFlags = v; },
        }),
        selectField({
            label: 'taskfilter', hint: 'bone mask, or false to opt out of an inherited one',
            options: taskFilterOptions,
            get: () => r.taskFilter === undefined ? '' : taskFilterLabel(r.taskFilter),
            set: v => { if (v === undefined) delete r.taskFilter; else r.taskFilter = v; },
            inherited: () => d.taskFilter !== undefined ? taskFilterLabel(d.taskFilter) : undefined,
        }),
        field({
            label: 'when',
            get: () => whenText(r.when),
            set: t => { r.when = parseWhen(t); },
        }),
    ];
    // An `at = 0` row is what cross-fades with the outgoing state's last frame, so an incoming
    // `nextBlendIn` REPLACES the blend-in above it. Say so where the number is, not in a manual.
    if ((r.at || 0) === 0) {
        const arriving = arrivalNote(sel.state);
        if (arriving) nodes.splice(nodes.indexOf(blendInField) + 1, 0, arriving);
    }

    // The OUTGOING side of the same conversation. It's the state's key, not the row's — hence the
    // separator naming the state — but blend-in, blend-out and "what the next state blends at" are
    // one tuning job, and this is the card you're on while you do it. Every anim row of a state shows
    // the same number; editing it from any of them edits that one value.
    //
    // Skipped on an exit: nothing arrives after the run ends, so the field would be dead weight on
    // every row of it. The state card still offers it, for the rare `onEnd` hook that steers out of
    // an exit.
    if (handsOff(sel.state)) {
        nodes.push(h('div', 'flabel scn-sep', `handoff · state '${sel.state}'`));
        nodes.push(nextBlendField(st, sel.state));
    }

    const bar = h('div', 'subbar');
    bar.appendChild(actionButton('duplicate animation', () => duplicateAnimRow(sel.state, sel.i)));
    bar.appendChild(actionButton('delete animation', () => deleteAnimRow(sel.state, sel.i), true));
    nodes.push(bar);
    panelInto(el, `animation · ${sel.state}[${sel.i + 1}]`, nodes);
}

// ===================== timeline =====================
//
// Drawn from what the REGISTRY made of the draft (live.scenario), never from the document: dicts
// resolved, defaults applied, lengths measured by the engine, await resolved by the same code the
// run uses. A row cut short by the await is visibly cut short.

function timelineStateId() {
    if (sel.kind === 'state' || sel.kind === 'row' || sel.kind === 'prop') return sel.state;
    return live?.scenario?.idleId || stateIds()[0];
}

const DRAW_FALLBACK = 500; // drawn width (ms) for a valid row whose length couldn't be measured
const INVALID_W = 600;     // drawn width (ms) for an unconfigured (red) row — it has no real duration

// A valid doc row's drawn length: an explicit `hold`, else the length the engine measured for the
// matching live row (`lr`), else nothing. `lr` is the registry's take on the same row (see below).

// The state's full extent in ms — the later of its resolved await and its longest row — computed
// from the DOCUMENT (so red rows count too), pairing valid rows with the registry's measured ones.
function stateExtentMs(sid) {
    const docSt = doc.states[sid];
    if (!docSt) return 0;
    const awaitMs = resolveAwaitFor(sid);
    let end = typeof awaitMs === 'number' ? awaitMs : 0;
    for (const r of (docSt.anims || [])) {
        const at = r.at || 0;
        if (rowInvalidReason(r)) { end = Math.max(end, at + INVALID_W); continue; }
        end = Math.max(end, at + (rowLenOf(r) || DRAW_FALLBACK));
    }
    // Prop rows are instants, but a detach's settle tail and a prop-anim's measured length both
    // occupy time the strip has to show.
    for (const r of (docSt.props || [])) {
        const at = r.at || 0;
        if (propRowInvalidReason(r)) { end = Math.max(end, at + INVALID_W); continue; }
        let e = at;
        if (r.detach && typeof r.detach.settle === 'number') e = at + r.detach.settle;
        if (r.anim !== undefined) e = at + (propRowLenOf(r) || DRAW_FALLBACK);
        end = Math.max(end, e);
    }
    return Math.max(end, 500);
}

function fmtMs(ms) {
    if (ms === 0) return '0';
    if (ms % 1000 === 0) return (ms / 1000) + 's';
    return (ms / 1000).toFixed(ms % 100 === 0 ? 1 : 2) + 's';
}

// Nice ruler interval: the smallest step whose spacing is at least ~80px, so ticks never crowd.
const TICK_STEPS = [50, 100, 250, 500, 1000, 2000, 2500, 5000, 10000, 15000, 30000, 60000];
function tickStep() {
    const targetMs = 80 / pxPerMs;
    return TICK_STEPS.find(s => s >= targetMs) || TICK_STEPS[TICK_STEPS.length - 1];
}

function renderTimeline() {
    const titleEl = document.getElementById('scnTimelineTitle');
    const ruler = document.getElementById('scnRuler');
    const tracks = document.getElementById('scnTracks');
    const inner = document.getElementById('scnTimelineInner');
    ruler.innerHTML = '';
    tracks.innerHTML = '';
    document.getElementById('scnZoomLabel').textContent = `${Math.round(pxPerMs * 1000)} px/s`;

    const sid = timelineStateId();
    const docSt = doc.states[sid];
    if (!docSt) { titleEl.textContent = '(no state)'; inner.style.width = '0px'; return; }

    // Drawn entirely from the DOCUMENT — so half-authored rows still show (as red boxes) and every
    // edit redraws with no register. Lengths and the resolved await come from the cheap cached engine
    // calls, which are kicked off here for anything not measured yet.
    ensureLengths(docSt.anims || []);
    const awaitMs = resolveAwaitFor(sid);

    const totalMs = stateExtentMs(sid) * 1.04; // a little air on the right
    inner.style.width = Math.max(totalMs * pxPerMs, 200) + 'px';

    // Pack rows into as few lanes as possible: a row shares a lane with an earlier one when their
    // time spans don't overlap, so two rows that never overlap sit end-to-end on one lane. This is
    // the greedy interval-graph colouring — take rows in start order and drop each into the first
    // lane whose last bar has already ended.
    //
    // Layers (upper-body) and primaries (full-body) are packed SEPARATELY and stacked with layers
    // ON TOP, because a layer plays over a primary (ADR-0013) — so the picture reads the way the
    // engine composites it: full body on the bottom, the upper-body layer riding above it.
    const items = (docSt.anims || []).map((r, i) => {
        const at = r.at || 0;
        const isLayer = (effectiveFlag(r) & FLAG_PRESETS.UpperBody) !== 0;
        const reason = rowInvalidReason(r);
        if (reason) {
            return { r, i, at, isLayer, invalid: true, reason, len: null, end: at + INVALID_W };
        }
        const len = rowLenOf(r);
        return { r, i, at, isLayer, invalid: false, reason: null, len, end: at + (len || DRAW_FALLBACK) };
    });

    function pack(group) {
        const laneEnds = [];
        for (const it of group.slice().sort((a, b) => a.at - b.at || a.end - b.end)) {
            let lane = laneEnds.findIndex(end => end <= it.at);
            if (lane === -1) lane = laneEnds.length;
            laneEnds[lane] = it.end;
            it.lane = lane;
        }
        return laneEnds.length;
    }
    const layers = items.filter(it => it.isLayer);
    const primaries = items.filter(it => !it.isLayer);
    const layerLanes = pack(layers);
    const primaryLanes = pack(primaries);
    const laneCount = Math.max(layerLanes + primaryLanes, 1);

    const pRows = docSt.props || [];
    const nBad = items.filter(it => it.invalid).length +
        pRows.filter(r => propRowInvalidReason(r)).length;
    const awaitLabel = awaitMs === false ? 'advance' :
        typeof awaitMs === 'number' ? fmtMs(awaitMs) : 'poll';
    const awaitSeg = `await ${awaitText(docSt.await) || 'poll'} → ${awaitLabel}`;
    const tail = ` · ${items.length} anim${items.length === 1 ? '' : 's'}` +
        (pRows.length ? ` · ${pRows.length} prop${pRows.length === 1 ? '' : 's'}` : '') +
        (nBad ? ` · ${nBad} unconfigured` : '') +
        (laneCount > 1 ? ` · ${laneCount} lanes` : '');

    // A POLLING state draws no cutoff — there's no number to draw one at — so the timeline offers no
    // way to give it one, and the await that governs the state is reachable only from the panel. So
    // the `await poll → poll` segment is itself the button: clicking it pins the await at the length
    // the poll is already waiting out (the primary row's measured end), turning an implicit wait into
    // an explicit number you can then drag. Nothing about the state's behaviour changes at the moment
    // you click — that's the point of using the poll's own number.
    titleEl.textContent = '';
    titleEl.appendChild(h('span', null, `${sid} · `));
    // Gated on the AUTHORED await, not the resolved one: `false` is a deliberate fire-and-forget, and
    // an `"auto"` state reads as a poll for the one frame before the engine answers — clicking then
    // would quietly replace `auto` with a number.
    const polls = docSt.await === undefined || docSt.await === null;
    const pinTo = polls ? pollLengthMs(items) : null;
    if (pinTo !== null) {
        const pin = h('span', 'scn-await-pin', awaitSeg);
        pin.title = `click to pin await at ${pinTo}ms — the primary animation's measured end, which is ` +
            'what this poll already waits for. Then drag the cutoff to trim it.';
        pin.onclick = () => {
            docSt.await = pinTo;
            changed();   // redraws the strip, so the cutoff appears at pinTo, draggable from there
            if (sel.kind === 'state' && sel.state === sid) renderPanel();
        };
        titleEl.appendChild(pin);
    } else {
        titleEl.appendChild(h('span', null, awaitSeg));
    }
    titleEl.appendChild(h('span', null, tail));

    // The ruler: a labelled tick every `step` ms. THESE are the measure indicators — a bar's width
    // reads against a real time scale, not a stretch-to-fit.
    const step = tickStep();
    for (let t = 0; t <= totalMs; t += step) {
        const tick = h('div', 'scn-tick');
        tick.style.left = (t * pxPerMs) + 'px';
        tick.appendChild(h('span', 'scn-tick-label', fmtMs(t)));
        ruler.appendChild(tick);
    }

    // One track per lane. Layer lanes first (top), primary lanes below — so `layerLanes` tracks of
    // upper-body sit above `primaryLanes` tracks of full-body.
    const laneEls = [];
    for (let l = 0; l < laneCount; l++) {
        const track = h('div', 'scn-track');
        laneEls.push(track);
        tracks.appendChild(track);
    }
    const trackFor = it => laneEls[it.isLayer ? it.lane : layerLanes + it.lane];

    // The await cutoff, spanning every lane — draggable to set the await value (below). It snaps
    // against the same anchors a bar does, `items` being the drawn rows.
    if (typeof awaitMs === 'number') {
        tracks.appendChild(makeAwaitHandle(sid, awaitMs, totalMs, items));
    }

    for (const it of items) {
        const { r, i, at, len, isLayer, invalid, reason } = it;
        const isSel = sel.kind === 'row' && sel.state === sid && sel.i === i;
        const bar = h('div', 'scn-bar'
            + (invalid ? ' scn-bar-invalid' : (len ? '' : ' scn-bar-unmeasured'))
            + (isLayer && !invalid ? ' scn-bar-upper' : '')
            + (isSel ? ' selected' : ''));
        bar.style.left = (at * pxPerMs) + 'px';
        bar.style.width = ((invalid ? INVALID_W : (len || DRAW_FALLBACK)) * pxPerMs) + 'px';

        if (invalid) {
            // An unconfigured row: red, labelled with what's missing, and skipped on play.
            bar.appendChild(h('span', 'scn-bar-label', `${r.anim || '(no anim)'} · ${reason}`));
            bar.title = `unconfigured — ${reason}\nfix it, or it's left out when you play`;
        } else {
            // The whole point of the strip: a row whose motion outlives the state's await is visibly
            // truncated at the cutoff.
            const runsPast = typeof awaitMs === 'number' && len && (at + len) > awaitMs;
            if (runsPast) bar.classList.add('scn-bar-cut');
            bar.appendChild(h('span', 'scn-bar-label',
                `${r.anim || '(no anim)'}${len ? ` ${Math.round(len)}ms` : ' (unmeasured)'}`));
            bar.title = `${effectiveDict(r)} / ${r.anim}\nat ${at}  len ${len ? Math.round(len) : '?'}` +
                (isLayer ? '\nupper-body layer' : '') +
                (runsPast ? `\ncut off at ${awaitMs}ms by await` : '');
        }
        makeBarDraggable(bar, sid, i, items);
        trackFor(it).appendChild(bar);
    }

    // ── prop lanes ──
    //
    // Below the anim lanes: ONE THIN LANE PER PROP the state acts on. A prop row is an instant,
    // not a duration, so each lane draws a derived LIFECYCLE BAR — first spawn/attach to last
    // detach/discard — with the actual rows as draggable markers on it. The markers are the rows;
    // the bar is derived.
    if (pRows.length) {
        ensurePropLengths(pRows);
        ensurePropsets(); // for the fade-in head and marker tooltips; lanes draw fine without it
        const byProp = new Map();
        pRows.forEach((r, i) => {
            const name = r.prop || '(no prop)';
            if (!byProp.has(name)) byProp.set(name, []);
            byProp.get(name).push({ r, i });
        });
        // Lane order = declaration order, unknown names last — the same order the config reads in.
        const declOrder = Object.keys(doc.props || {});
        const laneNames = [...byProp.keys()].sort((a, b) => {
            const ia = declOrder.indexOf(a), ib = declOrder.indexOf(b);
            return (ia === -1 ? 1e9 : ia) - (ib === -1 ? 1e9 : ib) || a.localeCompare(b);
        });
        for (const name of laneNames) {
            tracks.appendChild(propLane(sid, name, byProp.get(name), totalMs, awaitMs));
        }
    }

    // ── carried-in prop lanes ──
    //
    // Props inherited from an earlier state and present for the WHOLE of this one (they have no rows
    // here). Drawn as a dimmed full-width ghost bar in the same tint as the tree's carried-in node,
    // so the timeline shows the prop is in hand even though nothing acts on it.
    const carriedHere = carriedInProps(sid);
    if (carriedHere.length) {
        ensurePropsets(); // held-bone label reads the catalogue for legacy propset refs
        for (const c of carriedHere) tracks.appendChild(carriedLane(sid, c, totalMs));
    }

    // While playing, the rAF loop re-places the playhead every frame (it reads the current
    // pxPerMs), so a zoom or redraw needs no explicit reposition here.
}

const PROP_MARKER_SYMBOL = {
    spawn: '▲', attach: '◆', detach: '▼', discard: '✕', anim: '♪', expression: '◇',
};

// A carried-in prop's ghost lane: a dimmed bar the full width of the state, labelled with the prop
// and the bone it's held on. Not a lifecycle (there are no rows here) — just a presence hint mirror-
// ing the tree's carried-in node. Clicking jumps to the predecessor row that establishes the prop.
function carriedLane(sid, c, totalMs) {
    const track = h('div', 'scn-track scn-track-prop scn-track-carried');
    const bar = h('div', 'scn-prop-bar scn-prop-carried scn-prop-open-l scn-prop-open-r');
    bar.style.left = '0px';
    bar.style.width = (totalMs * pxPerMs) + 'px';
    bar.title = `${c.prop} — inherited from '${c.from}', ${c.bone ? 'held on ' + c.bone : 'loose'} ` +
        `through this state.\nNot declared here; preview reconstructs it. Click to jump to the entry ` +
        `that sets it up.`;
    bar.onclick = () => select({ kind: 'prop', state: c.from, i: c.fromI });
    track.appendChild(bar);
    const held = c.bone ? `holding · ${c.bone}` : 'present · loose';
    const label = h('span', 'scn-prop-lane-label scn-prop-carried-label', `↳ ${c.prop} · ${held}`);
    label.style.left = '4px';
    track.appendChild(label);
    return track;
}

// One prop's lane: the derived lifecycle bar cut into CLICKABLE SECTIONS by DRAGGABLE SEPARATORS —
// one section per spawn/attach/detach/discard row, owning the span from its `at` to the next
// boundary. Click a section (or its dark boundary) to select that row; drag the boundary to move
// the row's start. Prop-anim / expression riders and invalid rows stay as glyph markers on top.
function propLane(sid, name, items, totalMs, awaitMs) {
    const track = h('div', 'scn-track scn-track-prop');
    items.sort((a, b) => (a.r.at || 0) - (b.r.at || 0) || a.i - b.i);
    const valid = items.filter(it => !propRowInvalidReason(it.r));
    const isLifecycle = a => a === 'spawn' || a === 'attach' || a === 'detach' || a === 'discard';

    // The lifecycle: opens at the first spawn/attach — or at 0 with an open left edge when the
    // prop's life started in an EARLIER state (persist, or a multi-state scenario). Closes at the
    // last detach/discard unless a later attach re-opens it (the re-lit cigarette).
    let openAt = null, lastOpen = null, lastClose = null, closeRow = null, closeI = null, openRow = null;
    for (const it of valid) {
        const a = propAction(it.r), at = it.r.at || 0;
        if (a === 'spawn' || a === 'attach') {
            if (openAt === null) { openAt = at; openRow = it.r; }
            lastOpen = at;
        } else if (a === 'detach' || a === 'discard') {
            lastClose = at; closeRow = it.r; closeI = it.i;
        }
    }
    const openLeft = openAt === null;
    const start = openLeft ? 0 : openAt;
    const closed = lastClose !== null && (lastOpen === null || lastClose >= lastOpen);
    const end = closed ? lastClose : totalMs;
    const settle = (closed && closeRow.detach && typeof closeRow.detach.settle === 'number')
        ? closeRow.detach.settle : 0;

    // The lifecycle rows in time order — the ones that cut the bar into sections.
    const lifecycle = valid.filter(it => isLifecycle(propAction(it.r)));

    // The gold lifecycle bar (a picture), the settle tail, and the lane label are all created up
    // front and kept in `barEl`/`tailEl`/`labelEl`, because a boundary drag reshapes them LIVE.
    let barEl = null, tailEl = null;
    const labelEl = h('span', 'scn-prop-lane-label', name);
    labelEl.style.left = (start * pxPerMs + 4) + 'px';

    if (end > start) {
        let cls = 'scn-prop-bar';
        if (openLeft) cls += ' scn-prop-open-l';
        else if (propAction(openRow) === 'spawn') cls += ' scn-prop-head-spawn';
        else if (attachFadesIn(openRow)) cls += ' scn-prop-head-fade';
        if (!closed) cls += ' scn-prop-open-r';
        barEl = h('div', cls);
        barEl.style.left = (start * pxPerMs) + 'px';
        barEl.style.width = ((end - start) * pxPerMs) + 'px';
        barEl.title = `${name}` +
            (openLeft ? '\nalive from an earlier state' : '') +
            (closed ? '' : '\nstill held when the state ends');
        track.appendChild(barEl);
    }

    // The detach settle window: a hatched, fading trail past the close boundary. Built before the
    // sections so a close-boundary drag can slide IT along too.
    if (settle > 0) {
        tailEl = h('div', 'scn-prop-tail');
        tailEl.style.left = (end * pxPerMs) + 'px';
        tailEl.style.width = (settle * pxPerMs) + 'px';
        tailEl.title = `settle ${fmtMs(settle)}` + (closeRow.detach.discard ? ' → discard' : '');
        track.appendChild(tailEl);
    }

    // Each lifecycle row owns the SECTION from its `at` to the next boundary. The row's type dictates
    // what happens at that start, so its WHOLE slice is one grab handle: drag anywhere on the section
    // (or its dark separator, or — for a detach — its settle tail) to move that row's start, and the
    // bar/sections reshape live, exactly like an anim bar. A press without a drag just selects.
    if (barEl) {
        const sections = [];
        for (let k = 0; k < lifecycle.length; k++) {
            const it = lifecycle[k];
            const a = propAction(it.r), at = it.r.at || 0;
            const isSel = sel.kind === 'prop' && sel.state === sid && sel.i === it.i;
            const nextAt = (k + 1 < lifecycle.length) ? (lifecycle[k + 1].r.at || 0) : end;
            const secLeft = Math.max(at, start), secRight = Math.min(nextAt, end);

            // Fixed geometry the live drag reshapes around, and the neighbours it clamps between.
            const prevSecEl = k > 0 ? sections[k - 1] : null;
            const prevSecLeft = k > 0 ? Math.max(lifecycle[k - 1].r.at || 0, start) : start;
            const lower = k > 0 ? (lifecycle[k - 1].r.at || 0) : 0;
            const upper = (k + 1 < lifecycle.length) ? (lifecycle[k + 1].r.at || 0) : Infinity;
            const isOpen = !openLeft && it.r === openRow;   // this row defines the bar's LEFT edge
            const isClose = closed && it.i === closeI;       // …its RIGHT edge

            let secEl = null;
            if (secRight > secLeft) {
                secEl = h('div', 'scn-prop-section' + (isSel ? ' selected' : ''));
                secEl.style.left = (secLeft * pxPerMs) + 'px';
                secEl.style.width = ((secRight - secLeft) * pxPerMs) + 'px';
                secEl.title = `${name} · ${a} @${at}` +
                    (it.r.attach !== undefined ? `\n→ ${attachLabel(it.r)}` : '') +
                    '\nclick to select · drag to move its start';
                secEl.appendChild(h('span', 'scn-prop-glyph', PROP_MARKER_SYMBOL[a] || '?'));
                track.appendChild(secEl);
            }
            sections[k] = secEl;

            const sepEl = h('div', 'scn-prop-sep' + (isSel ? ' selected' : ''));
            sepEl.style.left = (at * pxPerMs) + 'px';
            sepEl.title = `${a} @${at} — drag to move`;
            track.appendChild(sepEl);

            // One start-drag, wired onto every grab handle for this row.
            // The lifecycle handles stand for the same prop entry as the marker, so they answer to
            // the same right-click.
            const wireMenu = el => { el.oncontextmenu = e => nodeContextMenu(e, 'prop', sid, it.i); };
            const wireStart = el => el.addEventListener('mousedown', e => {
                const r = doc.states[sid] && doc.states[sid].props && doc.states[sid].props[it.i];
                if (!r) return;
                e.preventDefault();
                e.stopPropagation();
                const startX = e.clientX, startAt = r.at || 0;
                let moved = false, newAt = startAt;
                sepEl.classList.add('scn-bar-drag');
                if (secEl) secEl.classList.add('scn-prop-section-drag');
                const anchors = [0];
                for (const it2 of items) if (it2.i !== it.i) anchors.push(it2.r.at || 0);
                const onMove = ev => {
                    const dx = ev.clientX - startX;
                    if (Math.abs(dx) > 3) moved = true;
                    let raw = Math.max(0, startAt + dx / pxPerMs);
                    raw = snapActive(ev) ? snapDragAt(raw, 0, anchors) : Math.round(raw);
                    newAt = Math.min(Math.max(raw, lower), upper);
                    const px = newAt * pxPerMs;
                    sepEl.style.left = px + 'px';
                    if (secEl) { secEl.style.left = px + 'px'; secEl.style.width = Math.max(0, (secRight - newAt) * pxPerMs) + 'px'; }
                    if (prevSecEl) prevSecEl.style.width = Math.max(0, (newAt - prevSecLeft) * pxPerMs) + 'px';
                    if (isOpen) { barEl.style.left = px + 'px'; barEl.style.width = Math.max(0, (end - newAt) * pxPerMs) + 'px'; labelEl.style.left = (px + 4) + 'px'; }
                    if (isClose) { barEl.style.width = Math.max(0, (newAt - start) * pxPerMs) + 'px'; if (tailEl) tailEl.style.left = px + 'px'; }
                };
                const onUp = () => {
                    document.removeEventListener('mousemove', onMove);
                    document.removeEventListener('mouseup', onUp);
                    sepEl.classList.remove('scn-bar-drag');
                    if (secEl) secEl.classList.remove('scn-prop-section-drag');
                    if (!moved) { select({ kind: 'prop', state: sid, i: it.i }); return; }
                    if (newAt === 0) delete r.at; else r.at = newAt;
                    changed();
                    if (sel.kind === 'prop' && sel.state === sid && sel.i === it.i) renderPanel();
                };
                document.addEventListener('mousemove', onMove);
                document.addEventListener('mouseup', onUp);
            });

            wireStart(sepEl); wireMenu(sepEl);
            if (secEl) { wireStart(secEl); wireMenu(secEl); }
            if (isClose && tailEl) { wireStart(tailEl); wireMenu(tailEl); }
        }
    }

    // Prop-anim rows have real, measured durations — a translucent segment on the lane.
    for (const it of valid) {
        if (it.r.anim === undefined) continue;
        const at = it.r.at || 0;
        const len = propRowLenOf(it.r);
        const seg = h('div', 'scn-prop-anim-seg' + (len ? '' : ' scn-bar-unmeasured'));
        seg.style.left = (at * pxPerMs) + 'px';
        seg.style.width = ((len || DRAW_FALLBACK) * pxPerMs) + 'px';
        seg.title = `${effectivePropDict(it.r)} / ${it.r.anim}` + (len ? ` · ${Math.round(len)}ms` : ' (unmeasured)');
        track.appendChild(seg);
    }

    // Still held when the state ends: forward chevrons trailing off the right edge, over the long
    // fade, so "the prop continues past this state" reads at a glance.
    if (end > start && !closed) {
        const cont = h('div', 'scn-prop-continues', '»»');
        cont.style.left = Math.max(start * pxPerMs, end * pxPerMs - 16) + 'px';
        cont.title = `${name} — still held when the state ends`;
        track.appendChild(cont);
    }

    // The lane's name, riding at the start of the bar (created above so an open-boundary drag moves
    // it live).
    track.appendChild(labelEl);

    // Glyph markers stay for the rows that AREN'T lifecycle sections: invalid rows (any kind) and
    // the prop-anim / expression riders. Click selects, drag moves `at`.
    for (const it of items) {
        const at = it.r.at || 0;
        const reason = propRowInvalidReason(it.r);
        const a = propAction(it.r) || (it.r.expression !== undefined ? 'expression' : null);
        if (!reason && isLifecycle(a)) continue; // drawn as a section + separator above
        const isSel = sel.kind === 'prop' && sel.state === sid && sel.i === it.i;
        // A row scheduled past a numeric await never fires — the state has already advanced.
        const dead = !reason && typeof awaitMs === 'number' && at > awaitMs;
        const mk = h('div', 'scn-prop-marker'
            + (reason ? ' scn-prop-marker-invalid' : '')
            + (dead ? ' scn-prop-marker-dead' : '')
            + (isSel ? ' selected' : ''), reason ? '!' : (PROP_MARKER_SYMBOL[a] || '?'));
        mk.style.left = (at * pxPerMs) + 'px';
        mk.title = reason
            ? `unconfigured — ${reason}\nfix it, or it's left out when you play`
            : `${name} · ${a || '?'} @${at}` +
              (it.r.expression !== undefined ? `\nexpression ${exprText(it.r.expression)}` : '') +
              (dead ? `\nafter the ${fmtMs(awaitMs)} await — never fires` : '');
        makeMarkerDraggable(mk, sid, it.i, items);
        track.appendChild(mk);
    }
    return track;
}

// The prop-row counterpart of makeBarDraggable: slide a marker along its lane to set `at`; a
// press without movement selects the row. Snaps to the grid and to sibling markers.
function makeMarkerDraggable(mk, sid, i, items) {
    mk.oncontextmenu = e => nodeContextMenu(e, 'prop', sid, i);
    mk.addEventListener('mousedown', e => {
        const r = doc.states[sid] && doc.states[sid].props && doc.states[sid].props[i];
        if (!r) return;
        e.preventDefault();
        e.stopPropagation();
        const startX = e.clientX;
        const startAt = r.at || 0;
        let moved = false;
        let newAt = startAt;
        mk.classList.add('scn-bar-drag');
        const anchors = [0];
        for (const it2 of items) {
            if (it2.i !== i) anchors.push(it2.r.at || 0);
        }
        const onMove = ev => {
            const dx = ev.clientX - startX;
            if (Math.abs(dx) > 3) moved = true;
            const rawAt = Math.max(0, startAt + dx / pxPerMs);
            newAt = snapActive(ev) ? snapDragAt(rawAt, 0, anchors) : Math.round(rawAt);
            mk.style.left = (newAt * pxPerMs) + 'px';
        };
        const onUp = () => {
            document.removeEventListener('mousemove', onMove);
            document.removeEventListener('mouseup', onUp);
            mk.classList.remove('scn-bar-drag');
            if (!moved) { select({ kind: 'prop', state: sid, i }); return; }
            if (newAt === 0) delete r.at; else r.at = newAt;
            changed();
            if (sel.kind === 'prop' && sel.state === sid && sel.i === i) renderPanel();
        };
        document.addEventListener('mousemove', onMove);
        document.addEventListener('mouseup', onUp);
    });
}

// Snap a dragged bar's start. With snapping on: EDGE-snap first — if either the bar's start or its
// end lands within SNAP_PX (screen pixels) of a neighbour's start/end (or time 0), it butts against
// it; otherwise it falls to the 100ms grid. `anchors` is the set of neighbour edge positions in ms.
function snapDragAt(rawAt, dragLen, anchors) {
    const thresholdMs = SNAP_PX / pxPerMs;
    let best = null, bestDist = Infinity;
    for (const a of anchors) {
        // start on the anchor, or end on the anchor (start = a - length): both butt bars together
        for (const cand of [a, a - dragLen]) {
            if (cand < 0) continue;
            const d = Math.abs(cand - rawAt);
            if (d < bestDist) { bestDist = d; best = cand; }
        }
    }
    if (best !== null && bestDist <= thresholdMs) return Math.round(best);
    return Math.max(0, Math.round(rawAt / SNAP_GRID) * SNAP_GRID);
}

// A bar you can slide along its lane to set the row's `at` (start offset). Dragging mutates the DOC
// row — the live/normalized row it was drawn from is read-only — by the index the bar carries, which
// is the same index selection and the panel use. A press without movement is still a click: it
// selects the row. Snaps to a 100ms grid and to neighbouring bars' edges (unless snap is toggled off
// or Ctrl is held); committed on release, where the debounced re-register redraws the whole strip.
function makeBarDraggable(bar, sid, i, items) {
    // Right-click a bar for the same two actions the tree offers. Wired here rather than at the call
    // site because this is already the function that owns "this element IS row i of state sid".
    bar.oncontextmenu = e => nodeContextMenu(e, 'row', sid, i);
    bar.addEventListener('mousedown', e => {
        const r = doc.states[sid] && doc.states[sid].anims && doc.states[sid].anims[i];
        if (!r) return;
        e.preventDefault();
        e.stopPropagation();
        const startX = e.clientX;
        const startAt = r.at || 0;
        const label = bar.querySelector('.scn-bar-label');
        const labelText = label ? label.textContent : '';
        let moved = false;
        let newAt = startAt;
        bar.classList.add('scn-bar-drag');

        // Neighbour edges to snap against: time 0, plus every OTHER bar's start and end (as drawn).
        const dragItem = items.find(x => x.i === i);
        const dragLen = dragItem ? (dragItem.end - dragItem.at) : SNAP_GRID;
        const anchors = [0];
        for (const it2 of items) {
            if (it2.i === i) continue;
            anchors.push(it2.at, it2.end);
        }

        const onMove = ev => {
            const dx = ev.clientX - startX;
            if (Math.abs(dx) > 3) moved = true;
            const rawAt = Math.max(0, startAt + dx / pxPerMs);
            // snap unless it's toggled off or Ctrl is held right now
            newAt = snapActive(ev) ? snapDragAt(rawAt, dragLen, anchors) : Math.round(rawAt);
            bar.style.left = (newAt * pxPerMs) + 'px';
            if (label && moved) label.textContent = `${r.anim || '(no anim)'} @${newAt}`;
        };
        const onUp = () => {
            document.removeEventListener('mousemove', onMove);
            document.removeEventListener('mouseup', onUp);
            bar.classList.remove('scn-bar-drag');
            if (!moved) { // a plain click selects the row
                if (label) label.textContent = labelText;
                select({ kind: 'row', state: sid, i });
                return;
            }
            if (newAt === 0) delete r.at; else r.at = newAt; // omitted `at` means 0
            changed();
            if (sel.kind === 'row' && sel.state === sid && sel.i === i) renderPanel();
        };
        document.addEventListener('mousemove', onMove);
        document.addEventListener('mouseup', onUp);
    });
}

// The await cutoff line — a labelled, draggable handle. Dragging sets `st.await` to a concrete
// number of ms (converting an `auto`/poll state to an explicit value, which is the edit the drag
// intends). The line is previewed live during the drag; the commit re-registers so the timeline
// redraws from what the engine actually resolves.
//
// Snapping is the SAME rule the bars follow (`snapActive` + `snapDragAt`): the toggle, inverted by
// Ctrl, edge-snap to a row's start or end first and the 100ms grid otherwise. It used to snap to 100ms
// unconditionally, which made the two most valuable awaits unreachable — a row's exact natural end (a
// handoff with no truncation) and a deliberate few-ms trim off it. `dragLen` is 0 because a cutoff is
// a line, not a bar: only its own position can land on an anchor.
function makeAwaitHandle(sid, awaitMs, totalMs, items) {
    const cut = h('div', 'scn-await');
    cut.style.left = (awaitMs * pxPerMs) + 'px';
    cut.title = 'drag to set await — snaps to animation edges and 100ms; Ctrl inverts the snap toggle';
    // A pennant tab hanging below the line — a square body with a point on top that leads up to
    // the dashed line, so it reads as a grab handle. It carries the current value.
    const tab = h('div', 'scn-await-tab', fmtMs(awaitMs));
    cut.appendChild(tab);

    cut.addEventListener('mousedown', e => {
        e.preventDefault();
        e.stopPropagation();
        const tracks = document.getElementById('scnTracks');
        let ms = awaitMs;

        // Every drawn row's start and end, plus time 0 — so the cutoff can be butted exactly against
        // the end of the row it's cutting, which is the number an author is usually reaching for.
        const anchors = [0];
        for (const it of (items || [])) anchors.push(it.at, it.end);

        const onMove = ev => {
            // Track the cursor; snap only if snapping is in effect for this event (toggle XOR Ctrl).
            const raw = Math.max(0, (ev.clientX - tracks.getBoundingClientRect().left) / pxPerMs);
            ms = snapActive(ev) ? snapDragAt(raw, 0, anchors) : Math.round(raw);
            cut.style.left = (ms * pxPerMs) + 'px';
            tab.textContent = fmtMs(ms);
        };
        const onUp = () => {
            document.removeEventListener('mousemove', onMove);
            document.removeEventListener('mouseup', onUp);
            doc.states[sid].await = ms;   // an explicit numeric await
            // Don't redraw the timeline here — `live` still holds the old value, so it would snap
            // back until the register returns. The debounced sync redraws it consistently.
            changed();
            if (sel.kind === 'state' && sel.state === sid) renderPanel();
        };
        document.addEventListener('mousemove', onMove);
        document.addEventListener('mouseup', onUp);
    });
    return cut;
}

function setZoom(v) {
    pxPerMs = clampZoom(v);
    localStorage.setItem(LS_ZOOM, String(pxPerMs));
    renderTimeline();
}

// Scroll-wheel over the timeline zooms, anchored on the cursor: the moment in time under the pointer
// stays put while the scale changes around it (scrollLeft is corrected after the re-render).
function onTimelineWheel(e) {
    e.preventDefault();
    const scroll = document.getElementById('scnTimelineScroll');
    const cursorX = e.clientX - scroll.getBoundingClientRect().left; // px within the visible strip
    const msUnder = (scroll.scrollLeft + cursorX) / pxPerMs;         // the time beneath the cursor
    setZoom(pxPerMs * (e.deltaY < 0 ? 1.15 : 1 / 1.15));            // in on scroll-up, out on down
    scroll.scrollLeft = Math.max(0, msUnder * pxPerMs - cursorX);    // keep that time under the cursor
}

function renderSnapToggle() {
    const b = document.getElementById('button-scn-snap');
    if (!b) return;
    b.textContent = (snapEnabled ? '☑' : '☐') + ' snap';
    b.classList.toggle('selected', snapEnabled);
    b.setAttribute('aria-checked', snapEnabled ? 'true' : 'false');
}

// Set the zoom so a state spans `frac` of the visible strip width.
function fitTo(sid, frac) {
    if (!doc.states[sid]) return;
    const avail = document.getElementById('scnTimelineScroll').clientWidth - 24;
    const totalMs = stateExtentMs(sid) * 1.04;
    if (avail <= 0 || totalMs <= 0) return;
    setZoom((frac * avail) / totalMs);
}

// How much of the strip a state should fill on auto-fit: a SHORT state gets more relative room to
// breathe, a LONG one is held back so it doesn't dominate — 40% up to a 3s state, ramping to 70%
// by 6s, so the default view reads well without a manual zoom either way.
function targetFrac(totalMs) {
    const LO = 3000, HI = 6000, FLO = 0.40, FHI = 0.70;
    if (totalMs <= LO) return FLO;
    if (totalMs >= HI) return FHI;
    return FLO + (FHI - FLO) * ((totalMs - LO) / (HI - LO));
}

// The "fit" button: the whole state, edge to edge.
function zoomFit() { fitTo(timelineStateId(), 1); }

// Auto-fit when the DRAWN state changes — to its duration-based target fraction, so a new state
// isn't a sliver nor overflowing. Fires once per state; staying on a state keeps your manual zoom.
let lastFitSid = null;
function maybeAutoFit() {
    const sid = timelineStateId();
    if (!sid || !doc.states[sid]) return;
    // HUD not laid out yet (width 0) — don't record it as fitted, so the next redraw retries.
    if (document.getElementById('scnTimelineScroll').clientWidth <= 0) return;
    // Lengths still arriving — the extent isn't final, so fitting now would fit the wrong picture.
    if (pendingLen.size > 0) return;
    if (sid === lastFitSid) return;
    lastFitSid = sid;
    fitTo(sid, targetFrac(stateExtentMs(sid) * 1.04));
}

// Redraw the strip and fit it if the drawn state changed. Everything that changes the document or
// the view goes through here — no engine round-trip beyond the cheap cached measurements.
function redraw() {
    renderTimeline();
    maybeAutoFit();
}

// ===================== toolbar actions =====================

// ── transport: play the focused state, sweep a live playhead ──
//
// The engine has no pause or scrub — an anim is a fire-and-forget task — so the transport is play,
// stop, and a playhead that TRACKS the real ped (polling animsState) rather than a fake scrubber
// that pretends to drive it. `playFromState` bounds the sweep to the one state we started: when the
// run advances to `next` (which may be an idle that parks forever), the playhead retires.
let pollTimer = null;   // authoritative time from the engine, every ~100ms
let rafId = null;       // smooth per-frame render between polls
let playing = false;
let playFromState = null;
// The playhead's motion is INTERPOLATED: a poll gives the real `elapsed` and the local clock at
// which we heard it; every animation frame extrapolates from there (elapsed + wall-clock since).
// That's what makes it glide instead of stepping 100ms at a time.
let anchorMs = 0;
let anchorAt = 0;
let phVisible = false;
let seenPlayState = false; // have we observed the state we launched? (a fidget arrives after the idle)
let playStartLocal = 0;    // local clock at play start, for the "never arrived" timeout

// Whether preview playback honours the scenario/state `when` gate. OFF by default: you author a
// scenario where its trigger can't fire yet, so the gate would just refuse to play it.
let enforceWhen = false;
function renderEnforceWhen() {
    const b = document.getElementById('button-scn-enforce-when');
    if (!b) return;
    b.textContent = (enforceWhen ? '☑' : '☐') + ' enforce when';
    b.classList.toggle('selected', enforceWhen);
    b.setAttribute('aria-checked', enforceWhen ? 'true' : 'false');
}

async function play() {
    const stateId = timelineStateId();
    if (!stateId) return;
    await sync(); // PLAY is one of the two places the draft is actually registered
    if (!live?.ok) return; // errors are on the status line
    await sendClientMessage('scnPlay', { state: stateId, enforceWhen });
    startPlayhead(stateId);
}

function stop() {
    sendClientMessage('scnStop', {});
    stopPlayhead();
}

function positionPlayhead(ms, visible) {
    const ph = document.getElementById('scnPlayhead');
    if (!ph) return;
    if (!visible) { ph.classList.add('hidden'); return; }
    ph.classList.remove('hidden');
    ph.style.left = (ms * pxPerMs) + 'px';
}

function setClock(ms) {
    const c = document.getElementById('scnClock');
    if (c) c.textContent = (ms / 1000).toFixed(2) + 's';
}

// The poll: re-anchor to the engine's real elapsed time, and detect when the run is done.
async function pollState() {
    const res = await sendClientMessage('scnState', {});
    if (!res || !res.running) { stopPlayhead(); return; }
    // Anything reached from the idle — a fidget, an exit, a transition — is previewed by playing the
    // IDLE first and then jumping, so the run legitimately sits on another state for up to ~1.5s
    // before ours appears (da_anims Queue.preview). Only retire once we've actually SEEN the state we
    // launched (then a move away from it means it advanced/ended), with a safety timeout in case it
    // never comes up (e.g. a gated idle).
    if (res.state === playFromState) {
        seenPlayState = true;
    } else if (seenPlayState) {
        stopPlayhead(); return;
    } else if (performance.now() - playStartLocal > 5000) {
        stopPlayhead(); return;
    }
    anchorMs = res.elapsed || 0;
    anchorAt = performance.now();
    phVisible = res.state === timelineStateId();
}

// The render: every frame, extrapolate from the last anchor so motion is continuous.
function playheadFrame() {
    if (!playing) return;
    if (phVisible) {
        const est = anchorMs + (performance.now() - anchorAt);
        positionPlayhead(est, true);
        setClock(est);
    } else {
        positionPlayhead(0, false);
    }
    rafId = requestAnimationFrame(playheadFrame);
}

function startPlayhead(stateId) {
    stopPlayhead(); // clears playFromState — so set it AFTER, not before the call in play()
    playing = true;
    playFromState = stateId;
    seenPlayState = false;
    playStartLocal = performance.now();
    pollState();
    pollTimer = setInterval(pollState, 100);
    rafId = requestAnimationFrame(playheadFrame);
    document.getElementById('button-scn-play')?.classList.add('scn-playing');
}

function stopPlayhead() {
    if (pollTimer) { clearInterval(pollTimer); pollTimer = null; }
    if (rafId) { cancelAnimationFrame(rafId); rafId = null; }
    playing = false;
    playFromState = null;
    phVisible = false;
    seenPlayState = false;
    anchorMs = 0;
    positionPlayhead(0, false);
    setClock(0);
    document.getElementById('button-scn-play')?.classList.remove('scn-playing');
}

// ── export: the emitted Lua in a panel, copied on demand ──

let exportShown = false;

async function toggleExport() {
    const card = document.getElementById('scnExportCard');
    exportShown = card.classList.contains('hidden'); // about to show?
    card.classList.toggle('hidden');
    if (exportShown) await refreshExport();
}

async function refreshExport() {
    // EXPORT is the other place the draft is registered — so the Lua you copy has been validated.
    await sync();
    const res = await sendClientMessage('scnSerialize', { id: docId, cfg: doc });
    const box = document.getElementById('scnExportText');
    if (res?.text) {
        box.textContent = res.text;
        box.dataset.lua = res.text;
    } else {
        box.textContent = '-- serialize failed: ' + (res?.error || 'no response');
        delete box.dataset.lua;
    }
}

function copyExport() {
    const box = document.getElementById('scnExportText');
    const text = box.dataset.lua;
    if (!text) return;
    clipboardCopy(text);
    setStatus('✓ Lua copied', 'scn-ok');
}

function addRowFromSearch() {
    if (sel.kind === 'scenario') return;
    const st = doc.states[sel.state];
    if (!st) return;
    const dict = document.getElementById('animSelectedDict')?.textContent?.trim() || '';
    const anim = document.getElementById('animSelectedName')?.textContent?.trim() || '';
    st.anims = st.anims || [];
    // The search selection seeds the row when there is one; otherwise the row is typed in place.
    st.anims.push(dict || anim ? { dict: dict || undefined, anim: anim || undefined } : {});
    select({ kind: 'row', state: sel.state, i: st.anims.length - 1 });
    changed();
}

// "+ prop" always declares a FRESH prop (prop_#) and points a new attach row at it — a new prop by
// default, renamable in the row's prop field, or repointable to an existing prop from there. Attach
// is the common action, so the row lands ready to pick a model and place it.
function addPropRow() {
    if (sel.kind === 'scenario') return; // like + row: a prop row belongs to a state
    const st = doc.states[sel.state];
    if (!st) return;
    doc.props = doc.props || {};
    // Default the row to the first VALID prop already in use (one with a model), falling back to any
    // in-use prop, and only minting a fresh prop_# when there are none. Rename/repoint from the row.
    const inUse = propIdsInUse();
    let id = inUse.find(x => doc.props[x] && doc.props[x].model) || inUse[0];
    if (!id) {
        let n = 1;
        while (doc.props['prop_' + n]) n++;
        id = 'prop_' + n;
        doc.props[id] = { model: '' };
    }
    st.props = st.props || [];
    st.props.push({ prop: id, attach: {} });
    select({ kind: 'prop', state: sel.state, i: st.props.length - 1 });
    changed();
}

function addState() {
    let n = 1;
    while (doc.states['state_' + n]) n++;
    const sid = 'state_' + n;
    doc.states[sid] = { role: 'fidget', anims: [] };
    select({ kind: 'state', state: sid });
    changed();
}

// ===================== front door =====================

// ===================== the import list =====================
//
// Two sections — your drafts, and everything da_anims has registered — and the second one is 270-odd
// scenarios, which is a wall of ids unless it's grouped. So it's grouped the way the PLAYER meets
// them: by menu tag, resolved through the tag tree into the folder path they appear under ("Smoke ›
// Pipe", "Lean › Front"). A scenario in two menus is listed under both, because it is in both.
//
// Collapse state is remembered, so the shape you left the list in is the shape you come back to.
const LS_IMPORT_OPEN = 'da_dev.scnImportOpen';

// All three SECTIONS start open (`saved` was missing here, so it defaulted shut and looked like it
// hadn't been built); the tag CATEGORIES inside da_anims start shut, because 271 scenarios expanded
// is the wall this grouping exists to prevent.
const IMPORT_OPEN_DEFAULT = ['drafts', 'saved', 'scenarios'];

function importOpen() {
    try {
        const saved = JSON.parse(localStorage.getItem(LS_IMPORT_OPEN));
        return new Set(Array.isArray(saved) ? saved : IMPORT_OPEN_DEFAULT);
    } catch { return new Set(IMPORT_OPEN_DEFAULT); }
}

function setImportOpen(set) {
    localStorage.setItem(LS_IMPORT_OPEN, JSON.stringify([...set]));
}

// Where a tag hangs, as a readable path. Walks `parent` up the tag tree and joins the labels; an
// undeclared tag (a plugin's, before it loads) is its own name rather than nothing.
function tagPath(tag, tags) {
    const parts = [];
    const seen = new Set();
    let t = tag;
    while (t && tags[t] && !seen.has(t)) {
        seen.add(t);                                  // a malformed parent cycle must not hang the UI
        parts.unshift(tags[t].label || t);
        t = tags[t].parent;
    }
    return parts.length ? parts.join(' › ') : tag;
}

// Scenarios by the folder path they appear under. Untagged ones are real (a scenario reached only by
// another scenario's transition), so they get a group rather than vanishing.
function groupByTag(scenarios, tags) {
    const groups = new Map();
    const add = (path, s) => {
        if (!groups.has(path)) groups.set(path, []);
        groups.get(path).push(s);
    };
    for (const s of scenarios) {
        const names = s.tags || [];
        if (names.length === 0) add('(no menu)', s);
        else for (const t of names) add(tagPath(t, tags), s);
    }
    return [...groups.entries()].sort((a, b) => a[0].localeCompare(b[0]));
}

async function toggleImport() {
    const card = document.getElementById('scnImportCard');
    if (!card.classList.contains('hidden')) { card.classList.add('hidden'); return; }
    card.classList.remove('hidden');

    const ul = document.getElementById('scnImportList');
    const search = document.getElementById('scnImportSearch');

    // Filled in when the engine answers. The list is NOT held hostage to that answer: drafts come
    // from localStorage and can be drawn immediately, and a Lua callback that throws never calls its
    // `cb` — the fetch then never settles, and awaiting it up here is what would leave the whole card
    // blank with no clue why. Render now, render again when (if) the rest arrives.
    let res = null;
    let tags = {};
    // Mutable: deleting a saved scenario prunes this rather than re-fetching the whole list.
    let saved = [];

    const render = () => {
        const q = search.textContent.trim().toLowerCase();
        const open = importOpen();
        // While you're searching, collapse state is not the question you're asking — every section
        // with a hit opens, and sections with none disappear entirely.
        const isOpen = key => !!q || open.has(key);
        const toggle = key => {
            const s = importOpen();
            if (s.has(key)) s.delete(key); else s.add(key);
            setImportOpen(s);
            render();
        };

        // Category headers get `scn-import-child` from the caller, which is what indents them.
        const header = (key, label, count) => {
            const li = h('li', 'scn-import-group');
            li.appendChild(h('span', 'scn-caret', isOpen(key) ? '▾' : '▸'));
            li.appendChild(h('span', null, `${label}  (${count})`));
            li.onclick = () => toggle(key);
            if (q) li.title = 'searching — sections open themselves while the filter is set';
            return li;
        };

        ul.innerHTML = '';

        const draftRows = Object.entries(drafts())
            .filter(([name]) => !q || name.toLowerCase().includes(q));
        if (draftRows.length) ul.appendChild(header('drafts', 'drafts', draftRows.length));

        for (const [name, d] of (isOpen('drafts') ? draftRows : [])) {
            const li = h('li', 'scn-import-draft scn-import-child', `${name}  ·  draft`);
            li.title = 'click to open · right-click to delete';
            // Only DRAFTS get this: a registered scenario in the list below lives in a lib file, and
            // nothing in a UI should offer to delete something it can't delete.
            li.oncontextmenu = e => {
                e.preventDefault();
                e.stopPropagation();
                showDropdown([{ name: `delete draft "${name}"`, value: 'delete' }], e.pageX, e.pageY)
                    .then(picked => {
                        if (picked === null) return;
                        confirmDeleteDraft(name, render);   // redraw the list without it
                    });
            };
            li.onclick = () => {
                doc = d.cfg;
                docId = name;
                docFrom = 'draft';
                importedDropped = [];
                sanitizeDoc(doc);
                localStorage.setItem(LS_LAST, docId);
                lastFitSid = null; // re-fit the loaded scenario
                card.classList.add('hidden');
                select({ kind: 'scenario' });
                changed();
                setStatus(`resumed draft "${name}"`, 'scn-note');
                syncSavedSnapshot().then(renderPanel);   // does a saved copy stand behind it?
            };
            ul.appendChild(li);
        }

        // Saved scenarios: durable, and grouped by menu category exactly like the registered ones,
        // because a saved config carries the same `menu` tags. Right-click deletes, as with drafts.
        const savedMatches = (saved || []).filter(s =>
            !q || s.id.toLowerCase().includes(q) || (s.name || '').toLowerCase().includes(q));
        if (savedMatches.length) ul.appendChild(header('saved', 'saved', savedMatches.length));

        if (isOpen('saved')) {
            for (const [path, list] of groupByTag(savedMatches, tags)) {
                const key = 'saved:' + path;
                const sub = header(key, path, list.length);
                sub.classList.add('scn-import-child');
                ul.appendChild(sub);
                if (!isOpen(key)) continue;

                for (const s of list) {
                    const li = h('li', 'scn-import-saved scn-import-leaf',
                        `${s.id}  ·  ${s.name}  ·  ${s.nStates} states`);
                    li.title = 'click to open · right-click to delete';
                    li.oncontextmenu = e => {
                        e.preventDefault();
                        e.stopPropagation();
                        showDropdown([{ name: `delete saved "${s.id}"`, value: 'delete' }],
                            e.pageX, e.pageY).then(picked => {
                            if (picked === null) return;
                            showConfirm(`Delete the saved scenario "${s.id}"? This cannot be undone.`,
                                'Delete', 'Cancel').then(async yes => {
                                if (!yes) return;
                                const del = await sendClientMessage('scnSavedDelete', { id: s.id });
                                if (!del?.ok) { setStatus(del?.error || 'delete failed', 'scn-err'); return; }
                                saved = saved.filter(x => x.id !== s.id);
                                savedIds.delete(s.id);   // the card's status line reads from this
                                setStatus(`deleted saved "${s.id}"`, 'scn-note');
                                render();
                            });
                        });
                    };
                    li.onclick = async () => {
                        const got = await sendClientMessage('scnSavedLoad', { id: s.id });
                        if (!got?.cfg) { setStatus(got?.error || 'load failed', 'scn-err'); return; }
                        const id = got.id || s.id;
                        // An id has one working copy, so this takes over that id's draft — but the
                        // draft is moved aside under `<id>_N` rather than dropped. Opening a saved
                        // scenario to LOOK at it must never cost you the edits you had going.
                        const kept = keepDraftAside(id, got.cfg);
                        doc = got.cfg;
                        docId = id;
                        docFrom = 'saved';
                        savedSnapshot = JSON.stringify(got.cfg);   // straight from the saved copy
                        importedDropped = [];
                        sanitizeDoc(doc);
                        lastFitSid = null;
                        card.classList.add('hidden');
                        select({ kind: 'scenario' });
                        changed();   // writes the draft: from here on you are editing a draft of it
                        setStatus(kept
                            ? `opened saved "${id}" — your draft was kept as "${kept}"`
                            : `opened saved "${id}" — now editing a draft of it`, 'scn-note');
                    };
                    ul.appendChild(li);
                }
            }
        }

        const matches = (res?.scenarios || []).filter(s =>
            !q || s.id.toLowerCase().includes(q) || s.name.toLowerCase().includes(q));
        if (matches.length) ul.appendChild(header('scenarios', 'da_anims', matches.length));

        if (isOpen('scenarios')) {
            for (const [path, list] of groupByTag(matches, tags)) {
                const key = 'tag:' + path;
                const sub = header(key, path, list.length);
                sub.classList.add('scn-import-child');
                ul.appendChild(sub);
                if (!isOpen(key)) continue;

                for (const s of list) {
                    const li = h('li', 'scn-import-leaf',
                        `${s.id}  ·  ${s.name}  ·  ${s.nStates} states`);
                    li.onclick = async () => {
                        const raw = await sendClientMessage('scnImport', { id: s.id });
                        if (!raw?.cfg) { setStatus(raw?.error || 'import failed', 'scn-err'); return; }
                        // Same rule as opening a saved scenario: whatever draft holds this id gets
                        // moved aside, not overwritten.
                        const keptDraft = keepDraftAside(s.id, raw.cfg);
                        doc = raw.cfg;
                        docId = s.id;
                        docFrom = 'library';
                        importedDropped = raw.dropped || [];
                        syncSavedSnapshot().then(renderPanel);
                        lastFitSid = null; // re-fit the imported scenario
                        card.classList.add('hidden');
                        select({ kind: 'scenario' });
                        changed();
                        if (keptDraft) setStatus(`imported "${s.id}" — your draft was kept as "${keptDraft}"`, 'scn-note');
                    };
                    ul.appendChild(li);
                }
            }
        }
    };
    search.oninput = render;
    render();   // drafts, straight away

    // A timeout, because "never settles" is a real outcome here and an empty card that stays empty
    // teaches you nothing. Whatever comes back — data, an error, or nothing — the list redraws and
    // the status line says what it got.
    const answer = await Promise.race([
        sendClientMessage('scnList', {}),
        new Promise(r => setTimeout(() => r({ timedOut: true }), 5000)),
    ]);
    if (answer && !answer.error && !answer.timedOut) {
        res = answer;
        tags = answer.tags || {};
        saved = answer.saved || [];
        savedIds = new Set(saved.map(x => x.id));
        if (answer.warn) setStatus(answer.warn, 'scn-err');
    } else {
        setStatus(answer?.timedOut
            ? 'scnList did not answer — check the F8 console for a Lua error'
            : (answer?.message || 'scenario list unavailable'), 'scn-err');
    }
    render();
}

// ===================== draft vs saved =====================
//
// One document, two stores, and a rule for which is which:
//
//   DRAFT   the working copy, keyed by scenario id, autosaved to localStorage on every edit. There is
//           at most one per id, and it is always what you are editing.
//   SAVED   the durable copy in kvp. It only ever changes when you press save.
//
// So: opening a SAVED scenario starts editing a draft of it — which replaces that id's draft, since
// an id has one working copy. Opening a DRAFT resumes exactly where you left off. Saving overwrites
// the saved copy from what you're editing and leaves the draft alone.
//
// The confusion this replaces was not knowing which of the two you had in front of you. `docFrom`
// answers that, and the scenario card says it out loud.
let docFrom = 'new';          // 'new' | 'draft' | 'saved' | 'library'
let savedIds = new Set();     // ids that have a saved copy, for the card's status line

async function refreshSavedIds() {
    const res = await sendClientMessage('scnSavedIds', {});
    if (res && Array.isArray(res.ids)) savedIds = new Set(res.ids);
}

// The saved copy as it was the last time we saw it, so the card can say whether what you're editing
// still matches it. Null means "there is one but we haven't read it" — the honest third answer.
let savedSnapshot = null;

// Pull the saved copy for the current id (if any) so the indicator can compare against it. Called
// whenever the document changes identity by a route that doesn't already know the answer.
async function syncSavedSnapshot() {
    savedSnapshot = null;
    if (!savedIds.has(docId)) return;
    const got = await sendClientMessage('scnSavedLoad', { id: docId });
    if (got && got.cfg) savedSnapshot = JSON.stringify(got.cfg);
}

// You are ALWAYS editing a draft — that is the working copy. The question the card has to answer is
// what stands behind it:
//
//   none     no saved copy for this id; the draft is the only thing that exists
//   match    saved, and the draft still equals it — nothing to lose
//   differs  saved, but you've edited since; `save` would overwrite it with this
//   unknown  saved, and we haven't read it to compare
function savedState() {
    if (!savedIds.has(docId)) return 'none';
    if (savedSnapshot === null) return 'unknown';
    return JSON.stringify(doc) === savedSnapshot ? 'match' : 'differs';
}

// The indicator — a FIELD ROW like every other line on this card (label left, value right), not a
// chip. Nothing else in this UI wears a badge: state is carried by the colour of text, the way the
// status line and the dim inherited values already do.
//
// You are always editing a DRAFT (that's what the working copy is), so the value leads with that and
// then says what stands behind it.
function savedBadgeNode() {
    const state = savedState();
    const row = h('div', 'field scn-badges');   // `scn-badges` is the hook refreshSavedBadge swaps
    row.appendChild(h('span', 'flabel', 'storage'));
    // NAME the draft. `docId` is the key every store uses — the autosaved draft, the saved copy, and
    // the id the emitted Lua carries — and after a draft has been kept aside as `<id>_1` you need to
    // be able to see at a glance which of them you are typing into.
    row.appendChild(h('span', `scn-state scn-state-${state}`, {
        none:    `draft "${docId}" · no saved copy`,
        match:   `draft "${docId}" · saved copy up to date`,
        differs: `draft "${docId}" · saved copy out of date`,
        unknown: `draft "${docId}" · saved copy exists`,
    }[state]));
    row.title =
        'A DRAFT is the working copy: autosaved on every edit, one per scenario id.\n' +
        'SAVED is the durable copy, and only `save scenario` changes it.\n' +
        'Opening a saved scenario starts a draft of it; any draft already on that id is kept aside\n' +
        'as "<id>_1" rather than lost.';
    return row;
}

// Swap the chips in place as you edit. NOT a full renderPanel: `changed()` fires on every commit,
// and rebuilding the card underneath the field you just left is how you lose a focus or a popup.
function refreshSavedBadge() {
    const cur = document.querySelector('#scnPanel .scn-badges');
    if (cur && cur.parentNode) cur.parentNode.replaceChild(savedBadgeNode(), cur);
}

// SAVE, as distinct from the autosaved draft.
//
// A draft is scratch and lives in the browser's localStorage — one cache clear from gone. Saving puts
// the config in da_lib's kvp on the client (where da_anims keeps its menu prefs), so it survives a
// cache clear and a resource restart. Same document either way; the difference is that you said so.
async function saveScenario() {
    sanitizeDoc(doc);
    const overwrote = savedIds.has(docId);
    const res = await sendClientMessage('scnSave', { id: docId, cfg: doc });
    if (!res?.ok) { setStatus(res?.error || 'save failed', 'scn-err'); return; }
    savedIds.add(docId);
    savedSnapshot = JSON.stringify(doc);   // the saved copy IS this, until the next edit
    // The draft stays: saving is a checkpoint, not a handover. You carry on editing the same working
    // copy, and the card now says a saved copy is behind it.
    setStatus(overwrote ? `saved "${docId}" (overwrote the saved copy)` : `saved "${docId}"`, 'scn-note');
    renderPanel();
}

function newScenario() {
    doc = blankDoc();
    docFrom = 'new';
    let n = 1;
    while (drafts()['my_scenario_' + n]) n++;
    docId = 'my_scenario_' + n;
    importedDropped = [];
    lastFitSid = null; // a fresh scenario should auto-fit
    select({ kind: 'scenario' });
    changed();
}

// ===================== init =====================

// The "selected state" chip above the bars: it names the state the bars belong to, and clicking it
// picks a different one — a compact way to say what the timeline is subordinate to.
function renderStateSelect() {
    const el = document.getElementById('scnStateSelect');
    if (!el) return;
    const sid = timelineStateId();
    el.textContent = sid ? `state: ${sid}` : '(no state)';
    el.onclick = async e => {
        const opts = stateIds().map(s => ({ name: s, value: s }));
        if (opts.length === 0) return;
        const picked = await showDropdown(opts, e.pageX, e.pageY);
        if (picked !== null) select({ kind: 'state', state: picked.value });
    };

    // With the chip FOCUSED, up/down step through the states without opening the dropdown — flicking
    // along a scenario watching each state's bars in turn, which is what you actually do when reading
    // one. The order is the tree's (role first, then name), so the keyboard walk and the list you're
    // looking at agree.
    //
    // Clamped at the ends, like a native select: wrapping from the exit back round to the enter is a
    // jump, not a step, and you can't tell you've done it without looking. An open dropdown handles
    // its own arrows — it focuses its menu items, so those keys never reach this element.
    el.onkeydown = e => {
        if (e.key !== 'ArrowUp' && e.key !== 'ArrowDown') return;
        const ids = stateIds();
        if (ids.length === 0) return;
        e.preventDefault();    // arrows would otherwise scroll the strip out from under the chip
        e.stopPropagation();   // bare keys switch HUD views; this one is ours

        const at = ids.indexOf(timelineStateId());
        // Nothing sensibly selected yet (a drawn state that isn't in the list): start at the top
        // rather than swallow the keypress.
        const to = at === -1 ? 0 : (e.key === 'ArrowDown' ? at + 1 : at - 1);
        if (to < 0 || to >= ids.length) return;

        select({ kind: 'state', state: ids[to] });
        el.focus();   // renderStateSelect only rewrites the text, but hold the focus for the next press
    };
}

function renderAll() {
    renderTree();
    renderPanel();
    renderStateSelect();
    redraw();
}

// Printed once on load so "is the client even running this file?" is answerable from the F8 console.
// NUI assets are cached hard: Lua reloads on `restart`, the web page does not always follow, and a UI
// change that appears to do nothing is usually a stale page rather than a wrong stylesheet.
const SCN_BUILD = 'grouped import list + tree rails + save/delete';

export function initScenario() {
    console.log(`[da_dev] scenario editor: ${SCN_BUILD}`);
    const last = localStorage.getItem(LS_LAST);
    const saved = last && drafts()[last];
    if (saved) { doc = saved.cfg; docId = last; docFrom = 'draft'; sanitizeDoc(doc); }
    else { doc = blankDoc(); docId = 'my_scenario'; docFrom = 'new'; }
    // Which ids have a saved copy — the card's status line needs it before anything is opened.
    refreshSavedIds().then(syncSavedSnapshot).then(renderPanel);

    ensureBoneNames(); // warm the bone vocabulary so the first bone-field keystroke has matches

    document.getElementById('button-scn-new').onclick = newScenario;
    document.getElementById('button-scn-import').onclick = toggleImport;
    document.getElementById('button-scn-export').onclick = toggleExport;
    document.getElementById('button-scn-export-copy').onclick = copyExport;
    document.getElementById('button-scn-play').onclick = play;
    document.getElementById('button-scn-stop').onclick = stop;
    document.getElementById('button-scn-enforce-when').onclick = () => {
        enforceWhen = !enforceWhen;
        renderEnforceWhen();
    };
    renderEnforceWhen();
    document.getElementById('button-scn-addstate').onclick = addState;
    document.getElementById('button-scn-addrow').onclick = addRowFromSearch;
    document.getElementById('button-scn-addprop').onclick = addPropRow;
    document.getElementById('button-scn-zoomin').onclick = () => setZoom(pxPerMs * 1.4);
    document.getElementById('button-scn-zoomout').onclick = () => setZoom(pxPerMs / 1.4);
    document.getElementById('button-scn-snap').onclick = () => {
        snapEnabled = !snapEnabled;
        localStorage.setItem(LS_SNAP, snapEnabled ? '1' : '0');
        renderSnapToggle();
    };
    renderSnapToggle();
    document.getElementById('button-scn-zoomfit').onclick = zoomFit;
    document.getElementById('scnImportSearch').addEventListener('keydown', e => e.stopPropagation());
    // scroll wheel over the timeline zooms (passive:false so we can preventDefault the page scroll)
    document.getElementById('scnTimelineScroll').addEventListener('wheel', onTimelineWheel, { passive: false });

    renderStatus();
    // Draws and MEASURES the restored draft (via the cheap cached calls) — no register: that waits
    // for play/export, so loading the editor costs nothing.
    renderAll();
}

// Called when the scenario HUD is opened. The init sync above ran while the HUD was still hidden, so
// its clientWidth was 0 and the auto-fit was skipped — re-sync now that the strip has a real width so
// the loaded scenario measures and fits to view on first open.
export function onScenarioShown() {
    lastFitSid = null; // let it re-fit now that width is known
    renderStatus();
    redraw();          // measures via the cheap calls; registering waits for play/export
}
