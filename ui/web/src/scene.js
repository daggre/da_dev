import { clipboardCopy } from '../src/clipboard.js';
import { resetList, isVisible } from '../src/nav.js';
import { showConfirm } from '../src/confirm.js';
import { sendClientMessage } from '../src/msg.js';
import { MouseDown, trackHandleHover, trackHandleClick } from '../src/events.js';
import { Settings } from '../src/settings.js';

let SceneObjectsLoopRunning = false;
let DefaultScene = 'default';
export let ActiveScene = DefaultScene;

export function saveScene() {
    const newSceneName = document.getElementById('selectedScene').textContent;
    sendClientMessage('saveScene', { scene: newSceneName });
    ActiveScene = newSceneName;
    getScenes();
}

export function clearScene() {
    const sceneName = ActiveScene;
    showConfirm(
        `Unload scene '${sceneName}' objects?<br>Unsaved changes will be lost.`
    ).then(confirm => {
            if (confirm) {
                sendClientMessage('clearScene', { scene: sceneName });
                trackSceneObjects();
                const li = document.querySelector(`li[data-scene-name="${sceneName}"]`);
                if (li) {
                    li.classList.remove('li-select'); // Remove selection class
                }
            } else {
                console.log('Clear scene cancelled');
            }
        });
}

export function clearAllScenes() {
    const sceneName = ActiveScene;
    showConfirm(
        `Unload all scenes objects?<br>Unsaved changes will be lost.`
    ).then(confirm => {
            if (confirm) {
                sendClientMessage('clearAllScenes', {});
                trackSceneObjects();
                document.querySelectorAll('li[data-scene-name].li-select').forEach(li => {
                    li.classList.remove('li-select');
                });
            } else {
                console.log('Clear all scenes cancelled');
            }
        });
}

export function reloadScene() {
    const sceneName = ActiveScene;
    sendClientMessage('reloadScene', { scene: sceneName });
    const li = document.querySelector(`li[data-scene-name="${sceneName}"]`);
    if (li) {
        li.classList.add('li-select'); // Add selection class
    }
}

export function deleteScene() {
    const sceneName = ActiveScene;
    showConfirm(
        `This action cannot be undone!<br>Delete scene '${sceneName}'?`
    ).then(confirm => {
        if (confirm) {
            sendClientMessage('deleteScene', { scene: sceneName });
            ActiveScene = DefaultScene;
            getScenes();
        } else {
            console.log('Delete scene cancelled');
        }
    });
}

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
            const li = document.createElement('li');
            li.textContent = scene.name;
            li.setAttribute('tabindex', '14');
            li.dataset.sceneName = scene.name; // Store scene name for easy access

            if (scene.loaded) {
                li.classList.add('li-select');
            }

            fragment.appendChild(li);
        });

        ul.appendChild(fragment);
        el.appendChild(ul);

        // Event Delegation for Hover & Click Events
        ul.addEventListener(
            'mouseenter',
            event => {
                const li = event.target.closest('li');
                if (li) li.classList.add('li-hover');
            },
            true
        );

        ul.addEventListener(
            'mouseleave',
            event => {
                const li = event.target.closest('li');
                if (li) li.classList.remove('li-hover');
            },
            true
        );

        ul.addEventListener('click', event => {
            const li = event.target.closest('li');
            if (!li) return;

            ActiveScene = li.dataset.sceneName;

            // Remove previous selection
            li.classList.add('li-select');

            document.getElementById('selectedScene').textContent = ActiveScene;
            sendClientMessage('loadScene', { scene: ActiveScene });
            trackSceneObjects();
        });

        // Set minHeight dynamically
        el.style.minHeight = `${Math.min(sceneList.length * 0.3, 4.9)}vh`;
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
