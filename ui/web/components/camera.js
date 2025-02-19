import {
    elementSetText,
    elementSetClass,
} from '../utils/nav.js';

let cameraHUDTimeout = null;
let hideCamera = true;

export function updateCamera(camera) {
    elementSetClass('cameraHUD', 'hidden', false)
    elementSetText('cam-speed', camera.speed);
    // Set update time and then hide it
    clearTimeout(cameraHUDTimeout)
    cameraHUDTimeout = setTimeout(() => {
        if (hideCamera) { elementSetClass('cameraHUD', 'hidden', true); }
    }, 2000);
}

export function toggleHideCamera() {
    const selected = elementSetClass('objSettingsHideCamera', 'selected');
    hideCamera = selected;
    elementSetClass('cameraHUD', 'hidden', hideCamera);
}
