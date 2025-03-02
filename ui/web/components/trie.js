import { KeyActions } from './events.js';
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

    const container = document.querySelector(fmt.selector);
    console.log(container);
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
        KeyActions['dev-tree-hud'][option.key] = () => {
            sendClientMessage(msg, data);
            document.getElementById('dev-tree-hud').classList.add('hidden');
        };
        container.insertAdjacentHTML('beforeend', `
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
        document.getElementById('dev-tree-hud').classList.add('hidden');
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
