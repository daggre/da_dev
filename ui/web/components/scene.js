import { clipboardCopy } from '../utils/clipboard.js';
import { resetList, isVisible } from '../utils/nav.js';
import { showConfirm } from './confirm.js';
import { sendClientMessage } from '../utils/msg.js';
import { exportSceneFormat } from '../components/export.js';
import { toggleSettingsHUD } from '../components/hud/settings.js';
import { DropDownOptions } from './dropdown.js';
import { MouseDown } from './events.js';
import { Settings } from './settings.js';

let DefaultScene = 'default';
let ActiveScene = DefaultScene;
let ExportFormat = 'YMAP';
let SceneObjectsLoopRunning = false;

DropDownOptions.importFormat = {
    'Map Editor XML': () => importScene('MapEditorXML'),
    'Propplacer JSON': () => importScene('PropplacerJSON'),
    SpoonerDB: () => importScene('SpoonerDB'),
    YMAP: () => importScene('YMAP'),
};

DropDownOptions.exportFormat = {
    'Map Editor XML': () => exportScene('MapEditorXML', ActiveScene),
    'Propplacer JSON': () => exportScene('PropplacerJSON', ActiveScene),
    SpoonerDB: () => exportScene('SpoonerDB', ActiveScene),
    YMAP: () => exportScene('YMAP', ActiveScene),
};

export function saveScene() {
    const newSceneName = document.getElementById('selectedScene').textContent;
    sendClientMessage('saveScene', { scene: newSceneName });
    ActiveScene = newSceneName;
    getScenes();
}

export function clearScene() {
    const sceneName = ActiveScene;
    showConfirm(
        `Unsaved changes will be lost.<br>Remove scene '${sceneName}' objects?`
    ).then(confirm => {
        if (confirm) {
            // TODO: implement clearScene
            sendClientMessage('clearScene', { scene: sceneName });
            trackSceneObjects();
        } else {
            console.log('Clear scene cancelled');
        }
    });
}

export function reloadScene() {
    const sceneName = ActiveScene;
    sendClientMessage('reloadScene', { scene: sceneName });
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
        let selectedLi = null; // Keep track of the selected `<li>`

        sceneList.forEach(scene => {
            const li = document.createElement('li');
            li.textContent = scene.name;
            li.setAttribute('tabindex', '14');
            li.dataset.sceneName = scene.name; // Store scene name for easy access

            if (scene.name === ActiveScene) {
                li.classList.add('li-select');
                selectedLi = li; // Store the selected `<li>`
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
            if (selectedLi) selectedLi.classList.remove('li-select');
            li.classList.add('li-select');
            selectedLi = li; // Update selected `<li>`

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
        const objects = resp.objects || [];

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

function trackHandleHover(event) {
    const li = event.target.closest('li');
    if (!li) return;
    event.type === 'pointerenter'
        ? li.classList.add('li-hover')
        : li.classList.remove('li-hover');
    sendClientMessage('trackObject', {
        handle: li.dataset.handle,
        category: 'hover',
        remove: event.type === 'pointerleave',
    });
}

function trackHandleClick(event) {
    const li = event.target.closest('li');
    if (!li) return;
    sendClientMessage('trackObject', {
        handle: li.dataset.handle,
        category: 'select',
    });
}

export function importScene(format) {
    ImportFormat = format;
    const sceneName = ActiveScene;
    console.log('importScene', sceneName);
}

export function exportScene(format) {
    ExportFormat = format;
    exportSceneFormat(ActiveScene, format);
}

/**
 * Popup dialog with export options
 */
export function showExport() {
    toggleSettingsHUD(false);
    exportSceneFormat(ActiveScene, ExportFormat);

    return new Promise(resolve => {
        const exportHud = document.getElementById('export-hud');
        const copyButton = document.getElementById('exportCopyOption');
        const exitButton = document.getElementById('exportExitOption');
        const lastFocusedElement = document.activeElement;

        document.getElementById('import-hud').classList.add('hidden');
        exportHud.classList.remove('hidden');
        copyButton.focus();

        // Create a MutationObserver to monitor if the popup becomes hidden
        const observer = new MutationObserver(() => {
            if (exportHud.classList.contains('hidden')) {
                cleanup();
                resolve(false);
            }
        });
        observer.observe(exportHud, {
            attributes: true,
            attributeFilter: ['class'],
        });

        function handleCopy() {
            clipboardCopy(document.getElementById('exportContent').innerText);
            copyButton.focus();
        }

        function handleExit() {
            cleanup();
            resolve(false);
        }

        function cleanup() {
            copyButton.removeEventListener('click', handleCopy);
            exitButton.removeEventListener('click', handleExit);
            observer.disconnect();
            exportHud.classList.add('hidden');
            if (lastFocusedElement) {
                lastFocusedElement.focus();
            }
        }

        copyButton.addEventListener('click', handleCopy);
        exitButton.addEventListener('click', handleExit);
    });
}

export function showImport() {
    toggleSettingsHUD(false);

    return new Promise(resolve => {
        const importHUD = document.getElementById('import-hud');
        const importButton = document.getElementById('importOption');
        const exitButton = document.getElementById('importExitOption');
        const lastFocusedElement = document.activeElement;

        document.getElementById('export-hud').classList.add('hidden');
        importHUD.classList.remove('hidden');
        exitButton.focus();

        // Create a MutationObserver to monitor if the popup becomes hidden
        const observer = new MutationObserver(() => {
            if (importHUD.classList.contains('hidden')) {
                cleanup();
                resolve(false);
            }
        });
        observer.observe(importHUD, {
            attributes: true,
            attributeFilter: ['class'],
        });

        function handleImport() {
            // const sceneData = document.getElementById('importContent').textContent;
            importScene();
        }

        function handleExit() {
            cleanup();
            resolve(false);
        }

        function cleanup() {
            importButton.removeEventListener('click', handleImport);
            exitButton.removeEventListener('click', handleExit);
            observer.disconnect();
            importHUD.classList.add('hidden');
            if (lastFocusedElement) {
                lastFocusedElement.focus();
            }
        }

        importButton.addEventListener('click', handleImport);
        exitButton.addEventListener('click', handleExit);
    });
}

export function handleEscape(contentId, hudId, exitOptionId) {
    const content = document.getElementById(contentId);
    if (!content.matches(':focus')) {
        document.getElementById(hudId).classList.add('hidden');
    } else {
        document.activeElement.blur();
        window.getSelection().removeAllRanges();
        document.getElementById(exitOptionId).focus();
    }
}

