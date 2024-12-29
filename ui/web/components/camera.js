import { elementSetText } from '../utils/nav.js';

export function updateCamera(camera) {
    elementSetText('cam-speed', camera.speed);
    // elementSetText('cam-mode', camera.cameraMode);
    // elementSetText('cam-noclip', camera.noclip);
}
