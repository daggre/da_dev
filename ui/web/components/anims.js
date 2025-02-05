import { KeyActions, showConfirm } from '../script.js';
import { sendClientMessage } from '../utils/msg.js';
import { selectOnly, resetList, isVisible, elementSetClass, elementHasClass, elementSetText, toggleSection } from '../utils/nav.js';

let Animations = {};
let IKFlagTotals = 0;
let FlagTotals = 0;
const Flags = {
    LOOP: 1,
    UPPERBODY: 8,
    SECONDARY: 16,
    TOTAL: 32,
}
let TaskFilter = false;

const AnimHUD_All = [
    'animHelp',
    'animHUDControls',

    'animSearchLeftColumn',
    'animSearchDict',
    'animSearchName',
    'animSearchField',
    'animDictList',
    'animNameList',

    'animConfigureLeftColumn',
    'animConfigureOptions',
    'animConfigureList',
    'animConfigureDict',
    'animConfigureName',
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
    'animConfigureLeftColumn',
    'animConfigureOptions',
    'animConfigureList',
    'animConfigureDict',
    'animConfigureName',
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

export function initAnims() {
    sendClientMessage('initAnims', {}).then(function(resp) {
        Animations = JSON.parse(resp.animations);
    });

    sendClientMessage('initAnimFlags', {}).then(function(resp) {
        let flagList = document.getElementById('animFlagsOptions');
        let ul = document.createElement('ul');

        const flags = JSON.parse(resp.flags);
        flags.forEach(flag => {
            let flagLabel = document.createElement('div');
            flagLabel.classList.add('check', 'label', 'borderright', 'bgi');
            flagLabel.innerHTML = flag.name;

            let flagField = document.createElement('div');
            flagField.classList.add('check', 'entry', 'borderright', 'bgt1');
            flagField.setAttribute('id', 'flag-' + flag.value);
            flagField.setAttribute('tabindex', '5');
            flagField.setAttribute('role', 'button');
            flagField.setAttribute('aria-pressed', 'false');
            flagField.setAttribute('onclick', 'toggleFlag(' + flag.value + ')');

            let li = document.createElement('li');
            li.appendChild(flagLabel);
            li.appendChild(flagField);
            ul.appendChild(li);
        });

        let flagLabel = document.createElement('div');
        flagLabel.classList.add('check', 'label', 'borderright', 'bgi');
        flagLabel.innerHTML = 'TOTAL';

        let flagField = document.createElement('div');
        flagField.classList.add('check', 'entry', 'borderright', 'bgt1');
        flagField.setAttribute('id', 'flagTotals');
        flagField.innerHTML = '0';

        let li = document.createElement('li');
        li.appendChild(flagLabel);
        li.appendChild(flagField);
        ul.appendChild(li);
        flagList.appendChild(ul);
    });

    sendClientMessage('initIKAnimFlags', {}).then(function(resp) {
        let flagList = document.getElementById('animIKFlagsOptions');
        let ul = document.createElement('ul');

        const flags = JSON.parse(resp.flags);
        flags.forEach(flag => {
            let flagLabel = document.createElement('div');
            flagLabel.classList.add('check', 'label', 'borderright', 'bgi');
            flagLabel.innerHTML = flag.name;

            let flagField = document.createElement('div');
            flagField.classList.add('check', 'entry', 'borderright', 'bgt1');
            flagField.setAttribute('id', 'ikflag-' + flag.value);
            flagField.setAttribute('tabindex', '4');
            flagField.setAttribute('role', 'button');
            flagField.setAttribute('aria-pressed', 'false');
            flagField.setAttribute('onclick', 'toggleIKFlag(' + flag.value + ')');

            let li = document.createElement('li');
            li.appendChild(flagLabel);
            li.appendChild(flagField);
            ul.appendChild(li);
        });


        let flagLabel = document.createElement('div');
        flagLabel.classList.add('check', 'label', 'borderright', 'bgi');
        flagLabel.innerHTML = 'TOTAL';

        let flagField = document.createElement('div');
        flagField.classList.add('check', 'entry', 'borderright', 'bgt1');
        flagField.setAttribute('id', 'IKFlagTotals');
        flagField.innerHTML = '0';

        let li = document.createElement('li');
        li.appendChild(flagLabel);
        li.appendChild(flagField);
        ul.appendChild(li);
        flagList.appendChild(ul);
    });

    sendClientMessage('initTaskFilters', {}).then(function(resp) {
        let taskList = document.getElementById('animTaskFilterOptions');
        let ul = document.createElement('ul');

        const taskFilters = JSON.parse(resp.taskFilters);
        taskFilters.forEach((taskFilter, index) => {
            let taskLabel = document.createElement('div');
            taskLabel.classList.add('check', 'label', 'borderright', 'bgi');
            taskLabel.innerHTML = taskFilter;

            let taskField = document.createElement('div');
            taskField.classList.add('check', 'entry', 'taskFilter', 'borderright', 'bgt1');
            taskField.setAttribute('id', 'task-' + index);
            taskField.setAttribute('tabindex', '5');
            taskField.setAttribute('role', 'button');
            taskField.setAttribute('aria-pressed', 'false');
            taskField.onclick = function() { toggleTaskFilter(index, taskFilter); };

            let li = document.createElement('li');
            li.appendChild(taskLabel);
            li.appendChild(taskField);
            ul.appendChild(li);
        });
        taskList.appendChild(ul);
    });
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
        li.addEventListener('click', function(event) {
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
        li.addEventListener('click', function(event) {
            let updateAnim = true
            if (event.shiftKey) {
                addAnimation();
            } else if (event.ctrlKey) {
                updateAnim = false;
                ul.removeChild(li);
            } else {
                togglePlay(true);
            }
            if (updateAnim) {
                elementSetText('animSelectedName', anim);
                elementSetText('animConfSelectedName', anim);
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
    li.setAttribute('id', 'anim-' + animDict + '-' + animName);
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
    elementSetClass(`flag-${flag}`, 'selected')

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

