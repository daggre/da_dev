import { KeyActions } from '../script.js';
import { elementSetClass } from '../utils/nav.js';
import { sendClientMessage } from '../utils/msg.js';

let formatter = {
    menu: {
        selector: '#menuOptions',
        prefix: ' ',
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

function appendOptionsToContainer(trieName, type, optionsArray) {
    const fmt = formatter[type];
    if (!fmt) {
        console.error(`Formatter not found for type: ${type}`);
        return;
    }

    const container = fmt.selector;
    if (!container) {
        console.error(`Container not found for selector: ${fmt.selector}`);
        return;
    }
    container.empty();

    if (!optionsArray) {
        return;
    }
    optionsArray.forEach(option => {
        const msg = fmt.msg;
        const data = fmt.data(trieName, option);
        KeyActions['dev-tree-hud'][option.key] = () => {
            sendClientMessage(msg, data);
            elementSetClass('dev-tree-hud', 'hidden', true);
        };
        container.append(`
            <div class="row">
                <div class="column value">${fmt.prefix}${option.name}</div>
                <div class="column key">${option.key}</div>
            </div>
        `);
    });
}

function clearKeyActions() {
    for (const key in KeyActions['dev-tree-hud']) {
        delete KeyActions['dev-tree-hud'][key];
    }
    KeyActions['dev-tree-hud'].default = () => {
        elementSetClass('dev-tree-hud', 'hidden', true);
        sendClientMessage('deactivateMode', { mode: 'devTree' });
    };
}

export function initTrie(optionTrie) {
    if (!optionTrie) {
        console.error('Invalid optionTrie provided');
        return;
    }

    clearKeyActions();

    appendOptionsToContainer(optionTrie.name, 'menu', optionTrie.submenus);
    appendOptionsToContainer(optionTrie.name, 'option', optionTrie.options);
}
