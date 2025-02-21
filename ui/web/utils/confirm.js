/**
 * Popup a confirmation dialog with a message and two options.
 * @param {string} msg - The message to display in the dialog.
 * @param {string} yes - The text to display on the "Yes" button.
 * @param {string} no - The text to display on the "No" button.
 */
export function showConfirm(msg = "Are you sure?", yes = "Yes", no = "No") {
    return new Promise((resolve, reject) => {
        const infoHUD = document.getElementById('infoHUD');
        const message = document.getElementById('infoDescription');
        const yesButton = document.getElementById('yesOption');
        const noButton = document.getElementById('noOption');
        const lastFocusedElement = document.activeElement;


        message.innerHTML = msg;
        yesButton.innerHTML = yes;
        noButton.innerHTML = no;

        infoHUD.classList.remove('hidden');
        noButton.focus();

        // Create a MutationObserver to monitor if the popup becomes hidden
        const observer = new MutationObserver((mutationsList) => {
            if (infoHUD.classList.contains('hidden')) {
                cleanup();
                resolve(false);
            } else if (infoHUD.classList.contains('clear')) {
                cleanup();
                resolve(true);
            }
        });
        observer.observe(infoHUD, {
            attributes: true,
            attributeFilter: ['class']
        });

        function handleYes() {
            cleanup();
            resolve(true);
        }

        function handleNo() {
            cleanup();
            resolve(false);
        }

        function cleanup() {
            yesButton.removeEventListener('click', handleYes);
            noButton.removeEventListener('click', handleNo);
            observer.disconnect();
            infoHUD.classList.remove('clear');
            infoHUD.classList.add('hidden');
            if (lastFocusedElement) {
                lastFocusedElement.focus();
            }
        }

        yesButton.addEventListener('click', handleYes);
        noButton.addEventListener('click', handleNo);
    });
}
