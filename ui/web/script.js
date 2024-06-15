var TreeKeys = {}
var DevKeys = {}
var HudTree = {}

var debug = false
var animations = {}
var flagTotals = 0

function SendClientMessagePromise(endpoint, data) {
    const url = `https://${GetParentResourceName()}/${endpoint}`;
    console.log(`Sending request to ${url}:`, data);
    return fetch(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json; charset=UTF-8',
        },
        body: JSON.stringify(data),
    }).then(response => {
            if (!response.ok) {
                throw new Error(`Server error: ${response.statusText}`);
            }
            return response.json();
        }).catch(error => {
            console.error('Fetch error:', error, url, data);
            throw error;
        });
}

function SendClientMessage(endpoint, data) {
    const url = `https://${GetParentResourceName()}/${endpoint}`;
    console.log(`Sending message to ${url}:`, data);
    return fetch(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json; charset=UTF-8',
        },
        body: JSON.stringify(data),
    });
}

function copyElementToClipboard(element) {
    setTimeout(function() {
        var $temp = $("<input>");
        $("#copyField").append($temp);
        $temp.val($('#'+element).text()).select();
        console.log($('#'+element).text())
        document.execCommand("copy");
        $temp.remove();
    }, 500);
}

function copyToClipboard(val) {
    var $temp = $("<input>");
    $("#copyField").append($temp);
    $temp.val(val).select();
    console.log(val)
    document.execCommand("copy");
    $temp.remove();
}

window.onload = function() {
    window.addEventListener('message', function(msg) {
        // console.log(msg);
        switch(msg.data.type) {
            case "show":
                InitializeTree(msg.data.optionTree[0]);
                ShowDevDisplay();
                break;
            case "hide":
                HideDevDisplay();
                HideAnimDisplay();
                break;
            case "objSelectMode":
                ShowCrosshair(msg.data.data);
                break;
            case "objUpdate":
                UpdateCrosshair(msg.data.data);
                break;
            case "clipboard":
                copyToClipboard(msg.data.text);
                break;
        }
    })
}

$(document).ready(function() {
    $(document).mousedown(function(event) {
        if ($('#animation').is(':visible')) {
            switch(event.button) {
            case 2: // Right Click
                console.log("Right Click");
                SendClientMessage('controlPass', {});
                break;
            }
        }
    });

    $(document).mouseup(function(event) {
        if ($('#animation').is(':visible')) {
            switch(event.button) {
            case 2: // Right Click
                console.log("Right Click Release");
                SendClientMessage('controlPassEnd', {});
                break;
            }
        }
    });

    $(document).keydown(function(event) {
        switch(event.key) {
            case "Escape": //ESC
                // Explicitly handle Escape as exit UI
                SendClientMessage('exit', {});
                HideDevDisplay();
                HideAnimDisplay();
                break;
            case " ":
                spacebarToggle(event.target);
                break;
            default:
                if ($('#dev-display').is(':visible')) {
                    HandleKey(event.key);
                }
                break;
        }
    });

    $("div#textEntry").keydown(function(e) {
        if (e.code == "Enter") {
            e.preventDefault();
        }
    });

    $("div#anim-search.field").keydown(function(e) {
        if (e.code == "Enter") {
            e.preventDefault();
            var dictResults = document.getElementById("dict-results");
            var animResults = document.getElementById("anim-results");
            dictResults.innerHTML = "";
            dictResults.scrollTop = 0;
            animResults.innerHTML = "";
            animResults.scrollTop = 0;
            searchAnimDicts(this.innerHTML);
        }
    });

    SendClientMessagePromise('initAnims', {}).then(function(resp) {
            animations = JSON.parse(resp.animations);
        });
});

InitializeTree = function(optionTree) {
    TreeKeys = {}
    DevKeys = {}
    HudTree = optionTree

    $('#menuOptions').html("");
    $('#devOptions').html("");

    if (optionTree.subMenu) {
        for (idx in optionTree.subMenu) {
            AppendMenuOption(idx, optionTree.subMenu[idx])
        }
    }

    if (optionTree.options) {
        for (idx in optionTree.options) {
            AppendOption(idx, optionTree.options[idx]);
        }
    }
}

AppendOption = function(index, value) {
    DevKeys[value.key] = index;
    const html = '<div class="row"> <div class="column value">'+value.optionName+'</div> <div class="column key">'+value.key+'</div> </div>';
    $("#devOptions").append(html);
}

AppendMenuOption = function(index, value) {
    TreeKeys[value.key] = index;
    const html = '<div class="row"> <div class="column value">  '+value.menuName+'</div> <div class="column key">'+value.key+'</div> </div>';
    $("#menuOptions").append(html);
}

KeyTranslate = function(key) {
    let map = {
        // Translate fr keyboard
        '&': '1',
        'é': '2',
        '"': '3',
        '\'': '4',
    }
    let lowercaseKey = key.toLowerCase();
    return map.hasOwnProperty(lowercaseKey) ? map[lowercaseKey] : lowercaseKey;
}

HandleKey = function(key) {
    let translatedKey = KeyTranslate(key)
    if (TreeKeys[translatedKey]) {
        let idx = TreeKeys[translatedKey]
        InitializeTree(HudTree.subMenu[idx])
    } else if (DevKeys[translatedKey]) {
        let idx = DevKeys[translatedKey]
        if (HudTree.options[idx].menuName == "menu" && HudTree.options[idx].optionName == "anim") {
            ShowAnimDisplay();
            SendClientMessage('animHUD', {});
        } else {
            SendClientMessage('trigger', {
                menuName: HudTree.options[idx].menuName,
                optionName: HudTree.options[idx].optionName
            });
        }
        HideDevDisplay();
    } else {
        SendClientMessage('exit', { key: translatedKey });
        HideDevDisplay();
        HideAnimDisplay();
    }
}

ShowCrosshair = function(data) {
    if (data) {
        $('#objselect-hud').show();
    } else {
        $('#objselect-hud').hide();
    }
}

UpdateCrosshair = function(data) {
    // console.log("Updating crosshair", data)
	var crosshair = document.querySelector('#crosshair');
	if (data.selected) {
		crosshair.className = 'selected';
	} else if (data.obj > 0) {
		crosshair.className = 'active';
	} else {
		crosshair.className = 'inactive';
    }
}



ShowDevDisplay = function() {
    $("#dev-display").show();
}

HideDevDisplay = function() {
    $("#dev-display").hide();
}

ShowAnimDisplay = function() {
    $("#animation").show();
}

HideAnimDisplay = function() {
    $("#animation").hide();
}


// Animation HUD

function toggleOption(option) {
    var element = null;
    switch (option) {
        case "control-restart":
            element = document.getElementById('button-restart');
            element.classList.toggle('selected');
            if (element.classList.contains('selected')) {
                playElement = document.getElementById('button-play')
                if (playElement.classList.contains('selected')) {
                    playAnimation();
                }
                setTimeout(function() {
                    if (element.classList.contains('selected')) {
                        element.classList.toggle('selected');
                    }
                }, 200);
            }
            break;
        case "control-play":
            element = document.getElementById('button-play')
            if (!element.classList.contains('selected')) {
                element.classList.toggle('selected');
            }
            playAnimation();
            break;
        case "control-stop":
            element = document.getElementById('button-stop')
            element.classList.toggle('selected');
            var playElement = document.getElementById('button-play');
            if (playElement.classList.contains('selected')) {
                playElement.classList.toggle('selected');
            }
            setTimeout(function() {
                if (element.classList.contains('selected')) {
                    element.classList.toggle('selected');
                }
            }, 200);
            stopAnimation();
            break;
        case "control-repeat":
            element = document.getElementById('button-repeat')
            element.classList.toggle('selected');
            break;

        // Old anim code
        case "timings":
            element = document.getElementById('icon-timings')
            element.classList.toggle('selected');
            if (element.classList.contains('selected')) {
                $('#anim-timings').css("display", "flex");
            } else {
                $('#anim-timings').hide();
            }
            break;
        case "flags":
            element = document.getElementById('icon-flags')
            element.classList.toggle('selected');
            if (element.classList.contains('selected')) {
                $('#anim-flags').css("display", "flex");
            } else {
                $('#anim-flags').hide();
            }
            break;
        case "entity":
            element = document.getElementById('icon-entity')
            element.classList.toggle('selected');
            if (element.classList.contains('selected')) {
                $('#anim-entity').css("display", "flex");
            } else {
                $('#anim-entity').hide();
            }
            break;
        case "search":
            element = document.getElementById('icon-search')
            element.classList.toggle('selected');
            if (element.classList.contains('selected')) {
                $('#anim-search').css("display", "flex");
            } else {
                $('#anim-search').hide();
            }
            break;
        default:
            break;
    }
}

function toggleFlag(flag) {
    var loopElement = document.getElementById("icon-loop");
    var flag1Element = document.getElementById("flag-1");
    var flag2Element = document.getElementById("flag-2");
    var flag4Element = document.getElementById("flag-4");
    var flag8Element = document.getElementById("flag-8");
    var flag16Element = document.getElementById("flag-16");
    var flag32Element = document.getElementById("flag-32");

    switch (flag) {
        case 1:
            loopElement.classList.toggle("selected");
            flag1Element.classList.toggle("selected");
            break;
        case 2:
            flag2Element.classList.toggle("selected");
            break;
        case 4:
            flag4Element.classList.toggle("selected");
            break;
        case 8:
            flag8Element.classList.toggle("selected");
            break;
        case 16:
            flag16Element.classList.toggle("selected");
            break;
        case 32:
            flag32Element.classList.toggle("selected");
            break;
        default:
            break;
    }
    var flag1 = flag1Element.classList.contains("selected");
    var flag2 = flag2Element.classList.contains("selected");
    var flag4 = flag4Element.classList.contains("selected");
    var flag8 = flag8Element.classList.contains("selected");
    var flag16 = flag16Element.classList.contains("selected");
    var flag32 = flag32Element.classList.contains("selected");

    flagTotals = 0;
    if (flag1) { flagTotals += 1; }
    if (flag2) { flagTotals += 2; }
    if (flag4) { flagTotals += 4; }
    if (flag8) { flagTotals += 8; }
    if (flag16) { flagTotals += 16 }
    if (flag32) { flagTotals += 32; }
    document.getElementById("flag-totals").innerHTML = flagTotals;
}

function toggleElement(element, elementName) {
    element.classList.toggle("selected");
    if (element.classList.contains("selected")) {
        $("#"+elementName).css("display", "flex");
    } else {
        $("#"+elementName).hide();
    }
}

function spacebarToggle(element) {
    if (typeof element.onclick == "function") {
        element.onclick.apply();
    }
}

function playAnimation() {
    var entity = document.getElementById("target-entity").innerHTML;
    var animDict = document.getElementById("active-animDict").innerHTML;
    var anim = document.getElementById("active-anim").innerHTML;
    var blendIn = document.getElementById("blendin-field").innerHTML;
    var blendOut = document.getElementById("blendout-field").innerHTML;
    var playback = document.getElementById("playback-field").innerHTML;
    var duration = document.getElementById("duration-field").innerHTML;
    var flag = document.getElementById("flag-totals").innerHTML;
    SendClientMessage('playAnim', {
        entity: entity,
        animDict: animDict,
        animName: anim,
        blendInSpeed: blendIn,
        blendOutSpeed: blendOut,
        playbackRate: playback,
        duration: duration,
        flag: flag,
    });
}

function stopAnimation() {
    SendClientMessage('stopAnim', {});
}

function searchAnims(animDict) {
    var animResults = document.getElementById("anim-results");
    animResults.innerHTML = "";
    animResults.scrollTop = 0;
    var resultUL = document.createElement('ul');
    animResults.appendChild(resultUL);
    var results = [];

    Object.values(animations[animDict]).forEach(anim => {
        results.push({
            anim: anim,
            animDict: animDict,
        });
    });

    results.sort(function(a, b) {
        if (a.anim < b.anim) {
            return -1;
        }
        if (a.anim > b.anim) {
            return 1;
        }
        return 0;
    });

    for (var i=0; i < results.length; ++i) {
        var li = document.createElement('li');
        li.setAttribute('data-animDict', results[i].animDict);
        li.setAttribute('class', "largeResult")
        li.innerHTML = results[i].anim;
        li.addEventListener('click', function() {
            document.getElementById("active-anim").innerHTML = this.innerHTML;
            $("#copyAnim").html(this.innerHTML);
            toggleOption('anim-play');
        });
        resultUL.appendChild(li);
    }
}

function searchAnimDicts(searchValue) {
    var maxResults = 10000;
    var dictResults = document.getElementById("dict-results");
    dictResults.innerHTML = "";
    dictResults.scrollTop = 0;
    var resultUL = document.createElement('ul');
    dictResults.appendChild(resultUL);
    var results = [];

    if (!searchValue || searchValue == "") {
        dictResults.innerHTML = "";
        return;
    }

    Object.keys(animations).forEach(animDict => {
        if (animDict.toLowerCase().includes(searchValue.toLowerCase())) {
            results.push({
                animDict: animDict
            });
        } else {
            animations[animDict].every(animName => {
                if (animName.toLowerCase().includes(searchValue.toLowerCase())) {
                    results.push({
                        animDict: animDict
                    });
                    return false;
                }
                return true;
            });
        }
    });

    results.sort(function(a, b) {
        if (a.animDict < b.animDict) {
            return -1;
        }
        if (a.animDict > b.animDict) {
            return 1;
        }
        return 0;
    });

    for (var i=0; i < results.length && i < maxResults; ++i) {
        var li = document.createElement('li');
        li.setAttribute('data-animDict', results[i].animDict);
        li.setAttribute('class', "largeResult")
        li.innerHTML = results[i].animDict;
        li.addEventListener('click', function() {
            document.getElementById("active-animDict").innerHTML = this.innerHTML;
            $("#copyAnimDict").html(this.innerHTML);
            document.getElementById("active-anim").innerHTML = "";
            $("#copyAnim").html("");
            searchAnims(this.innerHTML)
        })

        resultUL.appendChild(li);
    }
}

window.addEventListener('load', function() {
});
