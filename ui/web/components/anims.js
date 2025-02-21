import {
    KeyActions,
    toUint32,
} from '../script.js';
import { showConfirm } from '../utils/confirm.js';
import {
    DropDownAdvOptions,
    DropDownMultiOptions,
} from '../utils/dropdown.js';
import { sendClientMessage } from '../utils/msg.js';
import {
    selectOnly,
    resetList,
    isVisible,
    elementSetClass,
    elementHasClass,
    elementSetText,
    toggleSection
} from '../utils/nav.js';

let Animations;
let AnimFlags;
let AnimIKFlags;
let TaskFilters;
let FlagTotals = 0;
let IKFlagTotals = 0;

async function fetchData(key, messageType, modifier) {
    if (!globalThis[key]) {
        const resp = await sendClientMessage(messageType, {});
        let data = JSON.parse(resp[key.toLowerCase()]);

        if (modifier && typeof modifier === 'function') { modifier(data); }
        globalThis[key] = data;
    }
    return globalThis[key];
}

function addSelected(data) {
    data.forEach((item, index) => { item.selected = false });
}

export function getAnimations() { return fetchData('Animations', 'initAnims'); }
export function getAnimFlags() { return fetchData('AnimFlags', 'initAnimFlags', addSelected); }
export function getAnimIKFlags() { return fetchData('AnimIKFlags', 'initIKAnimFlags', addSelected); }
export function getTaskFilters() { return fetchData('TaskFilters', 'initTaskFilters'); }

const AnimHUD_All = [
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
];

const AnimHUD_Visible = [
    'animHUDControls',
];

const AnimHUD_Buttons = [
    'button-animsearch',
    'button-animconfigure',
];

const AnimHUD_Search = [
    'animSearchLeftColumn',
    'animSearchDict',
    'animSearchName',
    'animSearchField',
    'animDictList',
    'animNameList',
];

const AnimHUD_Configure = [
    'animListConfigureLeftColumn',
    'animListConfigureOptions',
    'animListConfigureList',
    'animListConfigureDict',
    'animListConfigureName',
];

export function initializeAnimationHUD() {
    toggleSection(
        false,
        [],
        AnimHUD_Visible,
        AnimHUD_All
    );
    elementSetClass('animHUD', 'hidden', true);
}

export function toggleAnimationHUD(state) {
    if (state == undefined)
        state = elementHasClass('animHUD', 'hidden');
    toggleSection(
        state,
        AnimHUD_Visible, // Elements to show
        [],
        AnimHUD_All, // All elements
    );
    elementSetClass('animHUD', 'hidden', !state);
}

export function toggleAnimationSearchHUD(state) {
    if (state == undefined)
        state = elementHasClass(AnimHUD_Search[0], 'hidden');
    console.log('toggleAnimationSearchHUD', state);
    toggleSection(
        state,
        AnimHUD_Search, // Elements to show
        AnimHUD_Visible, // All visible elements
        AnimHUD_All, // All elements
    );
    if (state) {
        selectOnly('button-animsearch', AnimHUD_Buttons);
        document.getElementById('button-animsearch').focus();
    } else {
        elementSetClass('button-animsearch', 'selected', state);
    }
}

export function toggleAnimationConfigureHUD(state) {
    if (state == undefined)
        state = elementHasClass(AnimHUD_Configure[0], 'hidden');
    toggleSection(
        state,
        AnimHUD_Configure, // Elements to show
        AnimHUD_Visible, // All visible elements
        AnimHUD_All, // All elements
    );
    if (state) {
        selectOnly('button-animconfigure', AnimHUD_Buttons);
        document.getElementById('button-animconfigure').focus();
    } else {
        elementSetClass('button-animconfigure', 'selected', state);
    }
}

export async function searchAnimDicts(searchValue) {
    searchValue = searchValue.trim().toLowerCase();

    const maxResults = 10000;
    let el = document.getElementById('animDictList');
    el.innerHTML = '';
    el.style.minHeight = 0;

    let nameListEl = document.getElementById('animNameList');
    nameListEl.innerHTML = '';
    nameListEl.style.minHeight = 0;

    if (!searchValue || searchValue == '') return;

    const animations = await getAnimations();
    const searchLower = searchValue.toLowerCase();
    const results = [];

    for (const animDict of Object.keys(animations)) {
        if (animDict.toLowerCase().includes(searchLower)) {
            results.push(animDict);
            continue;
        }

        for (const animName of animations[animDict]) {
            if (animName.toLowerCase().includes(searchLower)) {
                results.push(animDict);
                break;
            }
        }
    }
    results.sort((a, b) => (a.animDict > b.animDict) - (a.animDict < b.animDict));

    const resultCount = results.length;
    const ul = document.createElement('ul');
    const fragment = document.createDocumentFragment();

    ul.addEventListener('click', function (event) {
        const li = event.target.closest('li'); // Ensure we clicked an `li`
        if (!li) return;

        const animDict = li.dataset.animDict;

        if (event.ctrlKey) {
            li.remove();
        } else {
            elementSetText('animSelectedDict', animDict);
            elementSetText('animSelectedName', '');
            elementSetText('animConfSelectedDict', animDict);
            elementSetText('animConfSelectedName', '');
            selectAnimDict(animDict);
        }
    });

    ul.addEventListener('mouseenter', function (event) {
        const li = event.target.closest('li');
        if (li) li.classList.add('liHover');
    }, true);

    ul.addEventListener('mouseleave', function (event) {
        const li = event.target.closest('li');
        if (li) li.classList.remove('liHover');
    }, true);

    for (let i = 0; i < resultCount && i < maxResults; ++i) {
        const animDict = results[i];
        const li = document.createElement('li');
        li.textContent = animDict; // Faster than innerHTML
        li.dataset.animDict = animDict; // Use dataset instead of closures
        li.setAttribute('tabindex', '3');
        fragment.appendChild(li);
    }

    ul.appendChild(fragment);
    el.appendChild(ul);

    el.style.minHeight = `${Math.min(resultCount * 0.4, 30)}vh`; // Ensures valid values
    el.scrollTop = 0;
    el.scrollLeft = 0;
    console.log('Searched for', searchValue, 'found results', resultCount);
}

async function selectAnimDict(animDict) {
    const animations = await getAnimations();

    // Transform animations into a sorted array
    const results = Object.values(animations[animDict])
        .map(anim => ({ anim, animDict }))
        .sort((a, b) => a.anim.localeCompare(b.anim));

    const animResults = document.getElementById('animNameList');
    animResults.innerHTML = '';

    // Create <ul> element
    const ul = document.createElement('ul');
    const fragment = document.createDocumentFragment();

    // Event Delegation for Click Handling
    ul.addEventListener('click', function(event) {
        const li = event.target.closest('li');
        if (!li) return;

        const anim = li.dataset.anim;
        if (event.shiftKey) {
            elementSetText('animSelectedName', anim);
            elementSetText('animConfSelectedName', anim);
            addAnimation();
        } else if (event.ctrlKey) {
            li.remove();
        } else {
            elementSetText('animSelectedName', anim);
            elementSetText('animConfSelectedName', anim);
            previewAnimation(animDict, anim);
        }
    });

    // Event Delegation for Hover Effects
    ul.addEventListener('mouseenter', function(event) {
        const li = event.target.closest('li');
        if (li) li.classList.add('liHover');
    }, true);

    ul.addEventListener('mouseleave', function(event) {
        const li = event.target.closest('li');
        if (li) li.classList.remove('liHover');
    }, true);

    // Generate <li> elements
    for (const { anim } of results) {
        const li = document.createElement('li');
        li.textContent = anim; // Faster and safer than innerHTML
        li.dataset.anim = anim; // Store anim in dataset
        li.setAttribute('tabindex', '4');
        fragment.appendChild(li);
    }

    ul.appendChild(fragment);
    animResults.appendChild(ul);

    // Adjust height efficiently
    const resultCount = results.length;
    animResults.style.minHeight = `${Math.min(resultCount * 0.4, 15.4)}vh`;

    // Reset scroll position properly
    animResults.scrollTop = 0;
    animResults.scrollLeft = 0; // Prevent invalid negative scroll values
}

export function addAnimation() {
    const animDict = document.getElementById('animSelectedDict').innerHTML;
    const animName = document.getElementById('animSelectedName').innerHTML;
    if (animDict == '' || animName == '') { return; }

    let el = document.getElementById('animConfigureList');
    let ul = document.getElementById('animConfigureListUl');
    if (!ul) {
        ul = document.createElement('ul');
        ul.setAttribute('id', 'animConfigureListUl');
        el.appendChild(ul);
    }
    let li = document.createElement('li');
    li.innerHTML = animDict + ' - ' + animName;
    li.setAttribute('tabindex', '13');
    li.setAttribute('id', 'anim-' + animDict + '-' + animName);
    // TODO: Make this flex box so we can have the animation settings underneath it
    li.addEventListener('click', function(event) {
        // TODO: Store and track animation info
        console.log('clicked', animDict, animName);
        if (event.ctrlKey) { ul.removeChild(li); }
    });
    ul.appendChild(li);
    li.addEventListener('mouseenter', function() {
        li.classList.add('liHover');
    });
    li.addEventListener('mouseout', function() {
        li.classList.remove('liHover');
    });
}

export function clearAnimations() {
    showConfirm("Clear all animations?").then(confirm => {
        if (confirm) {
            resetList('animConfigureList');
        } else {
            console.log("Canceled clear animations.")
        }
    })
}

function previewAnimation(animDict, anim) {
    sendClientMessage('playAnimation', { animDict: animDict, anim: anim, });
}

DropDownAdvOptions.animConfigureTaskfilter = getTaskfilterDropdowns;
function getTaskfilterDropdowns() {
    return getTaskFilters().then(taskfilters => {
        return taskfilters.map((taskfilter, index) => ({
            name: taskfilter.name.toLowerCase(),
            tooltip: taskfilter.note,
            value: taskfilter.value,
            fn: () => { return taskfilter.name.toLowerCase(); }
        }));
    });
}


function getFlagsTotal(flags) {
    console.log(flags)
    return flags.reduce((total, flag) => {
        return flag.selected ? total + flag.value : total;
    }, 0);
}


DropDownMultiOptions.animConfigureAnimFlags = {
    fetch: getAnimFlagsDropdowns,
    result: getAnimFlagsTotal,
}

function getAnimFlagsDropdowns() {
    return getAnimFlags().then(animFlags => {
        return animFlags.map((flag, index) => ({
            name: flag.name.toLowerCase(),
            tooltip: `${flag.value}: ${flag.note}`,
            value: flag.value,
            selected: flag.selected,
            fn: () => getAnimFlags().then(flags => {
                flags[index].selected = !flags[index].selected;
            })
        }));
    });
}

function getAnimFlagsTotal() {
    return getAnimFlags().then(flags => getFlagsTotal(flags));
}

DropDownMultiOptions.animConfigureAnimIKFlags = {
    fetch:  getAnimIKFlagsDropdowns,
    result: getAnimIKFlagsTotal,
}
function getAnimIKFlagsDropdowns() {
    return getAnimIKFlags().then(animFlags => {
        return animFlags.map((flag, index) => ({
            name: flag.name.toLowerCase(),
            tooltip: `${flag.value}: ${flag.note}`,
            value: flag.value,
            selected: flag.selected,
            fn: () => getAnimIKFlags().then(flags => {
                flags[index].selected = !flags[index].selected;
            })
        }));
    });
}

function getAnimIKFlagsTotal() {
    return getAnimIKFlags().then(flags => getFlagsTotal(flags));
}
