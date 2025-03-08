import { toggleHUD, toggleSection } from './common.js';

const SettingsHUD = {
    all: ['settings-popup'],
    visible: ['settings-popup'],
}

export function toggleSettingsHUD(state) {
    const settingsHudEl = document.getElementById('settings-hud');
    state = state ?? settingsHudEl.classList.contains('hidden');
    toggleSection(state, SettingsHUD.visible, [], SettingsHUD.all);
    settingsHudEl.classList.toggle('hidden', !state);
}
