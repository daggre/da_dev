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

let doc = null; // the authored config
let docId = 'my_scenario'; // the id it serializes under (and the draft name)
let sel = { kind: 'scenario' }; // {kind:'scenario'} | {kind:'state', state} | {kind:'row', state, i}
let live = null; // last scnRegister response: { ok, errors, scenario }
let importedDropped = []; // hook paths getRaw couldn't carry over
let syncTimer = null;
const collapsed = new Set(); // state ids whose rows are hidden in the tree

// Timeline zoom, in pixels per millisecond — persisted so a session keeps its scale.
const LS_ZOOM = 'da_dev.scnZoom';
const ZOOM_MIN = 0.008;
const ZOOM_MAX = 3;
let pxPerMs = clampZoom(Number(localStorage.getItem(LS_ZOOM)) || 0.12);

function clampZoom(v) {
    return Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, Number.isFinite(v) ? v : 0.12));
}

// Snap-to-grid for dragging anims: a 100ms grid plus edge-snap to neighbouring bars. Toggled from
// the timeline head, persisted, and momentarily overridden by holding Ctrl during a drag.
const LS_SNAP = 'da_dev.scnSnap';
const SNAP_GRID = 100; // ms
const SNAP_PX = 8;     // edge-snap pulls in within this many screen pixels of a neighbour's edge
let snapEnabled = localStorage.getItem(LS_SNAP) !== '0';

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

// The doc with unconfigured rows removed, per state — what actually gets registered and played, so a
// half-authored row never blocks the rest. The FULL doc is still what the timeline draws (the bad
// rows show red there); this is only the runnable projection of it.
function playableDoc() {
    const states = {};
    for (const [sid, st] of Object.entries(doc.states || {})) {
        states[sid] = { ...st, anims: (st.anims || []).filter(r => !rowInvalidReason(r)) };
    }
    return { ...doc, states };
}

function invalidRowCount() {
    let n = 0;
    for (const st of Object.values(doc.states || {})) {
        for (const r of (st.anims || [])) if (rowInvalidReason(r)) n++;
    }
    return n;
}

// Every edit funnels through here: autosave, then re-register through the real validator
// (debounced — a keystroke isn't a register).
function changed() {
    saveDraft();
    setStatus('…', '');
    clearTimeout(syncTimer);
    syncTimer = setTimeout(sync, 400);
}

async function sync() {
    sanitizeDoc(doc);
    // Only the state the timeline is drawing gets its row lengths measured (the slow part) — pass it
    // as `focus` so register doesn't stream every dict in the whole scenario on every edit.
    const focus = timelineStateId();
    // Register the CLEANED draft — unconfigured rows stripped — so one half-authored row can't refuse
    // the whole scenario. The timeline still draws them (red) from the full doc.
    const res = await sendClientMessage('scnRegister', { cfg: playableDoc(), focus });
    live = res || { ok: false, errors: ['no response from da_dev'] };
    if (live) live.focus = focus; // the one state whose rows carry measured lengths
    renderStatus();
    renderStateSelect();
    renderTimeline();
    maybeAutoFit(); // fit the state to the strip when the drawn state changes
    if (exportShown) refreshExport(); // keep the open export panel in step with the edit
}

// The register only measured one state; if the timeline is now pointed at a different one, re-run
// (validation is cheap — it streams nothing — and the new focus gets measured). Called wherever the
// drawn state can change.
function ensureFocusMeasured() {
    if (live && live.ok && timelineStateId() !== live.focus) sync();
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
    if (!live) { setStatus('', ''); box.classList.add('hidden'); return; }

    const lines = []; // { text, cls }
    const bad = invalidRowCount();
    if (bad > 0) lines.push({
        text: `${bad} unconfigured row${bad === 1 ? '' : 's'} — shown red on the timeline, left out of play`,
        cls: 'scn-note-line',
    });
    for (const p of importedDropped) lines.push({ text: `hook not imported: ${p}`, cls: 'scn-note-line' });

    if (live.ok) {
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
    entry.textContent = spec.get() ?? '';
    if (spec.hint) entry.title = spec.hint;

    const commit = () => {
        spec.set(entry.textContent);
        changed();
        renderTree(); // names/ids/roles show in the tree
        entry.textContent = spec.get() ?? ''; // normalize the spelling back
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

// Scalar accessors: text <-> number/string on a target table, deleting the key when cleared.
function numField(obj, key, label, hint) {
    return field({
        label, hint,
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
    entry.textContent = spec.get() ?? '';
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
    return row;
}

// A bitmask field — a MULTI-select dropdown of the individual bits, exactly as the configure HUD
// does flags. `fetch()` returns [{ name, value, note }]; toggling applies live. The stored value is
// the OR of the set bits, which the Lua serializer re-collapses into a `Flag.*` preset name.
function bitmaskField(spec) {
    const row = h('div', 'field');
    row.appendChild(h('span', 'flabel', spec.label));
    const entry = h('div', 'entry dropdown scn-entry');
    entry.tabIndex = 15;
    const paint = () => {
        const v = spec.get();
        entry.textContent = spec.label === 'flag' ? (flagText(v) || '—') : (v ? String(v) : '—');
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
function buildAutocomplete(items, anchor, onPick) {
    closeDictPopup(); // only ever one open
    const menu = h('div', 'context-menu scn-autocomplete');
    menu._anchor = anchor;
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

// The dict field: editable, with type-to-filter autocomplete against the anim database.
function dictField(obj, key, label, hint) {
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

    // Empty field, just focused: offer the dicts already used in this scenario — no typing needed.
    entry.addEventListener('focus', () => {
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
        if (e.key === 'Enter') { e.preventDefault(); entry.blur(); }
        if (e.key === 'Escape') { closeDictPopup(); entry.textContent = obj[key] ?? ''; entry.blur(); }
        e.stopPropagation();
    });
    row.appendChild(entry);
    return row;
}

// The anim field: editable, plus a picker that lists the row dict's known anims in a dropdown.
function animField(r) {
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
        const dict = effectiveDict(r);
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
    renderAll();
    ensureFocusMeasured(); // a state/row selection can move the timeline to an unmeasured state
}

function renderTree() {
    const ul = document.getElementById('scnTree');
    ul.innerHTML = '';

    const scnLi = h('li', 'scn-node scn-scenario' + (sel.kind === 'scenario' ? ' selected' : ''));
    scnLi.appendChild(h('span', 'scn-caret', ''));
    scnLi.appendChild(h('span', 'scn-label', `${docId} — ${doc.name || ''}`));
    scnLi.onclick = () => select({ kind: 'scenario' });
    ul.appendChild(scnLi);

    for (const sid of stateIds()) {
        const st = doc.states[sid];
        const rows = st.anims || [];
        const isCollapsed = collapsed.has(sid);

        const li = h('li', 'scn-node scn-state' +
            (sel.kind === 'state' && sel.state === sid ? ' selected' : ''));
        // Caret toggles collapse without moving the selection; the label selects.
        const caret = h('span', 'scn-caret', rows.length ? (isCollapsed ? '▸' : '▾') : '·');
        if (rows.length) {
            caret.classList.add('scn-caret-active');
            caret.onclick = e => {
                e.stopPropagation();
                if (isCollapsed) collapsed.delete(sid); else collapsed.add(sid);
                renderTree();
            };
        }
        li.appendChild(caret);
        li.appendChild(h('span', 'scn-label', `${sid}  ·  ${st.role || '?'}  (${rows.length})`));
        li.onclick = () => select({ kind: 'state', state: sid });
        ul.appendChild(li);

        if (isCollapsed) continue;
        rows.forEach((r, i) => {
            const rowLi = h('li', 'scn-node scn-row' +
                (sel.kind === 'row' && sel.state === sid && sel.i === i ? ' selected' : ''));
            rowLi.appendChild(h('span', 'scn-caret', ''));
            rowLi.appendChild(h('span', 'scn-label', `@${r.at || 0}  ${r.anim || '(no anim)'}`));
            rowLi.onclick = () => select({ kind: 'row', state: sid, i });
            ul.appendChild(rowLi);
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

function renderPanel() {
    closeDictPopup(); // a rebuild replaces the fields; don't leave a dict popup floating over them
    const el = document.getElementById('scnPanel');

    if (sel.kind === 'scenario') {
        doc.defaults = doc.defaults || {};
        const nodes = [
            field({
                label: 'id',
                hint: 'the scenario id the Lua is emitted under (and the draft name)',
                get: () => docId,
                set: t => { const v = t.trim(); if (v) renameDraft(docId, v); },
            }),
            strField(doc, 'name', 'name', 'what the player reads'),
            dictField(doc, 'dict', 'dict', 'default dict; rows may use "@suffix" of it'),
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
            h('div', 'flabel scn-sep', 'row defaults'),
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
        panelInto(el, 'scenario', nodes);
        return;
    }

    const st = doc.states[sel.state];
    if (!st) { panelInto(el, '', []); return; }

    if (sel.kind === 'state') {
        const sid = sel.state;
        const nodes = [
            field({
                label: 'id',
                get: () => sid,
                set: t => {
                    const v = t.trim();
                    if (!v || v === sid || doc.states[v]) return;
                    doc.states[v] = st;
                    delete doc.states[sid];
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
        if (st.role === 'transition') {
            nodes.splice(3, 0, strField(st, 'to', 'to', 'target scenario id'));
        }
        const bar = h('div', 'subbar');
        // No per-state "play" button — the timeline transport plays whatever state is focused, and
        // selecting a state focuses it, so "play" always runs what you're looking at.
        bar.appendChild(actionButton('delete state', () => {
            delete doc.states[sid];
            select({ kind: 'scenario' });
            changed();
        }, true));
        nodes.push(bar);
        panelInto(el, `state · ${sid}`, nodes);
        return;
    }

    // row
    const r = (st.anims || [])[sel.i];
    if (!r) { panelInto(el, '', []); return; }
    const nodes = [
        numField(r, 'at', 'at', 'offset ms from the start of the state'),
        dictField(r, 'dict', 'dict', '"@suffix" of the scenario dict, absolute, or blank = scenario dict'),
        animField(r),
        numField(r, 'hold', 'hold', 'ms this row plays; -1/blank = natural end'),
        bitmaskField({
            label: 'flag', hint: Object.keys(FLAG_PRESETS).join(' '), fetch: getAnimFlags,
            get: () => r.flag,
            set: v => { if (v === undefined) delete r.flag; else r.flag = v; },
        }),
        numField(r, 'blendIn', 'blend-in'),
        numField(r, 'blendOut', 'blend-out'),
        numField(r, 'rate', 'rate'),
        bitmaskField({
            label: 'ik-flags', fetch: getAnimIKFlags,
            get: () => r.ikFlags,
            set: v => { if (v === undefined) delete r.ikFlags; else r.ikFlags = v; },
        }),
        selectField({
            label: 'taskfilter', hint: 'bone mask, or false to opt out of an inherited one',
            options: taskFilterOptions,
            get: () => taskFilterLabel(r.taskFilter),
            set: v => { if (v === undefined) delete r.taskFilter; else r.taskFilter = v; },
        }),
        field({
            label: 'when',
            get: () => whenText(r.when),
            set: t => { r.when = parseWhen(t); },
        }),
    ];
    const bar = h('div', 'subbar');
    bar.appendChild(actionButton('delete row', () => {
        st.anims.splice(sel.i, 1);
        select({ kind: 'state', state: sel.state });
        changed();
    }, true));
    nodes.push(bar);
    panelInto(el, `row · ${sel.state}[${sel.i + 1}]`, nodes);
}

// ===================== timeline =====================
//
// Drawn from what the REGISTRY made of the draft (live.scenario), never from the document: dicts
// resolved, defaults applied, lengths measured by the engine, await resolved by the same code the
// run uses. A row cut short by the await is visibly cut short.

function timelineStateId() {
    if (sel.kind === 'state' || sel.kind === 'row') return sel.state;
    return live?.scenario?.idleId || stateIds()[0];
}

const DRAW_FALLBACK = 500; // drawn width (ms) for a valid row whose length couldn't be measured
const INVALID_W = 600;     // drawn width (ms) for an unconfigured (red) row — it has no real duration

// A valid doc row's drawn length: an explicit `hold`, else the length the engine measured for the
// matching live row (`lr`), else nothing. `lr` is the registry's take on the same row (see below).
function docRowLen(r, lr) {
    if (r.hold > 0) return r.hold;
    return lr ? lr.len : null;
}

// The state's full extent in ms — the later of its resolved await and its longest row — computed
// from the DOCUMENT (so red rows count too), pairing valid rows with the registry's measured ones.
function stateExtentMs(sid) {
    const docSt = doc.states[sid];
    if (!docSt) return 0;
    const liveSt = (live && live.ok) ? live.scenario.states[sid] : null;
    const liveRows = liveSt ? liveSt.anims : [];
    const awaitMs = liveSt ? liveSt.awaitResolved : undefined;
    let liveIdx = 0;
    let end = typeof awaitMs === 'number' ? awaitMs : 0;
    for (const r of (docSt.anims || [])) {
        const at = r.at || 0;
        if (rowInvalidReason(r)) { end = Math.max(end, at + INVALID_W); continue; }
        const len = docRowLen(r, liveRows[liveIdx++]);
        end = Math.max(end, at + (len || DRAW_FALLBACK));
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

    // Drawn from the DOCUMENT so half-authored rows still show — as red boxes. A valid row borrows
    // its measured length and the resolved await from the registry's take on the CLEANED draft
    // (`live`); the cleaned draft holds exactly the valid rows in order, so the k-th live anim row
    // is the k-th valid doc row.
    const liveSt = (live && live.ok) ? live.scenario.states[sid] : null;
    const liveRows = liveSt ? liveSt.anims : [];
    const awaitMs = liveSt ? liveSt.awaitResolved : undefined;

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
    let liveIdx = 0;
    const items = (docSt.anims || []).map((r, i) => {
        const at = r.at || 0;
        const isLayer = ((r.flag || 0) & FLAG_PRESETS.UpperBody) !== 0;
        const reason = rowInvalidReason(r);
        if (reason) {
            return { r, i, at, isLayer, invalid: true, reason, len: null, end: at + INVALID_W };
        }
        const len = docRowLen(r, liveRows[liveIdx++]);
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

    const nBad = items.filter(it => it.invalid).length;
    const awaitLabel = awaitMs === false ? 'advance' :
        typeof awaitMs === 'number' ? fmtMs(awaitMs) : 'poll';
    titleEl.textContent = `${sid} · await ${awaitText(docSt.await) || 'poll'}` +
        ` → ${awaitLabel} · ${items.length} row${items.length === 1 ? '' : 's'}` +
        (nBad ? ` · ${nBad} unconfigured` : '') +
        (laneCount > 1 ? ` · ${laneCount} lanes` : '');

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

    // The await cutoff, spanning every lane — draggable to set the await value (below).
    if (typeof awaitMs === 'number') {
        tracks.appendChild(makeAwaitHandle(sid, awaitMs, totalMs));
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

    // While playing, the rAF loop re-places the playhead every frame (it reads the current
    // pxPerMs), so a zoom or redraw needs no explicit reposition here.
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
            newAt = (snapEnabled && !ev.ctrlKey) ? snapDragAt(rawAt, dragLen, anchors) : Math.round(rawAt);
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
function makeAwaitHandle(sid, awaitMs, totalMs) {
    const cut = h('div', 'scn-await');
    cut.style.left = (awaitMs * pxPerMs) + 'px';
    cut.title = 'drag to set await';
    // A pennant tab hanging below the line — a square body with a point on top that leads up to
    // the dashed line, so it reads as a grab handle. It carries the current value.
    const tab = h('div', 'scn-await-tab', fmtMs(awaitMs));
    cut.appendChild(tab);

    cut.addEventListener('mousedown', e => {
        e.preventDefault();
        e.stopPropagation();
        const tracks = document.getElementById('scnTracks');
        let ms = awaitMs;

        const onMove = ev => {
            // track the cursor, but snap the value to the nearest 100ms
            const raw = Math.max(0, (ev.clientX - tracks.getBoundingClientRect().left) / pxPerMs);
            ms = Math.round(raw / 100) * 100;
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
    if (!sid || !(live && live.ok)) return;
    // HUD not laid out yet (width 0) — don't record it as fitted, so the next sync retries.
    if (document.getElementById('scnTimelineScroll').clientWidth <= 0) return;
    if (sid === lastFitSid) return;
    lastFitSid = sid;
    fitTo(sid, targetFrac(stateExtentMs(sid) * 1.04));
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
    clearTimeout(syncTimer);
    await sync();
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
    // A fidget preview establishes the IDLE first, then jumps to the fidget — so the run legitimately
    // sits on another state for a moment before ours appears. Only retire once we've actually SEEN
    // the state we launched (then a move away from it means it advanced/ended), with a safety
    // timeout in case it never comes up (e.g. a gated idle).
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

function addState() {
    let n = 1;
    while (doc.states['state_' + n]) n++;
    const sid = 'state_' + n;
    doc.states[sid] = { role: 'fidget', anims: [] };
    select({ kind: 'state', state: sid });
    changed();
}

// ===================== front door =====================

async function toggleImport() {
    const card = document.getElementById('scnImportCard');
    if (!card.classList.contains('hidden')) { card.classList.add('hidden'); return; }
    card.classList.remove('hidden');

    const res = await sendClientMessage('scnList', {});
    const ul = document.getElementById('scnImportList');
    const search = document.getElementById('scnImportSearch');

    const render = () => {
        const q = search.textContent.trim().toLowerCase();
        ul.innerHTML = '';

        for (const [name, d] of Object.entries(drafts())) {
            if (q && !name.toLowerCase().includes(q)) continue;
            const li = h('li', 'scn-import-draft', `${name}  ·  draft`);
            li.onclick = () => {
                doc = d.cfg;
                docId = name;
                importedDropped = [];
                sanitizeDoc(doc);
                localStorage.setItem(LS_LAST, docId);
                lastFitSid = null; // re-fit the loaded scenario
                card.classList.add('hidden');
                select({ kind: 'scenario' });
                changed();
            };
            ul.appendChild(li);
        }

        for (const s of (res?.scenarios || [])) {
            if (q && !s.id.toLowerCase().includes(q) && !s.name.toLowerCase().includes(q)) continue;
            const li = h('li', null, `${s.id}  ·  ${s.name}  ·  ${s.nStates} states`);
            li.onclick = async () => {
                const raw = await sendClientMessage('scnImport', { id: s.id });
                if (!raw?.cfg) { setStatus(raw?.error || 'import failed', 'scn-err'); return; }
                doc = raw.cfg;
                docId = s.id;
                importedDropped = raw.dropped || [];
                lastFitSid = null; // re-fit the imported scenario
                card.classList.add('hidden');
                select({ kind: 'scenario' });
                changed();
            };
            ul.appendChild(li);
        }
    };
    search.oninput = render;
    render();
}

function newScenario() {
    doc = blankDoc();
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
}

function renderAll() {
    renderTree();
    renderPanel();
    renderStateSelect();
    renderTimeline();
}

export function initScenario() {
    const last = localStorage.getItem(LS_LAST);
    const saved = last && drafts()[last];
    if (saved) { doc = saved.cfg; docId = last; sanitizeDoc(doc); }
    else { doc = blankDoc(); docId = 'my_scenario'; }

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

    renderAll();
    // Register/measure the loaded draft NOW, not on the first edit — otherwise a scenario restored
    // from localStorage sits unregistered (unmeasured timeline, no validation) until you poke it.
    sync();
}

// Called when the scenario HUD is opened. The init sync above ran while the HUD was still hidden, so
// its clientWidth was 0 and the auto-fit was skipped — re-sync now that the strip has a real width so
// the loaded scenario measures and fits to view on first open.
export function onScenarioShown() {
    lastFitSid = null; // let it re-fit now that width is known
    sync();
}
