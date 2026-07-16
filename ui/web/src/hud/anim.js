import { toggleHUD, toggleSection } from './common.js';
import { onScenarioShown } from '../scenario.js';

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
        'animListConfigureLeftColumn',
        'animListConfigureOptions',
        'animListConfigureList',
        'animListConfigureDict',
        'animListConfigureName',
        'animScenarioColumns',
        'scnTimelineBar',
    ],
    visible: ['animHUDControls'], // Default visible elements
    buttons: {
        search: 'button-animsearch',
        configure: 'button-animconfigure',
        scenario: 'button-animscenario',
    },
    sections: {
        search: [
            'animSearchLeftColumn',
            'animSearchDict',
            'animSearchName',
            'animSearchField',
            'animDictList',
            'animNameList',
        ],
        configure: [
            'animListConfigureLeftColumn',
            'animListConfigureOptions',
            'animListConfigureList',
            'animListConfigureDict',
            'animListConfigureName',
        ],
        // Two containers: the working columns, and the full-width timeline pinned at the bottom.
        scenario: ['animScenarioColumns', 'scnTimelineBar'],
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

export function toggleAnimationConfigureHUD(state) {
    toggleHUD(state, AnimHUD, 'configure', AnimHUD.buttons.configure);
}

export function toggleAnimationScenarioHUD(state) {
    toggleHUD(state, AnimHUD, 'scenario', AnimHUD.buttons.scenario);
    // If the scenario section is now visible, let the editor register/measure/fit against a real
    // width (it couldn't while hidden at init).
    if (!document.getElementById('animScenarioColumns').classList.contains('hidden')) {
        onScenarioShown();
    }
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
