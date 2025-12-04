export function clipboardCopy(val) {
    const textArea = document.createElement('textarea');
    textArea.value = val;
    document.body.appendChild(textArea);
    textArea.select();
    console.log("Copy:", val);
    document.execCommand('copy');
    document.body.removeChild(textArea);
}
