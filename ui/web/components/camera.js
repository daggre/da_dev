import {
    elementSetText,
    elementSetClass,
} from '../utils/nav.js';

let cameraHUDTimeout = null;

export function updateCamera(camera) {
    elementSetClass('cameraHUD', 'hidden', false)
    elementSetText('cam-speed', camera.speed);
    // Set update time and then hide it
    clearTimeout(cameraHUDTimeout)
    cameraHUDTimeout = setTimeout(() => {
        elementSetClass('cameraHUD', 'hidden', true)
    }, 2000);
}
