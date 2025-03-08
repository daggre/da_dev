export function clipboardCopy(val) {
    // Create a hidden textarea to copy from
    const textArea = document.createElement('textarea');
    textArea.value = val; // Ensure innerText retains newlines
    document.body.appendChild(textArea);
    textArea.select();
    document.execCommand('copy');
    document.body.removeChild(textArea);
}
