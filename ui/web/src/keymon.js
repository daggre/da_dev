// devRoot > keys — passive overlay listing the controls currently pressed, plus
// the ones released within the last LINGER ms so quick taps stay readable.
// keymonitor_cl.lua drives it with the `ui_keymon` message:
//   { state: true|false }            show / hide the window
//   { controls: [{name, key}, …] }   the current pressed set (sent on change)
// Currently-held controls render white; ones released in the last 2s linger in
// light blue and fade out. The linger/fade is UI-side (the client only reports
// the live set on change), so we keep our own clock here. The window is
// click-through (see #keymon-panel CSS) so it never grabs input.

const LINGER = 2000; // ms a released control stays visible before it drops off

// name -> { key, active (bool), releasedAt (ms | null) }
const entries = new Map();
let ticker = null;

export function toggleKeyMonitor(state) {
    const hud = document.getElementById('keymon-hud');
    hud.classList.toggle('hidden', state === false);
    if (state === false) {
        stopTicker();
        entries.clear();
    } else {
        startTicker();
    }
    draw();
}

// Called whenever the live pressed set changes. Merge it into the linger map:
// names in the set are (re)marked active; names that just left it start their
// release timer.
export function renderKeyMonitor(controls) {
    const now = performance.now();
    const activeNames = new Set();
    (controls || []).forEach(c => {
        activeNames.add(c.name);
        entries.set(c.name, { key: c.key, active: true, releasedAt: null });
    });
    entries.forEach((e, name) => {
        if (!activeNames.has(name) && e.active) {
            e.active = false;
            e.releasedAt = now;
        }
    });
    draw();
}

function startTicker() {
    if (ticker) return;
    // Re-draw on a timer so lingering entries keep fading / expire even while no
    // new messages arrive (e.g. a key held, then released and left alone).
    ticker = setInterval(draw, 100);
}

function stopTicker() {
    if (ticker) {
        clearInterval(ticker);
        ticker = null;
    }
}

function draw() {
    const list = document.getElementById('keymon-list');
    const empty = document.getElementById('keymon-empty');
    if (!list) return;
    const now = performance.now();

    // Expire released entries past their linger window.
    entries.forEach((e, name) => {
        if (!e.active && now - e.releasedAt > LINGER) entries.delete(name);
    });

    list.innerHTML = '';
    if (entries.size === 0) {
        empty.classList.remove('hidden');
        return;
    }
    empty.classList.add('hidden');

    // Held controls first, then most-recently released.
    const rows = [...entries.entries()].sort((a, b) => {
        if (a[1].active !== b[1].active) return a[1].active ? -1 : 1;
        if (a[1].active) return 0;
        return b[1].releasedAt - a[1].releasedAt;
    });

    rows.forEach(([name, e]) => {
        const cls = e.active ? 'active' : 'recent';
        const opacity = e.active
            ? 1
            : Math.max(0.15, 1 - (now - e.releasedAt) / LINGER);
        const key = e.key ? `<span class="kkey">${e.key}</span>` : '';
        list.insertAdjacentHTML(
            'beforeend',
            `<li style="opacity:${opacity.toFixed(2)}"><span class="kname ${cls}">${name}</span>${key}</li>`
        );
    });
}
