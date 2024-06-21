var ControlPassActive = false

function toUint32(value) {
    return value >>> 0;
}

function SendClientMessage(endpoint, data) {
    const url = `https://${GetParentResourceName()}/${endpoint}`;
    // console.log(`Sending request to ${url}:`, data);
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
        switch(msg.data.type) {
            case "show":
                if ($('#animControlOptions').is(':visible')) {
                    toggleAnimDisplay("off");
                    SendClientMessage('transitionControl', {
                        from: "Anim",
                        to: "Dev",
                    });
                    ControlPassActive = false;
                }
                InitializeTree(msg.data.optionTree[0]);
                document.getElementById('devMenu').style.display = "flex";
                break;
            case "showAnim":
                toggleAnimDisplay("on");
                break;
            case "hide":
                ToggleDevDisplay("off");
                document.getElementById('devMenu').style.display = "none";
                toggleAnimDisplay("off");
                break;
            case "objSelectMode":
                if (msg.data.data) {
                    toggleObjectMode("on");
                } else {
                    toggleObjectMode("off");
                }
                break;
            case "objUpdate":
                updateCrosshair(msg.data.data);
                break;
            case "clipboard":
                copyToClipboard(msg.data.text);
                break;
        }
    })
}

$(document).ready(function() {
    $(document).mousedown(function(event) {
        if ($('#animControlOptions').is(':visible')) {
            switch(event.button) {
            case 0: // Left Click
                if (event.target.id == "activeAnimDict" || event.target.id == "activeAnimName") {
                    if (event.target.innerHTML != "") {
                        copyToClipboard(event.target.innerHTML);
                    }
                }
                break;
            case 2: // Right Click
                ControlPassActive = true;
                SendClientMessage('controlPass', {});
                break;
            }
        }
    });

    $(document).mouseup(function(event) {
        if ($('#animControlOptions').is(':visible')) {
            switch(event.button) {
            case 2: // Right Click
                ControlPassActive = false;
                SendClientMessage('controlPassEnd', {});
                break;
            }
        }
    });

    $(document).keydown(function(event) {
        if (ControlPassActive) { return; }
        var animSearchElement = document.getElementById('valueAnimSearch');
        // Check if target element has attribute contenteditable
        if (event.key != "Escape" && event.target.getAttribute('contenteditable') == "true") { return; }

        if ($('#animControlOptions').is(':visible') && event.key == "Escape") {
            var escaped = false;
            if ($('#animHelp').is(':visible')) {
                toggleAnimHelp("off");
                return;
            }
            if ($('#animSearchField').is(':visible')) {
                toggleSearch("off");
                escaped = true;
            }
            if ($('#animTimingsOptions').is(':visible')) {
                toggleTimings("off");
                escaped = true;
            }
            if ($('#animFlagsOptions').is(':visible')) {
                toggleFlags("off");
                escaped = true;
            }
            if ($('#animIKFlagsOptions').is(':visible')) {
                toggleIKFlags("off");
                escaped = true;
            }
            if ($('#animEntityOptions').is(':visible')) {
                toggleEntity("off");
                escaped = true;
            }
            if (escaped == true) { return; }

            SendClientMessage('exit', {});
            document.getElementById('devMenu').style.display = "none";
            toggleAnimDisplay("off");

            return;
        }

        if ($('#devMenu').is(':visible')) {
            // dev key hud is visible, handle key press
            handleDevMenuKey(event.key);

        } else if ($('#animControlOptions').is(':visible')) {
            switch(event.key) {
                case " ":
                    if (typeof event.target.onclick == "function") {
                        event.target.onclick.apply();
                    } else {
                        togglePlay();
                    }
                    break;
                case "?":
                case "h":
                    toggleAnimHelp("toggle");
                    break;
                case "Backspace":
                    toggleStop();
                    break;
                case "c":
                    toggleSettings("toggle");
                    break;
                case "2":
                case "t":
                    toggleTimings("toggle");
                    event.preventDefault();
                    break;
                case "4":
                case "o":
                    toggleFlags("toggle");
                    break;
                case "3":
                case "i":
                    toggleIKFlags("toggle");
                    break;
                case "5":
                case "e":
                    toggleEntity("toggle");
                    break;
                case "s":
                case "k":
                    toggleStop();
                    break;
                case "l":
                    toggleLoop();
                    break;
                case "u":
                    toggleTorso("toggle");
                    break;
                case "1":
                case "F":
                case "f":
                    if (RepeatF || event.shiftKey) {
                        toggleSearch("on");
                        animSearchElement.focus();
                        event.preventDefault();
                    } else {
                        toggleSearch("toggle");
                    }
                    RepeatF = true;
                    setTimeout(function() { RepeatF = false; }, 650);
                    break;
                case "x":
                    if ($('#animSearchField').is(':visible')) {
                        // Clear search
                        document.getElementById('animDictList').innerHTML = "";
                        document.getElementById('animList').innerHTML = "";
                        animSearchElement.innerHTML = "";
                        animSearchElement.focus();
                    } else if ($('#animTimingsOptions').is(':visible')) {
                        // Reset timings to defaults
                        document.getElementById("timingBlendIn").innerHTML = "1.0";
                        document.getElementById("timingBlendOut").innerHTML = "1.0";
                        document.getElementById("timingPlayback").innerHTML = "0";
                        document.getElementById("timingDuration").innerHTML = "-1";
                    } else if ($('#animFlagsOptions').is(':visible')) {
                        // Clear all flags
                        for (var i=0; i < 32 ; i++) {
                            let value = toUint32(1 << i);
                            var flagElement = document.getElementById("flag-" + value);
                            if (flagElement.classList.contains("selected")) {
                                toggleFlag(value);
                            }
                        }
                    } else if ($('#animIKFlagsOptions').is(':visible')) {
                        // Clear all ikflags
                        for (var i=0; i < 32 ; i++) {
                            let value = toUint32(1 << i);
                            var flagElement = document.getElementById("ikflag-" + value);
                            if (flagElement.classList.contains("selected")) {
                                toggleIKFlag(value);
                            }
                        }
                    } else if ($('#animEntityOptions').is(':visible')) {
                        // Reset entity to player
                        document.getElementById("animEntityField").innerHTML = "";
                    } else {
                        // Clear the selected animDict and animName
                        document.getElementById("activeAnimDict").innerHTML = "";
                        document.getElementById("activeAnimName").innerHTML = "";
                    }
                    event.preventDefault();
                    break;
                case "r":
                case "q":
                case "p":
                    togglePlay();
                    break;
            }
        }
    });

    $("div#valueAnimSearch.entryField").keydown(function(e) {
        if (e.code == "Enter") {
            e.preventDefault();
            var dictList = document.getElementById("animDictList");
            var animList = document.getElementById("animList");
            document.getElementById('animDictList').style.display = "flex";
            document.getElementById('animList').style.display = "flex";
            dictList.innerHTML = "";
            dictList.scrollTop = 0;
            dictList.scrollLeft = -1000;
            animList.innerHTML = "";
            animList.scrollTop = 0;
            animList.scrollLeft = -1000;
            searchRedMAnims(this.innerHTML);
        }
    });

    SendClientMessage('initAnims', {}).then(function(resp) {
        Animations = JSON.parse(resp.animations);
    });

    SendClientMessage('initAnimFlags', {}).then(function(resp) {
        var flagList = document.getElementById('animFlagsOptions');
        var ul = document.createElement('ul');
        ul.setAttribute('id', 'animFlags');

        var flags = JSON.parse(resp.flags);
        flags.forEach(flag => {
            var flagLabel = document.createElement('div');
            flagLabel.classList.add('check');
            flagLabel.classList.add('entryLabel');
            flagLabel.innerHTML = flag.name;

            var flagField = document.createElement('div');
            flagField.setAttribute('id', "flag-" + flag.value);
            flagField.classList.add('check');
            flagField.classList.add('toggleField');
            flagField.setAttribute('tabindex', "5");
            flagField.setAttribute('role', "button");
            flagField.setAttribute('aria-pressed', "false");
            flagField.setAttribute('onclick', "toggleFlag(" + flag.value + ")");

            var li = document.createElement('li');
            li.appendChild(flagLabel);
            li.appendChild(flagField);
            ul.appendChild(li);
        });

        var flagLabel = document.createElement('div');
        flagLabel.classList.add('check');
        flagLabel.classList.add('entryLabel');
        flagLabel.innerHTML = "TOTAL";

        var flagField = document.createElement('div');
        flagField.setAttribute('id', "flagTotals");
        flagField.classList.add('check');
        flagField.classList.add('entryField');
        flagField.innerHTML = "0";

        var li = document.createElement('li');
        li.appendChild(flagLabel);
        li.appendChild(flagField);
        ul.appendChild(li);
        flagList.appendChild(ul);
    });

    SendClientMessage('initIKAnimFlags', {}).then(function(resp) {
        var flagList = document.getElementById('animIKFlagsOptions');
        var ul = document.createElement('ul');
        ul.setAttribute('id', 'animIKFlags');

        var flags = JSON.parse(resp.flags);
        flags.forEach(flag => {
            var flagLabel = document.createElement('div');
            flagLabel.classList.add('check');
            flagLabel.classList.add('entryLabel');
            flagLabel.innerHTML = flag.name;

            var flagField = document.createElement('div');
            flagField.setAttribute('id', "ikflag-" + flag.value);
            flagField.classList.add('check');
            flagField.classList.add('toggleField');
            flagField.setAttribute('tabindex', "4");
            flagField.setAttribute('role', "button");
            flagField.setAttribute('aria-pressed', "false");
            flagField.setAttribute('onclick', "toggleIKFlag(" + flag.value + ")");

            var li = document.createElement('li');
            li.appendChild(flagLabel);
            li.appendChild(flagField);
            ul.appendChild(li);
        });


        var flagLabel = document.createElement('div');
        flagLabel.classList.add('check');
        flagLabel.classList.add('entryLabel');
        flagLabel.innerHTML = "TOTAL";

        var flagField = document.createElement('div');
        flagField.setAttribute('id', "IKFlagTotals");
        flagField.classList.add('check');
        flagField.classList.add('entryField');
        flagField.innerHTML = "0";

        var li = document.createElement('li');
        li.appendChild(flagLabel);
        li.appendChild(flagField);
        ul.appendChild(li);
        flagList.appendChild(ul);
    });

});

// Dev Tree //

var DevKeys = {}
var HudTree = {}
var TreeKeys = {}

function InitializeTree(optionTree) {
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

function AppendOption(index, value) {
    DevKeys[value.key] = index;
    const html = '<div class="row"> <div class="column value">'+value.optionName+'</div> <div class="column key">'+value.key+'</div> </div>';
    $("#devOptions").append(html);
}

function AppendMenuOption(index, value) {
    TreeKeys[value.key] = index;
    const html = '<div class="row"> <div class="column value">  '+value.menuName+'</div> <div class="column key">'+value.key+'</div> </div>';
    $("#menuOptions").append(html);
}

function KeyTranslate(key) {
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

function handleDevMenuKey(key) {
    let translatedKey = KeyTranslate(key)
    if (TreeKeys[translatedKey]) {
        let idx = TreeKeys[translatedKey]
        InitializeTree(HudTree.subMenu[idx])
    } else if (DevKeys[translatedKey]) {
        let idx = DevKeys[translatedKey]
        SendClientMessage('trigger', {
            menuName: HudTree.options[idx].menuName,
            optionName: HudTree.options[idx].optionName
        });
        document.getElementById('devMenu').style.display = "none";
    } else {
        SendClientMessage('exit', { key: translatedKey });
        document.getElementById('devMenu').style.display = "none";
    }
}

// Crosshair //
function toggleObjectMode(state) {
    if (state == "on") {
        document.getElementById('objSelHud').style.display = "flex";
    } else if (state == "off") {
        document.getElementById('objSelHud').style.display = "none";
    } else {
        if ($('#objSelHud').is(':visible')) {
            document.getElementById('objSelHud').style.display = "none";
        } else {
            document.getElementById('objSelHud').style.display = "flex";
        }
    }
}

function updateCrosshair(data) {
	var crosshair = document.querySelector('#crosshair');
	if (data.selected) {
		crosshair.className = 'selected';
	} else if (data.obj > 0) {
		crosshair.className = 'active';
	} else {
		crosshair.className = 'inactive';
    }
}

// Animation HUD //

var Animations = {}
var FlagTotals = 0
var IKFlagTotals = 0
var RepeatF = false

function toggleAnimDisplay(state) {
    // document.getElementById('animControlOptions').style.display = "none";
    // document.getElementById('activeAnimDisplay').style.display = "none";
    document.getElementById('animDictList').style.display = "none";
    document.getElementById('animList').style.display = "none";
    document.getElementById('animSearchField').style.display = "none";
    document.getElementById('animTimingsOptions').style.display = "none";
    document.getElementById('animFlagsOptions').style.display = "none";
    document.getElementById('animIKFlagsOptions').style.display = "none";
    document.getElementById('animEntityOptions').style.display = "none";
    if (state == "on") {
        document.getElementById('animControlOptions').style.display = "flex";
        document.getElementById('activeAnimDisplay').style.display = "flex";
    } else if (state == "off") {
        document.getElementById('animControlOptions').style.display = "none";
        document.getElementById('activeAnimDisplay').style.display = "none";
    } else {
        if ($('#animControlOptions').is(':visible')) {
            document.getElementById('animControlOptions').style.display = "none";
            document.getElementById('activeAnimDisplay').style.display = "none";
        } else {
            document.getElementById('animControlOptions').style.display = "none";
            document.getElementById('activeAnimDisplay').style.display = "none";
        }
    }
}

function playAnimation() {
    var entity = document.getElementById("animEntityField").innerHTML;
    var animDict = document.getElementById("activeAnimDict").innerHTML;
    var anim = document.getElementById("activeAnimName").innerHTML;
    if (anim == "" || animDict == "") {
        setTimeout(function() {
            togglePlay("off");
        }, 500)
        return;
    }
    var blendIn = document.getElementById("timingBlendIn").innerHTML;
    var blendOut = document.getElementById("timingBlendOut").innerHTML;
    var playback = document.getElementById("timingPlayback").innerHTML;
    var duration = document.getElementById("timingDuration").innerHTML;
    SendClientMessage('playAnim', {
        entity: entity,
        animDict: animDict,
        animName: anim,
        blendInSpeed: blendIn,
        blendOutSpeed: blendOut,
        playbackRate: playback,
        duration: duration,
        flag: FlagTotals,
        ikFlag: IKFlagTotals,
    });
}

function stopAnimation() {
    SendClientMessage('stopAnim', {});
}

function searchAnims(animDict) {
    var results = [];
    Object.values(Animations[animDict]).forEach(anim => {
        results.push({
            anim: anim,
            animDict: animDict,
        });
    });

    results.sort(function(a, b) {
        if (a.anim < b.anim) { return -1; }
        if (a.anim > b.anim) { return 1; }
        return 0;
    });

    var animResults = document.getElementById("animList");
    animResults.innerHTML = "";
    var ul = document.createElement('ul');
    for (var i=0; i < results.length; ++i) {
        var li = document.createElement('li');
        li.innerHTML = results[i].anim;
        li.addEventListener('click', function() {
            document.getElementById("activeAnimName").innerHTML = this.innerHTML;
            togglePlay("on");
        });
        ul.appendChild(li);
    }
    animResults.appendChild(ul);
    if (results.length < 15) {
        animResults.style.minHeight = results.length + ".4vh";
    } else {
        animResults.style.minHeight = "15.4vh";
    }
    animResults.scrollTop = 0;
    animResults.scrollLeft = -1000;

}

function searchRedMAnims(searchValue) {
    var dictResults = document.getElementById("animDictList");
    var maxResults = 10000;
    var results = [];
    if (!searchValue || searchValue == "") {
        dictResults.innerHTML = "";
        return;
    }

    Object.keys(Animations).forEach(animDict => {
        if (animDict.toLowerCase().includes(searchValue.toLowerCase())) {
            results.push({
                animDict: animDict
            });
        } else {
            Animations[animDict].every(animName => {
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

    dictResults.innerHTML = "";
    var ul = document.createElement('ul');
    for (var i=0; i < results.length && i < maxResults; ++i) {
        var li = document.createElement('li');
        li.addEventListener('click', function() {
            document.getElementById("activeAnimDict").innerHTML = this.innerHTML;
            document.getElementById("activeAnimName").innerHTML = "";
            searchAnims(this.innerHTML)
        })
        li.innerHTML = results[i].animDict;
        ul.appendChild(li);
    }
    dictResults.appendChild(ul);
    if (results.length < 30) {
        dictResults.style.minHeight = results.length + ".4vh";
    } else {
        dictResults.style.minHeight = "30vh";
    }
    dictResults.scrollTop = 0;
    dictResults.scrollLeft = -1000;
}

function togglePlay(state) {
    var element = document.getElementById('button-play');
    if (state == "on") {
        element.classList.add('selected');
    } else if (state == "off") {
        element.classList.remove('selected');
        return;
    } else {
        element.classList.remove('selected');
        setTimeout(function() {
            element.classList.add('selected');
        }, 100);
    }
    playAnimation();
}

function toggleStop() {
    element = document.getElementById('button-stop');
    element.classList.toggle('selected');
    var playElement = document.getElementById('button-play');
    playElement.classList.remove('selected');
    setTimeout(function() {
        element.classList.remove('selected');
    }, 200);
    stopAnimation();
}

function toggleLoop() {
    toggleFlag(1);
}

function toggleTorso(state) {
    var element = document.getElementById('button-torso');
    var flag8 = document.getElementById('flag-8');
    var flag16 = document.getElementById('flag-16');

    if (state == "on") {
        element.classList.add('selected');
        if (!flag8.classList.contains('selected')) { toggleFlag(8); }
        if (!flag16.classList.contains('selected')) { toggleFlag(16); }
    } else if (state == "off") {
        element.classList.remove('selected');
        if (flag8.classList.contains('selected')) { toggleFlag(8); }
        if (flag16.classList.contains('selected')) { toggleFlag(16); }
    } else if (state == "toggle") {
        element.classList.toggle('selected');
        var enabled = element.classList.contains('selected');
        if (enabled) {
            if (!flag8.classList.contains('selected')) { toggleFlag(8); }
            if (!flag16.classList.contains('selected')) { toggleFlag(16); }
        } else {
            if (flag8.classList.contains('selected')) { toggleFlag(8); }
            if (flag16.classList.contains('selected')) { toggleFlag(16); }
        }
    }
}

function toggleSettings(state) {
    var element = document.getElementById('button-settings');
    var settingsElement = document.getElementById('animSettings');

    if (state == "on") {
        element.classList.add('selected');
    } else if (state == "off") {
        element.classList.remove('selected');
    } else {
        element.classList.toggle('selected');
    }

    if (element.classList.contains('selected')) {
        settingsElement.style.display = "inline-flex";
    } else {
        settingsElement.style.display = "none";
    }
}

function toggleSearch(state) {
    var element = document.getElementById('button-search');

    if (state == "on") {
        element.classList.add('selected');
    } else if (state == "off") {
        element.classList.remove('selected');
    } else if (state == "toggle") {
        element.classList.toggle('selected');
    }

    if (element.classList.contains('selected')) {
        toggleSettings("on");
        toggleTimings("off");
        toggleFlags("off");
        toggleIKFlags("off");
        toggleEntity("off");
        toggleAnimHelp("off");
        document.getElementById('button-search').focus();
        document.getElementById('animSearchField').style.display = "flex";
        document.getElementById('animDictList').style.display = "flex";
        document.getElementById("animDictList").scrollLeft = -1000;
        document.getElementById('animList').style.display = "flex";
        document.getElementById("animList").scrollLeft = -1000;
    } else {
        document.getElementById('animSearchField').style.display = "none";
        document.getElementById('animDictList').style.display = "none";
        document.getElementById('animList').style.display = "none";
        document.getElementById('valueAnimSearch').blur();
    }
}

function toggleTimings(state) {
    var element = document.getElementById('button-timings');

    if (state == "on") {
        element.classList.add('selected');
    } else if (state == "off") {
        element.classList.remove('selected');
    } else if (state == "toggle") {
        element.classList.toggle('selected');
    }

    if (element.classList.contains('selected')) {
        toggleSettings("on");
        toggleSearch("off");
        toggleFlags("off");
        toggleIKFlags("off");
        toggleEntity("off");
        toggleAnimHelp("off");
        document.getElementById('button-timings').focus();
        document.getElementById('animTimingsOptions').style.display = "flex";
    } else {
        document.getElementById('animTimingsOptions').style.display = "none";
        if (document.activeElement.classList.contains('entryField')) {
            document.activeElement.blur();
        }
    }
}

function toggleFlags(state) {
    var element = document.getElementById('button-flags');

    if (state == "on") {
        element.classList.add('selected');
    } else if (state == "off") {
        element.classList.remove('selected');
    } else if (state == "toggle") {
        element.classList.toggle('selected');
    }

    if (element.classList.contains('selected')) {
        toggleSettings("on");
        toggleSearch("off");
        toggleTimings("off");
        toggleIKFlags("off");
        toggleEntity("off");
        toggleAnimHelp("off");
        document.getElementById('button-flags').focus();
        document.getElementById('animFlagsOptions').style.display = "flex";
    } else {
        document.getElementById('animFlagsOptions').style.display = "none";
        if (document.activeElement.classList.contains('entryField')) {
            document.activeElement.blur();
        }
    }
}

function toggleFlag(flag) {
    var flagElement = document.getElementById("flag-" + flag);
    flagElement.classList.toggle("selected");

    FlagTotals = 0;
    for (var i=0; i < 32 ; i++) {
        let value = toUint32(1 << i);
        var calcFlagElement = document.getElementById("flag-" + value);
        if (calcFlagElement.classList.contains("selected")) {
            FlagTotals += value;
        }
    }
    document.getElementById("flagTotals").innerHTML = FlagTotals;

    switch(flag) {
        case 1:
            var selected = flagElement.classList.contains("selected");
            if (selected) {
                document.getElementById("button-repeat").classList.add("selected");
            } else {
                document.getElementById("button-repeat").classList.remove("selected");
            }
            break;
        case 8:
        case 16:
            var flag8selected = document.getElementById("flag-8").classList.contains("selected");
            var flag16selected = document.getElementById("flag-16").classList.contains("selected");
            if (flag8selected && flag16selected) {
                document.getElementById("button-torso").classList.add("selected");
            } else {
                document.getElementById("button-torso").classList.remove("selected");
            }
            break;
            break;
    }
}

function toggleIKFlags(state) {
    var element = document.getElementById('button-ikflags');

    if (state == "on") {
        element.classList.add('selected');
    } else if (state == "off") {
        element.classList.remove('selected');
    } else if (state == "toggle") {
        element.classList.toggle('selected');
    }

    if (element.classList.contains('selected')) {
        toggleSettings("on");
        toggleSearch("off");
        toggleTimings("off");
        toggleFlags("off");
        toggleEntity("off");
        toggleAnimHelp("off");
        document.getElementById('button-ikflags').focus();
        document.getElementById('animIKFlagsOptions').style.display = "flex";
    } else {
        document.getElementById('animIKFlagsOptions').style.display = "none";
        if (document.activeElement.classList.contains('entryField')) {
            document.activeElement.blur();
        }
    }
}

function toggleIKFlag(flag) {
    var flagElement = document.getElementById("ikflag-" + flag);
    flagElement.classList.toggle("selected");

    IKFlagTotals = 0;
    for (var i=0; i < 31 ; i++) {
        let value = toUint32(1 << i);
        var calcFlagElement = document.getElementById("ikflag-" + value);
        if (calcFlagElement.classList.contains("selected")) {
            IKFlagTotals += value;
        }
    }
    document.getElementById("IKFlagTotals").innerHTML = IKFlagTotals;
}

function toggleEntity(state) {
    var element = document.getElementById('button-entity');

    if (state == "on") {
        element.classList.add('selected');
    } else if (state == "off") {
        element.classList.remove('selected');
    } else if (state == "toggle") {
        element.classList.toggle('selected');
    }

    if (element.classList.contains('selected')) {
        toggleSettings("on");
        toggleSearch("off");
        toggleTimings("off");
        toggleFlags("off");
        toggleIKFlags("off");
        toggleAnimHelp("off");
        document.getElementById('button-entity').focus();
        document.getElementById('animEntityOptions').style.display = "flex";
    } else {
        document.getElementById('animEntityOptions').style.display = "none";
    }
}

function toggleAnimHelp(state) {
    helpElement = document.getElementById('animHelp');
    if (state == "on") {
        helpElement.style.display = "block";
    } else if (state == "off") {
        helpElement.style.display = "none";
    } else if (state == "toggle") {
        if ($('#animHelp').is(':visible')) {
            helpElement.style.display = "none";
        } else {
            helpElement.style.display = "block";
        }
    }
}

