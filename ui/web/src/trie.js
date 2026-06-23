import { KeyActions } from '../src/events.js';
import { sendClientMessage } from '../src/msg.js';

let formatter = {
    menu: {
        selector: '#menuOptions',
        prefix: ' ',
        msg: 'selectTrieMenu',
        data: (trieName, option) => ({ menu: option.name }),
    },
    option: {
        selector: '#devOptions',
        prefix: '',
        msg: 'selectTrieOption',
        data: (trieName, option) => ({ menu: trieName, option: option.name }),
    },
};

// Palette state: every visible menu/option row for the current trie, in render
// order, paired with the action that runs it. `activeIndex` tracks the row the
// command palette has highlighted (keyboard caret) while filtering.
let entries = [];
let activeIndex = -1;
// Breadcrumb of trie names from the root to the current menu, so Backspace (when
// not typing) can step back up one level. Reset on each fresh open.
let menuStack = [];
// Hold/cursor session (long-press `z`): the menu is mouse-driven, so keyboard
// shortcuts are suppressed (events.js checks this) to stop the held `z` from
// instantly triggering the menu's `z` option.
let cursorMode = false;

export function setDevTreeCursor(value) {
    cursorMode = !!value;
    // In cursor mode the title bar is mouse-only: make it non-editable and drop
    // focus so the held `z` can't spam characters into it.
    const input = getInput();
    if (input) {
        input.setAttribute('contenteditable', cursorMode ? 'false' : 'true');
        if (cursorMode) input.blur();
    }
}

export function isDevTreeCursorMode() {
    return cursorMode;
}

function appendOptionsToContainer(trieName, type, optionsArray) {
    const fmt = formatter[type];
    if (!fmt) {
        console.error(`Formatter not found for type: ${type}`);
        return;
    }

    const container = document.querySelector(fmt.selector);
    if (!container) {
        console.error(`Container not found for selector: ${fmt.selector}`);
        return;
    }
    container.innerHTML = '';

    if (!optionsArray) {
        return;
    }
    optionsArray.forEach(option => {
        const msg = fmt.msg;
        const data = fmt.data(trieName, option);
        // Submenus drill in and keep the menu open (push a breadcrumb); options run
        // and close it.
        const run =
            type === 'menu'
                ? () => {
                      menuStack.push(option.name);
                      sendClientMessage(msg, data);
                  }
                : () => {
                      sendClientMessage(msg, data);
                      document.getElementById('dev-tree-hud').classList.add('hidden');
                  };
        KeyActions['dev-tree-hud'][option.key] = run;
        container.insertAdjacentHTML('beforeend', `
            <div class="row">
                <div class="column value">${fmt.prefix}${option.name}</div>
                <div class="column key">${option.key}</div>
            </div>
        `);
        const el = container.lastElementChild;
        el.addEventListener('click', () => run());
        entries.push({ name: option.name.trim(), type, el, run });
    });
}

function clearKeyActions() {
    for (const key in KeyActions['dev-tree-hud']) {
        delete KeyActions['dev-tree-hud'][key];
    }
    // `space` is reserved for the command palette (focus the title-bar input).
    KeyActions['dev-tree-hud'][' '] = event => enterPalette(event);
    KeyActions['dev-tree-hud'].tab = event => enterPalette(event);
    // Backspace (while NOT typing in the palette) steps back up one menu level.
    KeyActions['dev-tree-hud'].backspace = () => goBack();
    // Arrow navigation when the title-bar input is NOT focused — mirrors the
    // command palette (same moveActive/runActive/goBack): up/down highlight the
    // prev/next row, left steps back a level, right/enter drills in or runs it.
    KeyActions['dev-tree-hud'].arrowup = event => { event?.preventDefault?.(); moveActive(-1); };
    KeyActions['dev-tree-hud'].arrowdown = event => { event?.preventDefault?.(); moveActive(1); };
    KeyActions['dev-tree-hud'].arrowleft = () => goBack();
    KeyActions['dev-tree-hud'].arrowright = () => runActive();
    KeyActions['dev-tree-hud'].enter = () => runActive();
    KeyActions['dev-tree-hud'].default = () => {
        document.getElementById('dev-tree-hud').classList.add('hidden');
        sendClientMessage('deactivateMode', { mode: 'devTree' });
    };
}

// `isFreshOpen` is true when the menu is (re)opening from hidden — that resets the
// breadcrumb to this trie's root. Drill-in / back responses keep the stack as-is.
export function initTrie(optionTrie, isFreshOpen) {
    if (!optionTrie) {
        console.error('Invalid optionTrie provided');
        return;
    }

    clearKeyActions();
    entries = [];
    activeIndex = -1;
    if (isFreshOpen) menuStack = [optionTrie.name];

    appendOptionsToContainer(optionTrie.name, 'menu', optionTrie.submenus);
    appendOptionsToContainer(optionTrie.name, 'option', optionTrie.options);

    // Clear any query/filter on (re)render but preserve focus — so drilling into a
    // submenu from the palette leaves the user typing in a cleared box.
    clearPalette();
}

function goBack() {
    if (menuStack.length <= 1) return;
    menuStack.pop();
    sendClientMessage('selectTrieMenu', { menu: menuStack[menuStack.length - 1] });
}

// ---- command palette --------------------------------------------------------

function getInput() {
    return document.getElementById('devtree-title');
}

// Subsequence fuzzy match: every char of `query` appears in `text`, in order.
function fuzzyMatch(text, query) {
    let i = 0;
    for (const ch of query) {
        i = text.indexOf(ch, i);
        if (i === -1) return false;
        i++;
    }
    return true;
}

function highlightActive() {
    entries.forEach((entry, i) => {
        entry.el.classList.toggle('active', i === activeIndex);
    });
    if (activeIndex >= 0 && entries[activeIndex]) {
        entries[activeIndex].el.scrollIntoView({ block: 'nearest' });
    }
}

function filterEntries(query) {
    query = (query || '').trim().toLowerCase();
    let firstMatch = -1;
    entries.forEach((entry, i) => {
        const match = query === '' || fuzzyMatch(entry.name.toLowerCase(), query);
        entry.el.classList.toggle('hidden', query !== '' && !match);
        if (match && query !== '' && firstMatch === -1) firstMatch = i;
    });
    activeIndex = firstMatch;
    highlightActive();
}

function moveActive(dir) {
    const visible = entries
        .map((entry, i) => ({ i, hidden: entry.el.classList.contains('hidden') }))
        .filter(e => !e.hidden)
        .map(e => e.i);
    if (visible.length === 0) return;
    let pos = visible.indexOf(activeIndex);
    pos = (pos + dir + visible.length) % visible.length;
    activeIndex = visible[pos];
    highlightActive();
}

function runActive() {
    const input = getInput();
    const text = input.textContent.trim();
    const entry = entries[activeIndex];
    if (entry && !entry.el.classList.contains('hidden')) {
        if (entry.type === 'menu') {
            // Drill into the submenu but stay in the palette: clear the query and
            // keep focus. initTrie() will re-render and refilter without blurring.
            input.textContent = '';
            activeIndex = -1;
            entry.run();
        } else {
            exitPalette();
            entry.run();
        }
    } else if (text.length) {
        // No menu match — hand the raw text to Lua as a CLI/console command.
        exitPalette();
        sendClientMessage('runCli', { text });
        document.getElementById('dev-tree-hud').classList.add('hidden');
    }
}

function enterPalette(event) {
    if (event) event.preventDefault();
    const input = getInput();
    input.textContent = '';
    input.focus();
}

// Clear the query/filter without touching focus (used on every re-render so a
// palette drill-in keeps the user typing).
function clearPalette() {
    const input = getInput();
    if (input) input.textContent = '';
    activeIndex = -1;
    filterEntries('');
}

// Leave palette/input mode entirely: clear and drop focus so menu shortcuts work.
function exitPalette() {
    clearPalette();
    const input = getInput();
    if (input) input.blur();
}

export function addTriePaletteListener() {
    const input = getInput();
    if (!input) return;

    input.addEventListener('input', () => {
        // Normalize a field emptied by editing (contenteditable can leave a stray
        // <br>) so the `:empty` "dev" placeholder reappears, then refilter.
        if (!input.textContent.trim()) input.textContent = '';
        filterEntries(input.textContent);
    });

    // Local keydown runs before the document handler; stopPropagation keeps these
    // keys from leaking into the menu-shortcut / close-menu plumbing in events.js.
    input.addEventListener('keydown', event => {
        switch (event.key) {
            case 'Escape':
                event.stopPropagation();
                event.preventDefault();
                exitPalette();
                break;
            case 'Enter':
                event.stopPropagation();
                event.preventDefault();
                runActive();
                break;
            case 'ArrowDown':
                event.stopPropagation();
                event.preventDefault();
                moveActive(1);
                break;
            case 'ArrowUp':
                event.stopPropagation();
                event.preventDefault();
                moveActive(-1);
                break;
            case 'Backspace':
            case 'Delete':
                // Keep the global keydown handler from manually clearing the field
                // (which suppresses the `input` event and leaves the list filtered).
                // Native deletion proceeds and fires `input`, restoring the list.
                event.stopPropagation();
                break;
        }
    });
}
