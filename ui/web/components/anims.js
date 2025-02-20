import {
    KeyActions,
    showConfirm,
    toUint32,
} from '../script.js';
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

async function fetchData(key, messageType) {
    if (!globalThis[key]) {
        const resp = await sendClientMessage(messageType, {});
        globalThis[key] = JSON.parse(resp[key.toLowerCase()]);
    }
    return globalThis[key];
}

export function getAnimations() { return fetchData('Animations', 'initAnims'); }
export function getAnimFlags() { return fetchData('AnimFlags', 'initAnimFlags'); }
export function getAnimIKFlags() { return fetchData('AnimIKFlags', 'initIKAnimFlags'); }
export function getTaskFilters() { return fetchData('TaskFilters', 'initTaskFilters'); }

// const Flags = {
//     LOOP: 1,
//     UPPERBODY: 8,
//     SECONDARY: 16,
//     TOTAL: 32,
// }
// let TaskFilter = false;

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

function toggleTaskFilter(taskFilterIndex, taskFilter) {
    let el = document.getElementById('task-' + taskFilterIndex);
    let selected = el.classList.contains('selected');

    const allTaskFilters = document.querySelectorAll('.taskFilter');
    allTaskFilters.forEach(filter => filter.classList.remove('selected'));

    if (!selected) {
        el.classList.add('selected');
        TaskFilter = taskFilter;
    } else {
        TaskFilter = false;
    }
}

export function searchAnimDicts(searchValue) {
    searchValue = searchValue.trim().toLowerCase();

    const maxResults = 10000;
    let results = [];
    let el = document.getElementById('animDictList');
    el.innerHTML = '';
    el.style.minHeight = 0;

    let nameListEl = document.getElementById('animNameList');
    nameListEl.innerHTML = '';
    nameListEl.style.minHeight = 0;

    if (!searchValue || searchValue == '') return;

    Object.keys(Animations).forEach(animDict => {
        if (animDict.toLowerCase().includes(searchValue)) {
            results.push({ animDict: animDict });
        } else {
            Animations[animDict].every(animName => {
                if (animName.toLowerCase().includes(searchValue)) {
                    results.push({ animDict: animDict });
                    return false;
                }
                return true;
            });
        }
    });

    results.sort(function(a, b) {
        if (a.animDict < b.animDict) {
            return -1;
        }
        if (a.animDict > b.animDict) {
            return 1;
        }
        return 0;
    });

    let ul = document.createElement('ul');
    for (let i=0; i < results.length && i < maxResults; ++i) {
        const animDict = results[i].animDict;
        let li = document.createElement('li');
        li.setAttribute('tabindex', '3');
        li.addEventListener('click', function(event) {
            console.log('clicked', animDict, event);
            if (event.ctrlKey) {
                ul.removeChild(li);
            } else {
                elementSetText('animSelectedDict', animDict);
                elementSetText('animSelectedName', '');
                elementSetText('animConfSelectedDict', animDict);
                elementSetText('animConfSelectedName', '');
                selectAnimDict(animDict);
            }

        })
        li.addEventListener('mouseenter', function() {
            li.classList.add('liHover');
        });
        li.addEventListener('mouseout', function() {
            li.classList.remove('liHover');
        });
        li.innerHTML = animDict;
        ul.appendChild(li);
    }
    el.appendChild(ul);
    if (results.length < 30) {
        el.style.minHeight = results.length + '.4vh';
    } else {
        el.style.minHeight = '30vh';
    }
    el.scrollTop = 0;
    el.scrollLeft = -1000;
    console.log('searched for', searchValue, 'found results', results.length);
}

function selectAnimDict(animDict) {
    let results = [];
    Object.values(Animations[animDict]).forEach(anim => {
        results.push({
            anim: anim,
            animDict: animDict,
        });
    });

    results.sort(function(a, b) {
        if (a.anim < b.anim) { return -1; }
        if (a.anim > b.anim) { return 1; }
        return 0;
    });

    let animResults = document.getElementById('animNameList');
    animResults.innerHTML = '';
    let ul = document.createElement('ul');
    for (let i=0; i < results.length; ++i) {
        const anim = results[i].anim;
        let li = document.createElement('li');
        elementSetText(li, animDict);
        li.innerHTML = anim;
        li.setAttribute('tabindex', '4');
        li.addEventListener('click', function(event) {
            if (event.shiftKey) {
                elementSetText('animSelectedName', anim);
                elementSetText('animConfSelectedName', anim);
                addAnimation();
            } else if (event.ctrlKey) {
                ul.removeChild(li);
            } else {
                console.log("choose anim", animDict, anim);
                elementSetText('animSelectedName', anim);
                elementSetText('animConfSelectedName', anim);
                previewAnimation(animDict, anim);
            }
        });
        li.addEventListener('mouseenter', function() {
            li.classList.add('liHover');
        });
        li.addEventListener('mouseout', function() {
            li.classList.remove('liHover');
        });
        ul.appendChild(li);
    }
    animResults.appendChild(ul);
    if (results.length < 15) {
        animResults.style.minHeight = results.length + '.4vh';
    } else {
        animResults.style.minHeight = '15.4vh';
    }
    animResults.scrollTop = 0;
    animResults.scrollLeft = -1000;
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

export function playAnimation() {
    const animDict = document.getElementById('activeAnimDict').innerHTML;
    const anim = document.getElementById('activeAnimName').innerHTML;
    if (anim == '' || animDict == '') { return; }
    const entity = document.getElementById('animEntityField').innerHTML;
    const blendIn = document.getElementById('timingBlendIn').innerHTML;
    const blendOut = document.getElementById('timingBlendOut').innerHTML;
    const playback = document.getElementById('timingPlayback').innerHTML;
    const duration = document.getElementById('timingDuration').innerHTML;
    sendClientMessage('playAnim', {
        entity: entity,
        animDict: animDict,
        animName: anim,
        blendInSpeed: blendIn,
        blendOutSpeed: blendOut,
        playbackRate: playback,
        duration: duration,
        flag: FlagTotals,
        ikFlag: IKFlagTotals,
        taskFilter: TaskFilter,
    });
}

export function toggleFlag(flag) {
    let flagTotals = 0;
    // elementSetClass(`flag-${flag}`, 'selected')

    for (let i=0; i < Flags.TOTAL; i++) {
        let value = toUint32(1 << i);
        if (isSelected(`flag-${value}`)) {
            flagTotals += value;
        }
    }
    FlagTotals = flagTotals;
    const flagTotalsElement = document.getElementById('flagTotals');
    if (flagTotalsElement) { flagTotalsElement.innerHTML = flagTotals; }

    updateSpecialFlagSelections(flag);
}

function updateSpecialFlagSelections(flag) {
    switch(flag) {
        case Flags.LOOP:
            elementSetClass('button-repeat', 'selected', isSelected(`flag-${Flags.LOOP}`));
            break;
        case Flags.UPEPRBODY:
        case Flags.SECONDARY:
            const torsoSelected =
                isSelected(`flag-${Flags.UPPERBODY}`) &&
                isSelected(`flag-${Flags.SECONDARY}`);
            elementSetClass('button-torso', 'selected', torsoSelected);
            break;
    }
}

export function toggleIKFlag(flag) {
    let el = document.getElementById('ikflag-' + flag);
    el.classList.toggle('selected');

    IKFlagTotals = 0;
    for (let i=0; i < 31 ; i++) {
        let v = toUint32(1 << i);
        if (document.getElementById('ikflag-' + v).classList.contains('selected')) {
            IKFlagTotals += v;
        }
    }
    document.getElementById('IKFlagTotals').innerHTML = IKFlagTotals;
}

function previewAnimation(animDict, anim) {
    sendClientMessage('playAnimation', { animDict: animDict, anim: anim, });
}

export function togglePlay(state) {
    // if (elementSetClass('button-play', 'selected', state)) {
    //     setTimeout(function() { elementSetClass('button-play', 'selected', false); }, 200);
    // } else { return; }
    playAnimation();
}

export function toggleStop(state) {
    if (elementSetClass('button-stop', 'selected', state)) {
        setTimeout(function() { elementSetClass('button-stop', 'selected', false); }, 200);
    }
    togglePlay(false);
    sendClientMessage('stopAnim', {});
}

export function toggleLoop() { toggleFlag(1); }

export function toggleTorso(state) {
    const flag8 = isSelected('flag-8');
    const flag16 = isSelected('flag-16');

    if (elementSetClass('button-torso', 'selected', state)) {
        if (!flag8) { toggleFlag(8); }
        if (!flag16) { toggleFlag(16); }
    } else {
        if (flag8) { toggleFlag(8); }
        if (flag16) { toggleFlag(16); }
    }
}

export async function getTaskfilterDropdowns() {
    let tf_out = {}
    const taskfilters = await getTaskFilters();
    taskfilters.forEach((taskFilter, index) => {
        let key = taskFilter === "" ? "None" : taskFilter;
        tf_out[key] = () => console.log(taskFilter, index);
    });
    return tf_out
}

export async function getAnimFlagsDropdowns() {
    let flags_out = {}
    const animFlags = await getAnimFlags();
    animFlags.forEach((flag, index) => {
        let bitvalue = toUint32(1 << flag.value);
        let name = flag.name.toLowerCase();
        flags_out[name] = {
            name: name,
            tooltip: `${flag.name}: ${bitvalue}`,
            fn: () => { return bitvalue },
        }
    });
    return flags_out
}

export async function getAnimIKFlagsDropdowns() {
    let flags_out = {}
    const animIKFlags = await getAnimIKFlags();
    animIKFlags.forEach((flag, index) => {
        let bitvalue = toUint32(1 << flag.value);
        let name = flag.name.toLowerCase();
        flags_out[name] = {
            name: name,
            tooltip: `${flag.name}: ${bitvalue}`,
            fn: () => { return bitvalue },
        }
    });
    return flags_out
}
