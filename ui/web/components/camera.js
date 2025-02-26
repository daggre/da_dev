import { elementSetText, elementSetClass } from '../utils/nav.js';

let cameraHudTimeout = null;
let hideCamera = true;

export function updateCamera(camera) {
    elementSetClass('camera-hud', 'hidden', false);
    elementSetText('cam-speed', camera.speed);
    // Set update time and then hide it
    clearTimeout(cameraHudTimeout);
    cameraHudTimeout = setTimeout(() => {
        if (hideCamera) {
            elementSetClass('camera-hud', 'hidden', true);
        }
    }, 2000);
}

export function toggleHideCamera() {
    const selected = elementSetClass('objSettingsHideCamera', 'selected');
    hideCamera = selected;
    elementSetClass('camera-hud', 'hidden', hideCamera);
}
