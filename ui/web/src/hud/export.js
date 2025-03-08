import { toggleSettingsHUD } from '../../src/hud/settings.js';
import { clipboardCopy } from '../../src/clipboard.js';
import { exportScene } from '../../src/export.js';
import { DropDownOptions } from '../../src/dropdown.js';
import { ActiveScene } from '../../src/scene.js';

DropDownOptions.exportFormat = {
    YMAP: () => changeFormat('YMAP', ActiveScene),
};

export function showExport() {
    toggleSettingsHUD(false);
    exportScene(ActiveScene, 'YMAP');

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

function changeFormat(format, scene) {
    exportScene(scene, format);
    document.getElementById('exportFormat').textContent = format;
}
