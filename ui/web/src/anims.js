import { resetList } from '../src/nav.js';
import { showConfirm } from '../src/confirm.js';
import { sendClientMessage } from '../src/msg.js';
import { DropDownAdvOptions, DropDownMultiOptions } from '../src/dropdown.js';

let selectedAnimation = null;
let confAnims = {};
const defaultConfig = {
    entity: 0,
    entityType: 'ped', // 'ped' or 'object'
    // Ped parameters
    blendin: 0.9,
    blendout: 0.9,
    duration: -1,
    rate: 0,
    flags: 0,
    ikflags: 0,
    taskfilter: false,
    // Object parameters
    loop: 0,
    stayInAnim: 0,
    delta: 0.0,
    bitset: 0,
    // Common
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
    el.scrollTop = 0;
    el.scrollLeft = 0;
    el.style.minHeight = 0;

    let nameListEl = document.getElementById('animNameList');
    nameListEl.textContent = '';
    nameListEl.scrollTop = 0;
    nameListEl.scrollLeft = 0;
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
    // animResults.style.minHeight = `${Math.min(resultCount * 0.4, 15.4)}vh`;

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

    // Create animation with default config
    const animation = {
        uid: uid,
        dict: animDict,
        name: animName,
        config: { ...defaultConfig },
    };

    // Detect entity type if entity is specified
    const entityHandle = document.getElementById('animConfigureEntity').textContent;
    if (entityHandle && entityHandle != '0') {
        animation.config.entity = entityHandle;
        // Get cached/default type immediately, update in background if needed
        animation.config.entityType = detectEntityType(entityHandle, (detectedType) => {
            animation.config.entityType = detectedType;
        });
    }

    confAnims[uid] = animation;

    let li = document.createElement('li');
    li.textContent = animDict + ' - ' + animName;
    li.dataset.animDict = animDict;
    li.dataset.animName = animName;
    li.dataset.uid = uid;
    li.setAttribute('tabindex', '13');
    li.setAttribute('id', 'anim-' + animDict + '-' + animName);
    li.addEventListener('click', function (event) {
        if (event.ctrlKey) {
            ul.removeChild(li);
            confAnims[uid] = null;
            if (selectedAnimation && selectedAnimation.uid === uid) {
                clearAnimation();
            }
        } else {
            selectAnimConfigure(li.dataset);
            for (let i = 0; i < ul.children.length; i++) {
                ul.children[i].classList.remove('selected');
            }
            li.classList.add('selected');
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
    updateAnimationConfig({ dict: '', name: '', config: defaultConfig, });
    selectedAnimation = null;
    let animListConfigureList = document.getElementById('animConfigureListUl');
    animListConfigureList.querySelectorAll('.selected')
        .forEach(el => el.classList.remove('selected'));
}

export function resetSelectedAnimConfig() {
    // Reset the selected animations config
    if (!selectedAnimation) { return; }
    const animation = confAnims[selectedAnimation.uid];
    if (!animation) { return; }
    animation.config = { ...defaultConfig };
    updateAnimationConfig(animation);
}

export function deleteAllAnimations() {
    showConfirm('Delete all configured animations?').then(confirm => {
        if (confirm) {
            clearAnimation();
            resetList('animListConfigureList');
            confAnims = {};
            console.log('Removed all animation configurations.');
        } else {
            console.log('Canceled delete all animations.');
        }
    });
}

function previewAnimation(dict, name) {
    sendClientMessage('playAnimation', { dict: dict, name: name, config: {}, });
}

DropDownAdvOptions.animConfigureTaskfilter = () => {
    const anim = selectedAnimation;
    return getTaskFilters().then(taskfilters => {
        return taskfilters.map(taskfilter => ({
            name: taskfilter.name.toLowerCase(),
            tooltip: taskfilter.note,
            value: anim === null ? false : anim.config.taskfilter,
            fn: () => {
                if (anim === null) { return; }
                anim.config.taskfilter = taskfilter.value;
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
    updateAnimationConfig(animation);
    document.getElementById('animConfigureRightColumn').classList.remove('hidden');
}

function getTaskFilterName(value) {
    const match = getTaskFilters().find(entry => entry.value === value);
    return match ? match.name : value;
}

function toggleAnimParamsByEntityType(entityType) {
    const pedParams = document.querySelectorAll('.anim-ped-params');
    const objectParams = document.querySelectorAll('.anim-object-params');

    if (entityType === 'object') {
        pedParams.forEach(el => el.classList.add('hidden'));
        objectParams.forEach(el => el.classList.remove('hidden'));
    } else {
        pedParams.forEach(el => el.classList.remove('hidden'));
        objectParams.forEach(el => el.classList.add('hidden'));
    }
}

// Cache entity types to avoid repeated lookups
const entityTypeCache = new Map();

function detectEntityType(entityHandle, callback) {
    if (!entityHandle || entityHandle == 0) {
        return 'ped'; // Default to ped if no entity specified
    }

    // Check cache first
    if (entityTypeCache.has(entityHandle)) {
        return entityTypeCache.get(entityHandle);
    }

    // Fetch in background and call callback when done
    sendClientMessage('getEntityType', { entity: entityHandle })
        .then(result => {
            const entityType = result.entityType || 'ped';
            entityTypeCache.set(entityHandle, entityType);
            if (callback) callback(entityType);
        })
        .catch(e => {
            console.warn('Failed to detect entity type:', e);
            const defaultType = 'ped';
            entityTypeCache.set(entityHandle, defaultType);
            if (callback) callback(defaultType);
        });

    // Return default immediately (will update via callback if different)
    return 'ped';
}

function updateAnimationConfig(animation) {
    document.getElementById('animConfigureDict').textContent = animation.dict;
    document.getElementById('animConfigureName').textContent = animation.name;
    document.getElementById('animConfigureEntity').textContent = animation.config.entity;

    // Update ped parameters
    document.getElementById('animConfigureBlendIn').textContent = animation.config.blendin;
    document.getElementById('animConfigureBlendOut').textContent = animation.config.blendout;
    document.getElementById('animConfigureDuration').textContent = animation.config.duration;
    document.getElementById('animConfigureRate').textContent = animation.config.rate;
    document.getElementById('animConfigureAnimFlags').textContent = animation.config.flags;
    document.getElementById('animConfigureAnimIKFlags').textContent = animation.config.ikflags;

    // Update object parameters
    document.getElementById('animConfigureLoop').textContent = animation.config.loop;
    document.getElementById('animConfigureStayInAnim').textContent = animation.config.stayInAnim;
    document.getElementById('animConfigureDelta').textContent = animation.config.delta;
    document.getElementById('animConfigureBitset').textContent = animation.config.bitset;

    // Update common parameters
    document.getElementById('animConfigureDelay').textContent = animation.config.delay;

    getTaskFilters().then(taskFilters => {
        const match = taskFilters.find(entry => entry.value === animation.config.taskfilter);
        document.getElementById('animConfigureTaskfilter').textContent = match ? match.name.toLowerCase() : animation.config.taskfilter;
    });

    // Toggle visibility based on entity type
    toggleAnimParamsByEntityType(animation.config.entityType);
}

export function setSelectedAnimation(key, value) {
    const animation = confAnims[selectedAnimation.uid];
    selectedAnimation.config[key] = value;
}

export function updateSelectedAnimationEntity(entityHandle) {
    if (!selectedAnimation) return;

    const animation = confAnims[selectedAnimation.uid];
    animation.config.entity = entityHandle;

    // Detect entity type (returns cached or default immediately)
    const entityType = detectEntityType(entityHandle, (detectedType) => {
        // Callback updates UI if type changed
        if (animation.config.entityType !== detectedType) {
            animation.config.entityType = detectedType;
            toggleAnimParamsByEntityType(detectedType);
        }
    });

    // Update immediately with cached/default value
    animation.config.entityType = entityType;
    toggleAnimParamsByEntityType(entityType);
}

export function playConfiguredAnimations() {
    sendClientMessage('playAnimations', { animations: confAnims });
}

export function stopAnimation() {
    sendClientMessage('stopAnimation', {});
}

export function playSelectedAnimation() {
    const anim = selectedAnimation;
    if (!anim) { return; }
    sendClientMessage('playAnimation', anim);
}
