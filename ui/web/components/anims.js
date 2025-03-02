import { resetList } from '../utils/nav.js';
import { showConfirm } from './confirm.js';
import { sendClientMessage } from '../utils/msg.js';
import { DropDownAdvOptions, DropDownMultiOptions } from './dropdown.js';

let selectedAnimation = null;
let confAnims = {};
const defaultConfig = {
    entity: 0,
    blendIn: 0.0,
    blendOut: 0.0,
    duration: 0,
    rate: 0.0,
    flags: 0,
    ikflags: 0,
    taskfilter: 'None',
    delay: 0,
}

async function fetchData(key, messageType, modifier) {
    if (!globalThis[key]) {
        const resp = await sendClientMessage(messageType, {});
        let data = JSON.parse(resp[key.toLowerCase()]);

        if (modifier && typeof modifier === 'function') {
            modifier(data);
        }
        globalThis[key] = data;
    }
    return globalThis[key];
}

function addSelected(data) {
    data.forEach(item => {
        item.selected = false;
    });
}

export function getAnimations() {
    return fetchData('Animations', 'initAnims');
}
export function getAnimFlags() {
    return fetchData('AnimFlags', 'initAnimFlags', addSelected);
}
export function getAnimIKFlags() {
    return fetchData('AnimIKFlags', 'initIKAnimFlags', addSelected);
}
export function getTaskFilters() {
    return fetchData('TaskFilters', 'initTaskFilters');
}

function deepSearch(animations, search) {
    const results = [];
    const searchLower = search.toLowerCase();

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

    return results;
}

export async function searchAnimDicts(searchValue) {
    const maxResults = 10000;
    let el = document.getElementById('animDictList');
    el.textContent = '';
    el.style.minHeight = 0;

    let nameListEl = document.getElementById('animNameList');
    nameListEl.textContent = '';
    nameListEl.style.minHeight = 0;

    searchValue = searchValue.trim().toLowerCase();
    if (!searchValue || searchValue == '') return;
    const results = deepSearch(await getAnimations(), searchValue).sort();

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
            document.getElementById('animSelectedDict').textContent = animDict;
            document.getElementById('animSelectedName').textContent = '';
            document.getElementById('animConfSelectedDict').textContent = animDict;
            document.getElementById('animSearchDict').value = animDict;
            selectAnimDict(animDict);
        }
    });

    ul.addEventListener(
        'mouseenter',
        function (event) {
            const li = event.target.closest('li');
            if (li) li.classList.add('li-hover');
        },
        true
    );

    ul.addEventListener(
        'mouseleave',
        function (event) {
            const li = event.target.closest('li');
            if (li) li.classList.remove('li-hover');
        },
        true
    );

    for (let i = 0; i < resultCount && i < maxResults; ++i) {
        const animDict = results[i];
        const li = document.createElement('li');
        li.textContent = animDict;
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
    animResults.textContent = '';

    // Create <ul> element
    const ul = document.createElement('ul');
    const fragment = document.createDocumentFragment();

    // Event Delegation for Click Handling
    ul.addEventListener('click', function (event) {
        const li = event.target.closest('li');
        if (!li) return;

        const anim = li.dataset.anim;
        if (event.shiftKey) {
            document.getElementById('animSelectedName').textContent = anim;
            document.getElementById('animConfSelectedName').textContent = anim;
            addAnimation();
        } else if (event.ctrlKey) {
            li.remove();
        } else {
            document.getElementById('animSelectedName').textContent = anim;
            document.getElementById('animConfSelectedName').textContent = anim;
            previewAnimation(animDict, anim);
        }
    });

    // Event Delegation for Hover Effects
    ul.addEventListener(
        'mouseenter',
        function (event) {
            const li = event.target.closest('li');
            if (li) li.classList.add('li-hover');
        },
        true
    );

    ul.addEventListener(
        'mouseleave',
        function (event) {
            const li = event.target.closest('li');
            if (li) li.classList.remove('li-hover');
        },
        true
    );

    // Generate <li> elements
    for (const { anim } of results) {
        const li = document.createElement('li');
        li.textContent = anim;
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
    const animDict = document.getElementById('animSelectedDict').textContent;
    const animName = document.getElementById('animSelectedName').textContent;
    if (animDict == '' || animName == '') {
        return;
    }

    let el = document.getElementById('animListConfigureList');
    let ul = document.getElementById('animConfigureListUl');
    if (!ul) {
        ul = document.createElement('ul');
        ul.setAttribute('id', 'animConfigureListUl');
        el.appendChild(ul);
    }

    const uid = `${animDict}-${animName}-${Date.now()}`;

    const animation = {
        uid: uid,
        dict: animDict,
        name: animName,
        config: { ...defaultConfig },
    };
    console.log(animation);
    confAnims[uid] = animation;

    let li = document.createElement('li');
    li.textContent = animDict + ' - ' + animName;
    li.dataset.animDict = animDict;
    li.dataset.animName = animName;
    li.dataset.uid = uid;
    li.setAttribute('tabindex', '13');
    li.setAttribute('id', 'anim-' + animDict + '-' + animName);
    li.addEventListener('click', function (event) {
        selectAnimConfigure(li.dataset);
        if (event.ctrlKey) {
            ul.removeChild(li);
        }
    });
    ul.appendChild(li);
    li.addEventListener('mouseenter', function () {
        li.classList.add('li-hover');
    });
    li.addEventListener('mouseout', function () {
        li.classList.remove('li-hover');
    });
}

export function clearAnimation() {
    document.getElementById('animConfigureRightColumn').classList.add('hidden');
    updateAnimationConfigure({ dict: '', name: '', config: defaultConfig, });
    selectedAnimation = null;
}

export function deleteAllAnimations() {
    showConfirm('Delete all configured animations?').then(confirm => {
        if (confirm) {
            clearAnimation();
            resetList('animListConfigureList');
        } else {
            console.log('Canceled delete all animations.');
        }
    });
}

function previewAnimation(animDict, anim) {
    sendClientMessage('playAnimation', { animDict: animDict, anim: anim });
}

DropDownAdvOptions.animConfigureTaskfilter = () => {
    const anim = selectedAnimation;
    return getTaskFilters().then(taskfilters => {
        return taskfilters.map(taskfilter => ({
            name: taskfilter.name.toLowerCase(),
            tooltip: taskfilter.note,
            value: anim === null ? 'None' : anim.config.taskfilter,
            fn: () => {
                if (anim === null) { return; }
                anim.config.taskfilter = taskfilter.name.toLowerCase();
            },
        }));
    });
}

function getFlagsTotal(flags) {
    return flags.reduce((total, flag) => {
        return flag.selected ? total + flag.value : total;
    }, 0);
}



DropDownMultiOptions.animConfigureAnimFlags = {
    result: () => getAnimFlags().then(flags => getFlagsTotal(flags)),
    fetch: () => {
        return getAnimFlags().then(animFlags => {
            const anim = selectedAnimation;
            return animFlags.map((flag, index) => ({
                name: flag.name.toLowerCase(),
                tooltip: `${flag.value}: ${flag.note}`,
                value: flag.value,
                click: () => {
                    const el = document.getElementById('animConfigureAnimFlags');
                    const cur = el.textContent;
                    el.textContent = cur ^ flag.value;
                },
                selected: (anim.config.flags & flag.value) === flag.value,
                fn: () => getAnimFlags().then(flags => {
                    if (anim === null) { return; }
                    anim.config.flags ^= flag.value;
                    document.getElementById('animConfigureAnimFlags').textContent = anim.config.flags;
                }),
            }));
        });
    },
};

DropDownMultiOptions.animConfigureAnimIKFlags = {
    result: () => getAnimIKFlags().then(flags => getFlagsTotal(flags)),
    fetch: () => {
        return getAnimIKFlags().then(animFlags => {
            const anim = selectedAnimation;
            return animFlags.map((flag, index) => ({
                name: flag.name.toLowerCase(),
                tooltip: `${flag.value}: ${flag.note}`,
                value: flag.value,
                click: () => {
                    const el = document.getElementById('animConfigureAnimIKFlags');
                    const cur = el.textContent;
                    el.textContent = cur ^ flag.value;
                },
                selected: (anim.config.ikflags & flag.value) === flag.value,
                fn: () => getAnimIKFlags().then(flags => {
                    if (anim === null) { return; }
                    anim.config.ikflags ^= flag.value;
                    document.getElementById('animConfigureAnimIKFlags').textContent = anim.config.ikflags;
                }),
            }));
        });
    },
};

function selectAnimConfigure(data) {
    const animation = confAnims[data.uid];
    selectedAnimation = animation;
    updateAnimationConfigure(animation);
    document.getElementById('animConfigureRightColumn').classList.remove('hidden');
}

function updateAnimationConfigure(animation) {
    document.getElementById('animConfigureDict').textContent = animation.dict;
    document.getElementById('animConfigureName').textContent = animation.name;
    document.getElementById('animConfigureEntity').textContent = animation.config.entity;
    document.getElementById('animConfigureBlendIn').textContent = animation.config.blendIn;
    document.getElementById('animConfigureBlendOut').textContent = animation.config.blendOut;
    document.getElementById('animConfigureDuration').textContent = animation.config.duration;
    document.getElementById('animConfigureRate').textContent = animation.config.rate;

    // TODO: fill out selected dropdowns
    document.getElementById('animConfigureAnimFlags').textContent = animation.config.flags;
    document.getElementById('animConfigureAnimIKFlags').textContent = animation.config.ikflags;
    document.getElementById('animConfigureTaskfilter').textContent = animation.config.taskfilter;

    document.getElementById('animConfigureDelay').textContent = animation.config.delay;
}

export function setSelectedAnimation(key, value) {
    const animation = confAnims[selectedAnimation.uid];
    selectedAnimation.config[key] = value;
}
