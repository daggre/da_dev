import { addMessageListener, addEventActionsListener } from './src/events.js';
import { fetchSpawnData, initSettings } from './src/settings.js';
import { addTooltipListener } from './src/tooltip.js';
import { addDropdownsListener } from './src/dropdown.js';
import { addTriePaletteListener } from './src/trie.js';

document.addEventListener('DOMContentLoaded', () => {
    addMessageListener();
    window.messagesReady = window.messagesReady || new Deferred();
    window.messagesReady.resolve();
});

window.netReady = window.netReady || new Deferred();
window.netReady.promise.then(() => {
    fetchSpawnData();
    initSettings();
    addTooltipListener();
    addDropdownsListener();
    addTriePaletteListener();
    addEventActionsListener();
});
