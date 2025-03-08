import { toggleSettingsHUD } from '../../src/hud/settings.js';
import { DropDownOptions } from '../../src/dropdown.js';
import { importScene } from '../../src/import.js';

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
