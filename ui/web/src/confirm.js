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

        function handleKeydown(event) {
            if (event.key === 'Tab') {
                event.preventDefault();
                if (document.activeElement === noButton) {
                    yesButton.focus();
                }
            }
        }

        function cleanup() {
            yesButton.removeEventListener('click', handleYes);
            noButton.removeEventListener('click', handleNo);
            noButton.removeEventListener('keydown', handleKeydown);
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
    });
}
