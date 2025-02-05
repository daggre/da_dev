export function clipboardCopy(val) {
    let $temp = $("<input>");
    $("#copyField").append($temp);
    $temp.val(val).select();
    document.execCommand("copy");
    $temp.remove();
    console.log(val)
}

// TODO: Test this new implemented clipboardCopy function
// export function clipboardCopy(val) {
//     if (navigator.clipboard) {
//         navigator.clipboard.writeText(val)
//             .then(() => console.log(`Copied: ${val}`))
//             .catch(err => console.error('Failed to copy: ', err));
//     } else {
//         // Fallback for older browsers
//         const tempInput = document.createElement("input");
//         document.body.appendChild(tempInput);
//         tempInput.value = val;
//         tempInput.select();
//         document.execCommand("copy");
//         tempInput.remove();
//         console.log(`Copied (fallback): ${val}`);
//     }
// }
