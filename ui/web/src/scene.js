import { clipboardCopy } from '../src/clipboard.js';
import { resetList, isVisible } from '../src/nav.js';
import { showConfirm } from '../src/confirm.js';
import { sendClientMessage } from '../src/msg.js';
import { MouseDown, trackHandleHover, trackHandleClick } from '../src/events.js';
import { Settings } from '../src/settings.js';

let SceneObjectsLoopRunning = false;
let DefaultScene = 'default';
export let ActiveScene = DefaultScene;

// Scenes with a load in flight. Drives the optimistic "loading" row and stops a
// second click from kicking off (and duplicating) a load already underway.
const loadingScenes = new Set();
// Names of scenes currently resident in the world, kept in sync from scenesList
// so loadSceneByName can tell "load" from "just focus" at click time.
const loadedSceneNames = new Set();

// Refresh the multi-scene status views (no-ops on whichever list is hidden).
function refreshSceneViews() {
    getScenes();
    getLoadedScenes();
    renderFocusedScene();
}

// Load + focus a saved scene. Optimistically marks it "loading" in the lists,
// guards against double-loading, and refreshes once the load resolves.
function loadSceneByName(name) {
    if (!name || loadingScenes.has(name)) return;

    ActiveScene = name;
    document.getElementById('selectedScene').textContent = name;
    sendClientMessage('setActiveScene', { scene: name });

    // Already resident in the world? Just focus it — no reload, no flicker.
    if (loadedSceneNames.has(name)) {
        refreshSceneViews();
        return;
    }

    loadingScenes.add(name);
    refreshSceneViews(); // re-render so the "loading" row appears immediately
    sendClientMessage('loadScene', { scene: name }).then(() => {
        loadingScenes.delete(name);
        refreshSceneViews();
    });
}

export function saveScene() {
    const newSceneName = document.getElementById('selectedScene').textContent;
    sendClientMessage('saveScene', { scene: newSceneName }).then(() => {
        ActiveScene = newSceneName;
        sendClientMessage('setActiveScene', { scene: newSceneName });
        refreshSceneViews();
    });
}

export function clearScene() {
    const sceneName = ActiveScene;
    showConfirm(
        `Unload scene '${sceneName}' objects?<br>Unsaved changes will be lost.`
    ).then(confirm => {
            if (confirm) {
                sendClientMessage('clearScene', { scene: sceneName }).then(() => {
                    trackSceneObjects();
                    refreshSceneViews();
                });
            } else {
                console.log('Clear scene cancelled');
            }
        });
}

export function clearAllScenes() {
    showConfirm(
        `Unload all scenes objects?<br>Unsaved changes will be lost.`
    ).then(confirm => {
            if (confirm) {
                sendClientMessage('clearAllScenes', {}).then(() => {
                    trackSceneObjects();
                    refreshSceneViews();
                });
            } else {
                console.log('Clear all scenes cancelled');
            }
        });
}

export function reloadScene() {
    const sceneName = ActiveScene;
    sendClientMessage('reloadScene', { scene: sceneName }).then(() => {
        trackSceneObjects();
        refreshSceneViews();
    });
}

export function deleteScene() {
    const sceneName = ActiveScene;
    showConfirm(
        `This action cannot be undone!<br>Delete scene '${sceneName}'?`
    ).then(confirm => {
        if (confirm) {
            sendClientMessage('deleteScene', { scene: sceneName }).then(() => {
                ActiveScene = DefaultScene;
                document.getElementById('selectedScene').textContent = ActiveScene;
                sendClientMessage('setActiveScene', { scene: ActiveScene });
                refreshSceneViews();
            });
        } else {
            console.log('Delete scene cancelled');
        }
    });
}

// Build a scene list row: name + dim object-count badge + optional unsaved dot.
// `countKey` picks which count to show — 'count' (live objects) or 'savedCount'
// (persisted total, retained while unloaded).
function buildSceneRow(scene, { dirty = false, countKey = 'count' } = {}) {
    const li = document.createElement('li');
    li.setAttribute('tabindex', '14');
    li.dataset.sceneName = scene.name;

    const name = document.createElement('span');
    name.className = 'scene-name';
    name.textContent = scene.name;
    li.appendChild(name);

    const loading = scene.loading || loadingScenes.has(scene.name);
    const count = document.createElement('span');
    count.className = 'scene-count';
    if (loading) {
        count.classList.add('scene-loading');
        count.textContent = 'loading';
    } else {
        const n = scene[countKey] != null ? scene[countKey] : scene.count;
        count.textContent = n != null ? n : '';
    }
    li.appendChild(count);

    if (!loading && dirty && scene.dirty) {
        const dot = document.createElement('span');
        dot.className = 'scene-dirty';
        dot.title = 'Unsaved changes';
        dot.textContent = '●';
        li.appendChild(dot);
    }
    return li;
}

function addListHoverDelegation(ul) {
    ul.addEventListener('mouseenter', event => {
        const li = event.target.closest('li');
        if (li) li.classList.add('li-hover');
    }, true);
    ul.addEventListener('mouseleave', event => {
        const li = event.target.closest('li');
        if (li) li.classList.remove('li-hover');
    }, true);
}

// Saved scenes list (scenes tab): every persisted/in-memory scene. Click loads
// and focuses it. Loaded scenes are marked with li-select.
export function getScenes() {
    const el = document.getElementById('objScenesList');
    resetList(el);

    sendClientMessage('scenesList', {}).then(resp => {
        const sceneList = JSON.parse(resp.scenes).sort((a, b) =>
            a.name.localeCompare(b.name)
        );

        const ul = document.createElement('ul');
        const fragment = document.createDocumentFragment();

        sceneList.forEach(scene => {
            // saved list shows the persisted total (retained while unloaded)
            const li = buildSceneRow(scene, { countKey: 'savedCount' });
            if (scene.loaded) li.classList.add('li-select');
            fragment.appendChild(li);
        });

        ul.appendChild(fragment);
        el.appendChild(ul);

        addListHoverDelegation(ul);

        ul.addEventListener('click', event => {
            const li = event.target.closest('li');
            if (!li) return;
            loadSceneByName(li.dataset.sceneName);
        });

        el.style.minHeight = `${Math.min(sceneList.length * 0.3, 4.9)}vh`;
    });
}

// Loaded scenes list (scenes tab): only in-memory/loaded scenes, with their
// object count and an unsaved-changes dot. Click focuses the scene and jumps to
// the objects tab to browse it.
export function getLoadedScenes() {
    const el = document.getElementById('objLoadedScenesList');
    if (!el) return;
    resetList(el);

    sendClientMessage('scenesList', {}).then(resp => {
        // "loaded" = resident in the world now: the active/default working scene
        // plus anything materialized from a save.
        const loaded = JSON.parse(resp.scenes).filter(s => s.active);

        // keep the loaded-name index in sync for loadSceneByName's focus/load test
        loadedSceneNames.clear();
        loaded.forEach(s => loadedSceneNames.add(s.name));

        // include scenes mid-load that aren't resident server-side yet, so the
        // optimistic "loading" row shows the instant the user clicks.
        loadingScenes.forEach(name => {
            if (!loaded.some(s => s.name === name)) {
                loaded.push({ name, loading: true });
            }
        });
        loaded.sort((a, b) => a.name.localeCompare(b.name));

        const ul = document.createElement('ul');
        const fragment = document.createDocumentFragment();

        loaded.forEach(scene => {
            const li = buildSceneRow(scene, { dirty: true });
            if (scene.name === ActiveScene) li.classList.add('li-select');
            fragment.appendChild(li);
        });

        ul.appendChild(fragment);
        el.appendChild(ul);

        addListHoverDelegation(ul);

        ul.addEventListener('click', event => {
            const li = event.target.closest('li');
            if (!li) return;
            ActiveScene = li.dataset.sceneName;
            document.getElementById('selectedScene').textContent = ActiveScene;
            sendClientMessage('setActiveScene', { scene: ActiveScene });
            renderFocusedScene();
            // jump to the objects tab to browse the focused scene
            document.getElementById('button-objects').click();
        });

        el.style.minHeight = `${Math.min(loaded.length * 0.3, 4.9)}vh`;
    });
}

// Objects tab header: show which scene is focused (= ActiveScene) plus its
// object count and unsaved-changes dot, read from the scenes list.
export function renderFocusedScene() {
    const nameEl = document.getElementById('focusedSceneName');
    const countEl = document.getElementById('focusedSceneCount');
    const dirtyEl = document.getElementById('focusedSceneDirty');
    if (!nameEl) return;

    nameEl.textContent = ActiveScene;
    sendClientMessage('scenesList', {}).then(resp => {
        const scene = JSON.parse(resp.scenes).find(s => s.name === ActiveScene);
        const loading = (scene && scene.loading) || loadingScenes.has(ActiveScene);
        if (countEl) {
            countEl.classList.toggle('scene-loading', !!loading);
            countEl.textContent = loading
                ? 'loading'
                : (scene && scene.count != null ? scene.count : '');
        }
        if (dirtyEl) dirtyEl.classList.toggle('hidden', loading || !(scene && scene.dirty));
    });
}

export function trackSceneObjects() {
    if (SceneObjectsLoopRunning) return;
    SceneObjectsLoopRunning = true;

    const el = document.getElementById('objSceneObjectsList');
    resetList(el);

    const loopId = setInterval(async () => {
        if (!isVisible(el)) {
            clearInterval(loopId);
            SceneObjectsLoopRunning = false;
            return;
        }

        if (MouseDown) return;

        const resp = await sendClientMessage('getScene', {
            scene: ActiveScene,
        });
        // TODO: Fix getting NaN for rot_x/y/z when having only quaternions
        resp.objects = resp.objects.replace(/NaN/g, 'null'); // Convert NaN → null
        const objects = JSON.parse(resp.objects) || [];

        el.textContent = '';
        const ul = document.createElement('ul');
        const fragment = document.createDocumentFragment();

        if (objects.length === 0) {
            const li = document.createElement('li');
            li.textContent = '';
            fragment.appendChild(li);
            ul.appendChild(fragment);
            el.appendChild(ul);
            el.style.minHeight = '1.3vh';
            return;
        }

        // Sorting based on the configured tag option
        if (Settings.tag.sort === 'dist') {
            objects.sort((a, b) => a.distance - b.distance);
        } else if (Settings.tag.sort === 'name') {
            objects.sort((a, b) => a.modelName.localeCompare(b.modelName));
        }

        objects.forEach(
            ({ handle, networkId, distance, modelName, select, hover }) => {
                const li = document.createElement('li');
                li.dataset.handle = handle; // Store handle in dataset
                li.textContent = `${distance.toFixed(2)} ${handle}${networkId ? ` [${networkId}]` : ''} ${modelName}`;

                if (select) li.classList.add('li-select');
                if (hover) li.classList.add('li-hover');

                fragment.appendChild(li);
            }
        );

        ul.appendChild(fragment);
        el.appendChild(ul);

        // Event Delegation for Hover & Click
        ul.addEventListener('pointerenter', trackHandleHover, true);
        ul.addEventListener('pointerleave', trackHandleHover, true);
        ul.addEventListener('click', trackHandleClick);

        // Set minHeight dynamically
        el.style.minHeight = `${Math.min(objects.length * 0.3, 4.9)}vh`;
    }, 250);
}
