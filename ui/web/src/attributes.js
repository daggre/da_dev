import { sendClientMessage } from './msg.js';
import { resetList } from './nav.js';

// Inspect tab, "attributes" sub-section — read-only ped/horse stats. Asks Lua for a
// list of grouped label/value rows (see src/attributes_cl.lua) and renders them. No
// selection or in-world draw; purely a readout that refreshes when the selection
// changes (driven by inspect.js).

export async function loadAttributes() {
    const resp = await sendClientMessage('getAttributes', {});
    renderAttributes(resp.groups || []);
}

// Nothing to tear down server-side (read-only); just clear the list.
export function stopAttributes() {
    resetList(document.getElementById('attrList'));
}

function renderAttributes(groups) {
    const el = document.getElementById('attrList');
    resetList(el);

    const ul = document.createElement('ul');
    const frag = document.createDocumentFragment();

    if (groups.length === 0) {
        const li = document.createElement('li');
        li.className = 'attr-empty';
        li.textContent = 'no attributes for this selection';
        frag.appendChild(li);
    }

    groups.forEach(group => {
        const head = document.createElement('li');
        head.className = 'attr-group';
        head.textContent = group.title;
        frag.appendChild(head);

        (group.rows || []).forEach(row => {
            const li = document.createElement('li');
            li.className = 'attr-row';

            const label = document.createElement('span');
            label.className = 'attr-label';
            label.textContent = row.label;

            const value = document.createElement('span');
            value.className = 'attr-value';
            value.textContent = row.value;

            li.appendChild(label);
            li.appendChild(value);
            frag.appendChild(li);
        });
    });

    ul.appendChild(frag);
    el.appendChild(ul);
    el.scrollTop = 0;
}
