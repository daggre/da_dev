export function clipboardCopy(val) {
    var $temp = $("<input>");
    $("#copyField").append($temp);
    $temp.val(val).select();
    console.log(val)
    document.execCommand("copy");
    $temp.remove();
}

