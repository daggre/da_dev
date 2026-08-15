/**
 * Popup a confirmation dialog with a message and two options.
 * @param {string} msg - The message to display in the dialog.
 * @param {string} yes - The text to display on the "Yes" button.
 * @param {string} no - The text to display on the "No" button.
 */
export function showConfirm(msg = 'Are you sure?', yes = 'Yes', no = 'No') {
    return new Promise(resolve => {
        const infoHud = document.getElementById('info-hud');
        const message = document.getElementById('info-description');
        const yesButton = document.getElementById('yesOption');
        const noButton = document.getElementById('noOption');
        const lastFocusedElement = document.activeElement;

        message.innerHTML = msg;
        yesButton.textContent = yes;
        noButton.textContent = no;

        infoHud.classList.remove('hidden');
        noButton.focus();

        // Create a MutationObserver to monitor if the popup becomes hidden
        const observer = new MutationObserver(() => {
            if (infoHud.classList.contains('hidden')) {
                cleanup();
                resolve(false);
            } else if (infoHud.classList.contains('clear')) {
                cleanup();
                resolve(true);
            }
        });
        observer.observe(infoHud, {
            attributes: true,
            attributeFilter: ['class'],
        });

        function handleYes() {
            cleanup();
            resolve(true);
        }

        function handleNo() {
            cleanup();
            resolve(false);
        }

        // Same keyboard rules as every other transient thing in this UI: Escape cancels, Tab moves
        // between the choices, and Enter/Space activate the focused one (the global handler in
        // events.js does that part — these are `.control` elements).
        //
        // Escape was missing, which made this the one popup you couldn't back out of without aiming
        // at "No". Tab only went one way, too — No to Yes and then nowhere.
        function handleKeydown(event) {
            if (event.key === 'Escape') {
                event.preventDefault();
                event.stopPropagation();
                handleNo(); // backing out is a "no"
                return;
            }
            if (event.key === 'Tab') {
                event.preventDefault();
                (document.activeElement === noButton ? yesButton : noButton).focus();
            }
        }

        function cleanup() {
            yesButton.removeEventListener('click', handleYes);
            noButton.removeEventListener('click', handleNo);
            noButton.removeEventListener('keydown', handleKeydown);
            yesButton.removeEventListener('keydown', handleKeydown);
            observer.disconnect();
            infoHud.classList.remove('clear');
            infoHud.classList.add('hidden');
            if (lastFocusedElement) {
                lastFocusedElement.focus();
            }
        }

        yesButton.addEventListener('click', handleYes);
        noButton.addEventListener('click', handleNo);
        noButton.addEventListener('keydown', handleKeydown);
        // On BOTH buttons: Escape has to work wherever focus happens to be sitting.
        yesButton.addEventListener('keydown', handleKeydown);
    });
}
