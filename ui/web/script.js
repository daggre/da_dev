import { addMessageListener, addEventActionsListener } from './components/events.js';
import { fetchSpawnData, initSettings } from './components/settings.js';
import { addTooltipListener } from './components/tooltip.js';
import { addDropdownsListener } from './components/dropdown.js';

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
    addEventActionsListener();
});
