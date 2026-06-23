let cameraHudTimeout = null;
let hideCamera = true;

export function updateCamera(camera) {
    const camEl = document.getElementById('camStatus');
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
    // Assign the module-level `hideCamera` (no `const`/`let`) so the autohide
    // timer in updateCamera() actually sees the setting change. Previously a
    // shadowing local meant the readout always autohid regardless of the toggle.
    hideCamera = document.getElementById('objSettingsHideCamera').classList.toggle('selected');
    document.getElementById('camStatus').classList.toggle('hidden', hideCamera);
}
