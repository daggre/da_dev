import { toggleSettingsHUD } from '../../src/hud/settings.js';
import { clipboardCopy } from '../../src/clipboard.js';
import { DropDownOptions } from '../../src/dropdown.js';
import { ActiveScene } from '../../src/scene.js';
import { sendClientMessage } from '../../src/msg.js';
import { exportYMAP } from '../../src/ymap.js';

const ExportTypes = {
    'YMAP': (objects) => exportYMAP({objects: objects}),
}

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

        function handleKeydown(event) {
            if (event.key === 'Tab') {
                event.preventDefault();
                if (document.activeElement === exitButton) {
                    document.getElementById('exportFormat').focus();
                }
            }
        }

        function cleanup() {
            copyButton.removeEventListener('click', handleCopy);
            exitButton.removeEventListener('click', handleExit);
            exitButton.removeEventListener('keydown', handleKeydown);
            observer.disconnect();
            exportHud.classList.add('hidden');
            if (lastFocusedElement) {
                lastFocusedElement.focus();
            }
        }

        copyButton.addEventListener('click', handleCopy);
        exitButton.addEventListener('click', handleExit);
        exitButton.addEventListener('keydown', handleKeydown);
    });
}

function changeFormat(format, scene) {
    exportScene(scene, format);
    document.getElementById('exportFormat').textContent = format;
}

async function exportScene(sceneName, format) {
    try {
        const resp = await sendClientMessage('getScene', { scene: sceneName }) || {};

        resp.objects = resp.objects.replace(/NaN/g, 'null'); // Convert NaN → null
        const objects = JSON.parse(resp.objects) || [];

        if (!Array.isArray(objects)) {
            console.error("Invalid response format: objects is not an array", resp);
            return;
        }

        const exportString = ExportTypes[format](objects);
        document.getElementById("exportContent").textContent = exportString;
    } catch (error) {
        console.error("Failed to get scene data:", error);
    }
}
