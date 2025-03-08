import { toggleSettingsHUD } from '../../src/hud/settings.js';
import { DropDownOptions } from '../../src/dropdown.js';
import { sendClientMessage } from "../../src/msg.js";
import { showConfirm } from "../../src/confirm.js";
import { getScenes } from "../../src/scene.js";
import { parseYMAP } from '../../src/ymap.js';

DropDownOptions.importFormat = {
    YMAP: () => {},
};

export function showImport() {
    toggleSettingsHUD(false);

    return new Promise(resolve => {
        const importHUD = document.getElementById('import-hud');
        const importButton = document.getElementById('importOption');
        const lastFocusedElement = document.activeElement;
        const exitButton = document.getElementById('importExitOption');

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
            const sceneData = document.getElementById('importContent').textContent;
            importScene(sceneData);
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

function importScene(sceneData) {
    const { success, objects } = parseYMAP(sceneData);
    console.log("Importing scene data...", success, objects);

    if (!success) {
        console.log("Failed to parse/import scene data.");
        return;
    }

    const sceneName = document.getElementById("importName").textContent;
    if (sceneName === "") {
        console.log("Scene name is empty.");
        return;
    }
    sendClientMessage('scenesList', {}).then(resp => {
        const sceneList = JSON.parse(resp.scenes).sort((a, b) =>
            a.name.localeCompare(b.name)
        );

        sceneList.forEach(scene => {
            if (scene.name === sceneName) {
                showConfirm(
                    `Scene '${sceneName}' already exists.<br>Overwrite?`
                ).then(confirm => {
                        if (!confirm) {
                            console.log("Import cancelled.");
                            return;
                        }
                    });
            }
        });
        sendClientMessage("importScene", {
            name: sceneName,
            objects: objects,
        }).then(resp => {
                if (resp.success) {
                    console.log("Scene imported successfully.");
                } else {
                    console.log("Client failed to import scene data.");
                }
            });
        getScenes();
    });
}
