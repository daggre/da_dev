import { toggleHUD, toggleSection } from './common.js';
import { onScenarioShown } from '../scenario.js';
import { onPropShown } from '../prop.js';

const AnimHUD = {
    all: [
        'animHelp',
        'animHUDControls',
        'animSearchLeftColumn',
        'animSearchDict',
        'animSearchName',
        'animSearchField',
        'animDictList',
        'animNameList',
        'animPreviewParams',
        'animScenarioColumns',
        'animPropColumns',
        'scnTimelineBar',
    ],
    visible: ['animHUDControls'], // Default visible elements
    buttons: {
        search: 'button-animsearch',
        scenario: 'button-animscenario',
        prop: 'button-animprop',
    },
    sections: {
        // Search now also carries the persistent preview-params panel (configure mode was merged in).
        search: [
            'animSearchLeftColumn',
            'animSearchDict',
            'animSearchName',
            'animSearchField',
            'animDictList',
            'animNameList',
            'animPreviewParams',
        ],
        // Two containers: the working columns, and the full-width timeline pinned at the bottom.
        scenario: ['animScenarioColumns', 'scnTimelineBar'],
        // Prop mode: author a propset attachment (mode_prop_cl.lua owns the live helper).
        prop: ['animPropColumns'],
    },
};

export function toggleAnimationHUD(state) {
    const animHudEl = document.getElementById('anim-hud');
    state = state ?? animHudEl.classList.contains('hidden');
    toggleSection(state, AnimHUD.visible, [], AnimHUD.all);

    animHudEl.classList.toggle('hidden', !state);
}

export function toggleAnimationSearchHUD(state) {
    toggleHUD(state, AnimHUD, 'search', AnimHUD.buttons.search);
}

// Configure mode was merged into search (the persistent preview-params panel) and the scenario
// editor. Kept as a no-op so the historical import/keybind can't throw.
export function toggleAnimationConfigureHUD() {}

export function toggleAnimationScenarioHUD(state) {
    toggleHUD(state, AnimHUD, 'scenario', AnimHUD.buttons.scenario);
    // If the scenario section is now visible, let the editor register/measure/fit against a real
    // width (it couldn't while hidden at init).
    if (!document.getElementById('animScenarioColumns').classList.contains('hidden')) {
        onScenarioShown();
    }
}

export function toggleAnimationPropHUD(state) {
    toggleHUD(state, AnimHUD, 'prop', AnimHUD.buttons.prop);
    // Tell Lua whether the section is showing: it points `Select` at the base (the bone picker
    // reads it) and shuts the skeleton overlay off on close.
    onPropShown(!document.getElementById('animPropColumns').classList.contains('hidden'));
}

const AnimConfigureCategoryMap = new Map([
    ['button-animTimings', 'animConfigureTimings'],
    ['button-animFlags', 'animConfigureFlags'],
    ['button-animExtras', 'animConfigureExtras'],
]);

export function toggleAnimDetail(elId, state) {
    const el = document.getElementById(elId);
    if (state === undefined) {
        state = !el.classList.contains('selected');
    }
    el.classList.toggle('selected', state);
    const listEl = document.getElementById(AnimConfigureCategoryMap.get(elId));
    listEl.classList.toggle('hidden', !state);
}
