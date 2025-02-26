let cameraHudTimeout = null;
let hideCamera = true;

export function updateCamera(camera) {
    const camEl = document.getElementById('camera-hud');
    camEl.classList.remove('hidden');
    document.getElementById('cam-speed').textContent = camera.speed;
    // Set update time and then hide it
    clearTimeout(cameraHudTimeout);
    cameraHudTimeout = setTimeout(() => {
        if (hideCamera) {
            camEl.classList.add('hidden');
        }
    }, 2000);
}

export function toggleHideCamera() {
    const hideCamera = document.getElementById('objSettingsHideCamera').classList.toggle('selected');
    document.getElementById('camera-hud').classList.toggle('hidden', hideCamera);
}
