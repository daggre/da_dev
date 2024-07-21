var RedMObjects = {

    "p_campfire02x": "Campfire",
    "p_ik_handshake": 0x4,
}
var ControlPassActive = false
var SelectedObjectSpawnType = "object"
var SelectedObjectFavs = false

function ToUint32(value) { return value >>> 0; }

function isVisible(el) {
    var style = window.getComputedStyle(el)
    if (style.display == "none") { return false; }
    if (style.visibility == "hidden") { return false; }
    return true;
}

function ToggleSelected(el, state = "toggle") {
    if (state == "on") {
        el.classList.add('selected');
    } else if (state == "off") {
        el.classList.remove('selected');
    } else if (state == "toggle") {
        el.classList.toggle('selected');
    }
}

function ToggleSpawnFavs(state) {
    var favselement = document.getElementById('button-spawnfavs');

    if (state == "on") {
        favselement.classList.add('selected');
    } else if (state == "off") {
        favselement.classList.remove('selected');
    } else if (state == "toggle") {
        favselement.classList.toggle('selected');
    }

    SelectedObjectFavs = favselement.classList.contains('selected');
    console.log("SelectedObjectFavs: " + SelectedObjectFavs);
}

function ResetListGroup(element, display) {
    var el = document.getElementById(element);
    el.style.display = display;
    el.innerHTML = "";
    el.scrollTop = 0;
    el.scrollLeft = -1000;
}

function SelectSpawnType(spawnType) {
    if (spawnType == SelectedObjectSpawnType) { return; }
    if (spawnType != "object" &&
        spawnType != "ped" &&
        spawnType != "vehicle" &&
        spawnType != "propset" &&
        spawnType != "other") {
        console.log("Invalid spawn type: " + spawnType);
        return;
    }
    document.getElementById('button-spawn' + SelectedObjectSpawnType).classList.remove('selected');
    SelectedObjectSpawnType = spawnType;
    document.getElementById('button-spawn' + SelectedObjectSpawnType).classList.add('selected');

    ResetListGroup("objData", "none");
    document.getElementById('objSearch').innerHTML = "";
    document.getElementById('objSearch').focus();
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

function ClipboardCopy(val) {
    var $temp = $("<input>");
    $("#copyField").append($temp);
    $temp.val(val).select();
    console.log(val)
    document.execCommand("copy");
    $temp.remove();
}

function TransitionHUD(to) {
    if (isVisible(document.getElementById('animHUD'))) {
        ToggleUIAnim("off");
        SendClientMessage('transitionControl', {
            from: "animHUD",
            to: to,
        });
        ControlPassActive = false;
    }
}

function ToggleUI(data) {
    switch(data.value) {
        case "devTreeHUD":
            ToggleUIDevTree(data)
            break;
        case "animHUD":
            ToggleUIAnim("on");
            break;
        case "objectHUD":
            ToggleUIObject(data.mode);
            break;
        case "cameraHUD":
            ToggleUICam(data.mode)
            if (data.mode == "on") {
                UpdateUICam(data.camera)
            }
            break;
        default:
            break;
    }
}

window.onload = function() {
    window.addEventListener('message', function(msg) {
        switch(msg.data.type) {
            case "displayHUD":
                ToggleUI(msg.data);
                break;
            case "objUpdate":
                UpdateCrosshair(msg.data.data);
                break;
            case "clipboard":
                ClipboardCopy(msg.data.text);
                break;
        }
    })
    ToggleUI({value: "objectHUD"});
    ToggleUI({value: "cameraHUD"});
}

$(document).ready(function() {
    $(document).mousedown(function(event) {
        if (isVisible(document.getElementById('animHUD'))) {
            switch(event.button) {
            case 0: // Left Click
                if (event.target.id == "activeAnimDict" || event.target.id == "activeAnimName") {
                    if (event.target.innerHTML != "") {
                        ClipboardCopy(event.target.innerHTML);
                    }
                }
                break;
            case 2: // Right Click
                ControlPassActive = true;
                SendClientMessage('controlPass', { enable: true });
                break;
            }
        }
    });

    $(document).mouseup(function(event) {
        if (isVisible(document.getElementById('animHUD'))) {
            switch(event.button) {
            case 2: // Right Click
                ControlPassActive = false;
                SendClientMessage('controlPass', { enable: false })
                break;
            }
        }
    });

    $(document).keydown(function(event) {
        if (ControlPassActive) { return; }
        if (event.key != "Escape" && event.target.getAttribute('contenteditable') == "true") { return; }

        if (isVisible(document.getElementById('devTreeHUD'))) {
            HandleKeysDevTree(event);
            return;
        }

        if (isVisible(document.getElementById('animHUD'))) {
            HandleKeysAnim(event);
            return;
        }

        if (isVisible(document.getElementById('objectHUD'))) {
            HandleKeysObject(event);
            return;
        }

        if (isVisible(document.getElementById('cameraHUD'))) {
            HandleKeysCam(event);
            return;
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
            SearchRedMAnims(this.innerHTML);
        }
    });

    $("div#objSearch.entryField").keydown(function(e) {
        if (e.code == "Enter") {
            console.log("searching for obj", this.innerHTML);
            e.preventDefault();
            ResetListGroup("objData", "flex");
            SearchBasicRedMList(this.innerHTML, RedMObjects, "objData");
        }
    });

    $("div#nearbyRange.entryField").keydown(function(e) {
        if (e.code == "Enter") {
            console.log("setting nearby object range", this.innerHTML);
            e.preventDefault();
            // SendClientMessage('nearbyObjects', { range: this.innerHTML });
            GetTrackedObjects();
        }
    });

    SendClientMessage('initAnims', {}).then(function(resp) {
        Animations = JSON.parse(resp.animations);
    });

    SendClientMessage('initObjects', {}).then(function(resp) {
        RedMObjects = JSON.parse(resp.objects);
    });

    SendClientMessage('initAnimFlags', {}).then(function(resp) {
        var flagList = document.getElementById('animFlagsOptions');
        var ul = document.createElement('ul');

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
            flagField.setAttribute('onclick', "ToggleFlag(" + flag.value + ")");

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
            flagField.setAttribute('onclick', "ToggleIKFlag(" + flag.value + ")");

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


// Dev Tree HUD //
var DevKeys = {}
var HudTree = {}
var TreeKeys = {}

function ToggleUIDevTree(data) {
    TransitionHUD(data.value);
    InitializeTree(data.optionTree[0]);
    document.getElementById('devTreeHUD').style.display = "flex";
}

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

function HandleKeysDevTree(event) {
    let key = event.key
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
        document.getElementById('devTreeHUD').style.display = "none";
    } else {
        SendClientMessage('exit', { key: translatedKey });
        document.getElementById('devTreeHUD').style.display = "none";
    }
}

// Object HUD //
function ToggleUIObject(state) {
    document.getElementById('objSearchField').style.display = "none";
    document.getElementById('objData').style.display = "none";

    if (state == "on") {
        document.getElementById('objectHUD').style.display = "flex";
        document.getElementById('objControlOptions').style.display = "flex";
    } else if (state == "off") {
        document.getElementById('objectHUD').style.display = "none";
        document.getElementById('objControlOptions').style.display = "none";
    } else {
        if (isVisible(document.getElementById('objectHUD'))) {
            document.getElementById('objectHUD').style.display = "none";
            document.getElementById('objControlOptions').style.display = "none";
        } else {
            document.getElementById('objectHUD').style.display = "flex";
            document.getElementById('objControlOptions').style.display = "flex";
        }
    }
}

function UpdateCrosshair(data) {
	var crosshair = document.querySelector('#crosshair');
	if (data.selected) {
		crosshair.className = 'selected';
	} else if (data.obj > 0) {
		crosshair.className = 'active';
	} else {
		crosshair.className = 'inactive';
    }
}

function ToggleUICam(state) {
    if (state == "on") {
        document.getElementById('cameraHUD').style.display = "flex";
    } else if (state == "off") {
        document.getElementById('cameraHUD').style.display = "none";
    } else {
        if (isVisible(document.getElementById('cameraHUD'))) {
            document.getElementById('cameraHUD').style.display = "none";
        } else {
            document.getElementById('cameraHUD').style.display = "flex";
        }
    }
}

function UpdateUICam(data) {
    document.getElementById('cam-speed').innerHTML = data.speed;
    document.getElementById('cam-mode').innerHTML = data.cameraMode;
    document.getElementById('cam-noclip').innerHTML = data.noclip;
}

// Animation HUD //
var Animations = {}
var FlagTotals = 0
var IKFlagTotals = 0
var KeyPressRepeat = false

function ToggleUIAnim(state) {
    // Toggle all submenus off
    document.getElementById('animDictList').style.display = "none";
    document.getElementById('animList').style.display = "none";
    document.getElementById('animSearchField').style.display = "none";
    document.getElementById('animTimingsOptions').style.display = "none";
    document.getElementById('animFlagsOptions').style.display = "none";
    document.getElementById('animIKFlagsOptions').style.display = "none";
    document.getElementById('animEntityOptions').style.display = "none";

    if (state == "on") {
        document.getElementById('animHUD').style.display = "flex";
        document.getElementById('animControlOptions').style.display = "flex";
        document.getElementById('activeAnimDisplay').style.display = "flex";
    } else if (state == "off") {
        document.getElementById('animHUD').style.display = "none";
        document.getElementById('animControlOptions').style.display = "none";
        document.getElementById('activeAnimDisplay').style.display = "none";
    } else {
        if (isVisible(document.getElementById('animHUD'))) {
            document.getElementById('animHUD').style.display = "none";
            document.getElementById('animControlOptions').style.display = "none";
            document.getElementById('activeAnimDisplay').style.display = "none";
        } else {
            document.getElementById('animHUD').style.display = "flex";
            document.getElementById('animControlOptions').style.display = "flex";
            document.getElementById('activeAnimDisplay').style.display = "flex";
        }
    }
}

function PlayAnimation() {
    var animDict = document.getElementById("activeAnimDict").innerHTML;
    var anim = document.getElementById("activeAnimName").innerHTML;
    if (anim == "" || animDict == "") { return; }
    var entity = document.getElementById("animEntityField").innerHTML;
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

function SearchAnims(animDict) {
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
            TogglePlay("on");
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

function SearchBasicRedMList(searchValue, searchList, elementId) {
    var el = document.getElementById(elementId);
    var maxResults = 10000;
    var results = [];

    el.innerHTML = "";
    if (!searchValue || searchValue == "") { return; }

    Object.keys(searchList).forEach(v => {
        if (v.toLowerCase().includes(searchValue.toLowerCase())) {
            results.push({
                value: v
            });
        }
    });

    results.sort(function(a, b) {
        if (a.value < b.value) {
            return -1;
        }
        if (a.value > b.value) {
            return 1;
        }
        return 0;
    });

    var ul = document.createElement('ul');
    for (var i=0; i < results.length && i < maxResults; ++i) {
        var li = document.createElement('li');
        li.addEventListener('click', function() {
            document.getElementById("activeObject").innerHTML = this.innerHTML;
            // Select Object
        })
        li.innerHTML = results[i].value;
        ul.appendChild(li);
    }
    el.appendChild(ul);
    if (results.length < 30) {
        el.style.minHeight = results.length + ".4vh";
    } else {
        el.style.minHeight = "30vh";
    }
    el.scrollTop = 0;
    el.scrollLeft = -1000;
}

function SearchRedMAnims(searchValue) {
    var el = document.getElementById("animDictList");
    var maxResults = 10000;
    var results = [];

    el.innerHTML = "";
    if (!searchValue || searchValue == "") { return; }

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

    var ul = document.createElement('ul');
    for (var i=0; i < results.length && i < maxResults; ++i) {
        var li = document.createElement('li');
        li.addEventListener('click', function() {
            document.getElementById("activeAnimDict").innerHTML = this.innerHTML;
            document.getElementById("activeAnimName").innerHTML = "";
            SearchAnims(this.innerHTML)
        })
        li.innerHTML = results[i].animDict;
        ul.appendChild(li);
    }
    el.appendChild(ul);
    if (results.length < 30) {
        el.style.minHeight = results.length + ".4vh";
    } else {
        el.style.minHeight = "30vh";
    }
    el.scrollTop = 0;
    el.scrollLeft = -1000;
}

function TogglePlay(state = "toggle") {
    var el = document.getElementById('button-play');
    ToggleSelected(el, state);
    if (state != "off") {
        setTimeout(function() {
            ToggleSelected(el, "off");
        }, 100);
    } else { return; }
    PlayAnimation();
}

function ToggleStop() {
    s_el = document.getElementById('button-stop');
    s_el.classList.toggle('selected');
    var p_el = document.getElementById('button-play');
    p_el.classList.remove('selected');
    setTimeout(function() {
        s_el.classList.remove('selected');
    }, 200);
    SendClientMessage('stopAnim', {})
}

function ToggleLoop() { ToggleFlag(1); }

function ToggleTorso(state) {
    var el = document.getElementById('button-torso');
    var flag8 = document.getElementById('flag-8');
    var flag16 = document.getElementById('flag-16');

    if (state == "on") {
        el.classList.add('selected');
        if (!flag8.classList.contains('selected')) { ToggleFlag(8); }
        if (!flag16.classList.contains('selected')) { ToggleFlag(16); }
    } else if (state == "off") {
        el.classList.remove('selected');
        if (flag8.classList.contains('selected')) { ToggleFlag(8); }
        if (flag16.classList.contains('selected')) { ToggleFlag(16); }
    } else if (state == "toggle") {
        el.classList.toggle('selected');
        var enabled = el.classList.contains('selected');
        if (enabled) {
            if (!flag8.classList.contains('selected')) { ToggleFlag(8); }
            if (!flag16.classList.contains('selected')) { ToggleFlag(16); }
        } else {
            if (flag8.classList.contains('selected')) { ToggleFlag(8); }
            if (flag16.classList.contains('selected')) { ToggleFlag(16); }
        }
    }
}

function ToggleSettings(state) {
    var el = document.getElementById('button-settings');
    ToggleSelected(el, state);

    var el_s = document.getElementById('animSettings');
    if (el.classList.contains('selected')) {
        el_s.style.display = "inline-flex";
    } else {
        el_s.style.display = "none";
    }
}

function ToggleSearch(state) {
    var el = document.getElementById('button-search');
    ToggleSelected(el, state);

    if (el.classList.contains('selected')) {
        ToggleSettings("on");
        ToggleTimings("off");
        ToggleFlags("off");
        ToggleIKFlags("off");
        ToggleEntity("off");
        ToggleHelp("animHelp", "off")
        document.getElementById('button-search').focus();
        document.getElementById('animSearchField').style.display = "flex";
        document.getElementById('animDictList').style.display = "flex";
        document.getElementById('animDictList').scrollLeft = -1000;
        document.getElementById('animList').style.display = "flex";
        document.getElementById('animList').scrollLeft = -1000;
    } else {
        document.getElementById('animSearchField').style.display = "none";
        document.getElementById('animDictList').style.display = "none";
        document.getElementById('animList').style.display = "none";
        document.getElementById('valueAnimSearch').blur();
    }
}

function ToggleTimings(state) {
    var el = document.getElementById('button-timings');
    ToggleSelected(el, state);

    if (el.classList.contains('selected')) {
        ToggleSettings("on");
        ToggleSearch("off");
        ToggleFlags("off");
        ToggleIKFlags("off");
        ToggleEntity("off");
        ToggleHelp("animHelp", "off")
        document.getElementById('button-timings').focus();
        document.getElementById('animTimingsOptions').style.display = "flex";
    } else {
        document.getElementById('animTimingsOptions').style.display = "none";
        if (document.activeElement.classList.contains('entryField')) {
            document.activeElement.blur();
        }
    }
}

function ToggleFlags(state) {
    var el = document.getElementById('button-flags');
    ToggleSelected(el, state);

    if (el.classList.contains('selected')) {
        ToggleSettings("on");
        ToggleSearch("off");
        ToggleTimings("off");
        ToggleIKFlags("off");
        ToggleEntity("off");
        ToggleHelp("animHelp", "off")
        document.getElementById('button-flags').focus();
        document.getElementById('animFlagsOptions').style.display = "flex";
    } else {
        document.getElementById('animFlagsOptions').style.display = "none";
        if (document.activeElement.classList.contains('entryField')) {
            document.activeElement.blur();
        }
    }
}

function ToggleFlag(flag) {
    var el = document.getElementById("flag-" + flag);
    el.classList.toggle("selected");

    FlagTotals = 0;
    for (var i=0; i < 32 ; i++) {
        let v = ToUint32(1 << i);
        if (document.getElementById("flag-" + v).classList.contains("selected")) {
            FlagTotals += v;
        }
    }
    document.getElementById("flagTotals").innerHTML = FlagTotals;

    switch(flag) {
        case 1:
            var selected = el.classList.contains("selected");
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
    }
}

function ToggleIKFlags(state) {
    var el = document.getElementById('button-ikflags');
    ToggleSelected(el, state);

    if (el.classList.contains('selected')) {
        ToggleSettings("on");
        ToggleSearch("off");
        ToggleTimings("off");
        ToggleFlags("off");
        ToggleEntity("off");
        ToggleHelp("animHelp", "off")
        document.getElementById('button-ikflags').focus();
        document.getElementById('animIKFlagsOptions').style.display = "flex";
    } else {
        document.getElementById('animIKFlagsOptions').style.display = "none";
        if (document.activeElement.classList.contains('entryField')) {
            document.activeElement.blur();
        }
    }
}

function ToggleIKFlag(flag) {
    var el = document.getElementById("ikflag-" + flag);
    el.classList.toggle("selected");

    IKFlagTotals = 0;
    for (var i=0; i < 31 ; i++) {
        let v = ToUint32(1 << i);
        if (document.getElementById("ikflag-" + v).classList.contains("selected")) {
            IKFlagTotals += v;
        }
    }
    document.getElementById("IKFlagTotals").innerHTML = IKFlagTotals;
}

function ToggleEntity(state) {
    var el = document.getElementById('button-entity');
    ToggleSelected(el, state);

    if (el.classList.contains('selected')) {
        ToggleSettings("on");
        ToggleSearch("off");
        ToggleTimings("off");
        ToggleFlags("off");
        ToggleIKFlags("off");
        ToggleHelp("animHelp", "off")
        document.getElementById('button-entity').focus();
        document.getElementById('animEntityOptions').style.display = "flex";
    } else {
        document.getElementById('animEntityOptions').style.display = "none";
    }
}

function ToggleHelp(elementId, state, disableCursor = false) {
    el = document.getElementById(elementId);
    el_x = document.getElementById('crosshair');
    if (state == "on") {
        el.style.display = "block";
        if (disableCursor) { el_x.style.display = "none"; }
    } else if (state == "off") {
        el.style.display = "none";
        if (disableCursor) { el_x.style.display = "block"; }
    } else if (state == "toggle") {
        if (isVisible(el)) {
            el.style.display = "none";
            if (disableCursor) { el_x.style.display = "block"; }
        } else {
            el.style.display = "block";
            if (disableCursor) { el_x.style.display = "none"; }
        }
    }
}

function HandleKeysAnim(event) {
    switch(event.key) {
        case "Escape":
            var escaped = false;
            if (isVisible(document.getElementById('animHelp'))) {
                ToggleHelp("animHelp", "off")
                return;
            }
            if (isVisible(document.getElementById('animSearchField'))) {
                ToggleSearch("off");
                escaped = true;
            }
            if (isVisible(document.getElementById('animTimingsOptions'))) {
                ToggleTimings("off");
                escaped = true;
            }
            if (isVisible(document.getElementById('animFlagsOptions'))) {
                ToggleFlags("off");
                escaped = true;
            }
            if (isVisible(document.getElementById('animIKFlagsOptions'))) {
                ToggleIKFlags("off");
                escaped = true;
            }
            if (isVisible(document.getElementById('animEntityOptions'))) {
                ToggleEntity("off");
                escaped = true;
            }
            if (escaped == true) { return; }

            SendClientMessage('exit', {});
            document.getElementById('devTreeHUD').style.display = "none";
            ToggleUIAnim("off");

            return;
        case " ":
            if (typeof event.target.onclick == "function") {
                event.target.onclick.apply();
            } else {
                TogglePlay();
            }
            break;
        case "?":
        case "h":
            ToggleHelp("animHelp", "toggle")
            break;
        case "Backspace":
            ToggleStop();
            break;
        case "c":
            ToggleSettings("toggle");
            break;
        case "2":
        case "t":
            ToggleTimings("toggle");
            event.preventDefault();
            break;
        case "4":
        case "o":
            ToggleFlags("toggle");
            break;
        case "3":
        case "i":
            ToggleIKFlags("toggle");
            break;
        case "5":
        case "e":
            ToggleEntity("toggle");
            break;
        case "s":
        case "k":
            ToggleStop();
            break;
        case "l":
            ToggleLoop();
            break;
        case "u":
            ToggleTorso("toggle");
            break;
        case "1":
        case "F":
        case "f":
            if (KeyPressRepeat || event.shiftKey) {
                ToggleSearch("on");
                document.getElementById('valueAnimSearch').focus();
                event.preventDefault();
            } else {
                ToggleSearch("toggle");
            }
            KeyPressRepeat = true;
            setTimeout(function() { KeyPressRepeat = false; }, 650);
            break;
        case "x":
            if (isVisible(document.getElementById('animSearchField'))) {
                // Clear search
                document.getElementById('animDictList').innerHTML = "";
                document.getElementById('animList').innerHTML = "";
                document.getElementById('valueAnimSearch').innerHTML = "";
                document.getElementById('valueAnimSearch').focus();
            } else if (isVisible(document.getElementById("animTimingsOptions"))) {
                // Reset timings to defaults
                document.getElementById("timingBlendIn").innerHTML = "1.0";
                document.getElementById("timingBlendOut").innerHTML = "1.0";
                document.getElementById("timingPlayback").innerHTML = "0";
                document.getElementById("timingDuration").innerHTML = "-1";
            } else if (isVisible(document.getElementById("animFlagsOptions"))) {
                // Clear all flags
                for (var i=0; i < 32 ; i++) {
                    let v = ToUint32(1 << i);
                    if (document.getElementById("flag-" + v).classList.contains("selected")) {
                        ToggleFlag(v);
                    }
                }
            } else if (isVisible(document.getElementById("animIKFlagsOptions"))) {
                // Clear all ikflags
                for (var i=0; i < 32 ; i++) {
                    let v = ToUint32(1 << i);
                    if (document.getElementById("ikflag-" + v).classList.contains("selected")) {
                        ToggleIKFlag(v);
                    }
                }
            } else if (isVisible(document.getElementById("animEntityOptions"))) {
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
            TogglePlay();
            break;
    }
}

function HandleKeysCam(event) {
    switch(event.key) {
        case "Escape":
            if (isVisible(document.getElementById('camHelp'))) {
                ToggleHelp("camHelp", "off");
                return;
            }
            SendClientMessage('camera', { mode: "player" });
            SendClientMessage('noclip', { mode: "off" });
            break;
        case "?":
        case "h":
            ToggleHelp("camHelp", "toggle");
            break;
            }
}

function ResetObjData() {
    document.getElementById('objSpawnOptions').style.display = "none";
    document.getElementById('objData').style.display = "none";
    // document.getElementById('objNearbyControl').style.display = "none";
    document.getElementById('objNearbyRange').style.display = "none";
    document.getElementById('objNearbyResults').style.display = "none";
}

function ResetNearbyData() {
    document.getElementById('objNearbyResults').innerHTML = "";
}

function ToggleControlObjectSpawn(state) {
    var el = document.getElementById('button-objectspawn');
    ToggleSelected(el, state);
    var el_o = document.getElementById('objControlSpawnOptions');
    if (el.classList.contains('selected')) {
        ToggleControlScene("off");
        el_o.style.display = "inline-flex";
    } else {
        el_o.style.display = "none";
    }
}

function ToggleObjectSpawn(state) {
    var el = document.getElementById('button-spawn');
    ToggleSelected(el, state);

    if (el.classList.contains('selected')) {
        ToggleHelp("objHelp", "off", true)
        ToggleControlObjectSpawn("on");
        ResetObjData();
        document.getElementById('button-spawnfavs').classList.remove('selected');
        document.getElementById('button-trackedobjlist').classList.remove('selected');
        document.getElementById('objSearchField').style.display = "flex";
        document.getElementById('objSearchList').style.display = "flex";
        document.getElementById('objSpawnOptions').style.display = "inline-flex";
        document.getElementById('objData').style.display = "flex";
    } else {
        ResetObjData();
        document.getElementById('objSearchField').style.display = "none";
        document.getElementById('objSearchList').style.display = "none";
        if (document.activeElement.classList.contains('entryField')) {
            document.activeElement.blur();
        }
    }
}

function ToggleObjectFavsSpawn(state) {
    var el = document.getElementById('button-spawnfavs');
    ToggleSelected(el, state);

    if (el.classList.contains('selected')) {
    } else {
    }
}

function ToggleTrackedList(state) {
    var el = document.getElementById('button-trackedobjlist');
    ToggleSelected(el, state);

    if (el.classList.contains('selected')) {
        ToggleHelp("objHelp", "off", true)
        ToggleControlScene("off");
        ToggleControlObjectSpawn("on");
        ResetObjData();
        GetTrackedObjects();
        document.getElementById('button-spawn').classList.remove('selected');
        document.getElementById('button-spawnfavs').classList.remove('selected');
        document.getElementById('objSearchField').style.display = "none";
        document.getElementById('objSearchList').style.display = "flex";
        // document.getElementById('objNearbyControl').style.display = "inline-flex";
        document.getElementById('objNearbyRange').style.display = "flex";
        document.getElementById('objNearbyResults').style.display = "flex";
    } else {
        document.getElementById('objSearchField').style.display = "none";
        document.getElementById('objSearchList').style.display = "none";
        document.getElementById('objSpawnOptions').style.display = "none";
    }
}

function ToggleControlScene(state) {
    var el = document.getElementById('button-objectscene');
    ToggleSelected(el, state);

    if (el.classList.contains('selected')) {
        ToggleHelp("objHelp", "off", true)
        ToggleObjectSpawn("off");
        ToggleControlObjectSpawn("off");
        ResetObjData();
        document.getElementById('objSceneOptions').style.display = "inline-flex";
    } else {
        document.getElementById('objSceneOptions').style.display = "none";
    }
}

function ToggleSceneMove(state) {
    var el = document.getElementById('button-scenecontrol');
    ToggleSelected(el, state);

    if (el.classList.contains('selected')) {
        ToggleHelp("objHelp", "off", true)
        ToggleControlObjectSpawn("off");
        ToggleControlScene("on");
        document.getElementById('button-scenetags').classList.remove('selected');
        document.getElementById('button-importexport').classList.remove('selected');
        document.getElementById('objSpawnOptions').style.display = "none";
        document.getElementById('objSearchList').style.display = "flex";
    } else {
        document.getElementById('objSearchList').style.display = "none";
    }
}

function ToggleSceneTag(state) {
    var el = document.getElementById('button-scenetags');
    ToggleSelected(el, state);

    if (el.classList.contains('selected')) {
        ToggleHelp("objHelp", "off", true)
        ToggleControlObjectSpawn("off");
        ToggleControlScene("on");
        document.getElementById('button-scenecontrol').classList.remove('selected');
        document.getElementById('button-importexport').classList.remove('selected');
        document.getElementById('objSpawnOptions').style.display = "none";
        document.getElementById('objSearchList').style.display = "flex";
    } else {
        document.getElementById('objSearchList').style.display = "none";
    }
}

function ToggleImportExport(state) {
    var el = document.getElementById('button-importexport');
    ToggleSelected(el, state);

    if (el.classList.contains('selected')) {
        ToggleHelp("objHelp", "off", true)
        ToggleControlObjectSpawn("off");
        ToggleControlScene("on");
        document.getElementById('button-scenecontrol').classList.remove('selected');
        document.getElementById('button-scenetags').classList.remove('selected');
        document.getElementById('objSpawnOptions').style.display = "none";
        document.getElementById('objSearchList').style.display = "flex";
    } else {
        document.getElementById('objSearchList').style.display = "none";
    }
}

function GetTrackedObjects() {
    var elID = "objNearbyResults";
    ResetListGroup(elID, "flex");
    // SendClientMessage('trackedObjects', {});
    var el = document.getElementById(elID);

    el.innerHTML = "";
    var ul = document.createElement('ul');
    for (var i=0; i < 50; ++i) {
        var li = document.createElement('li');
        li.innerHTML = "test " + i;
        ul.appendChild(li);
    }
    el.appendChild(ul);
    el.style.minHeight = "30vh";
    el.scrollTop = 0;
    el.scrollLeft = -1000;
}

function HandleKeysObject(event) {
    switch(event.key) {
        case "Escape":
            if (document.activeElement.classList.contains('entryField')) {
                document.activeElement.blur();
                return;
            }
            if (isVisible(document.getElementById('objHelp'))) {
                ToggleHelp("objHelp", "off", true)
            }
            ToggleObjectSpawn("off");
            ToggleTrackedList("off");
            ToggleSceneMove("off");
            ToggleSceneTag("off");
            ToggleImportExport("off");
            document.getElementById('objControlSpawnOptions').style.display = "none";
            document.getElementById('objSceneOptions').style.display = "none";

            // Usually would exit object mode, but Gizmo exit also would exit
            // object mode, unless we can detect gizmo exit
            break;
        case " ":
            if (typeof event.target.onclick == "function") {
                event.target.onclick.apply();
                event.preventDefault();
            }
            break;
        case "!":
        case "1":
            var focusButton = false;
            if (isVisible(document.getElementById('objSearchField'))) {
                document.getElementById('objSearch').focus();
                event.preventDefault();
                break;
            } else {
                focusButton = true;
            }
            ToggleObjectSpawn("on");
            if (focusButton) {
                document.getElementById('button-spawn').focus();
            }
            break;
        case "2":
            var focusButton = false;
            if (isVisible(document.getElementById('objNearbyRange'))) {
                document.getElementById('nearbyRange').focus();
                event.preventDefault();
                break;
            } else {
                focusButton = true;
            }
            ToggleTrackedList("on");
            if (focusButton) {
                document.getElementById('button-trackedobjlist').focus();
            }
            break;
        case "3":
            break;
        case "4":
            ToggleSceneMove("on");
            break;
        case "5":
            ToggleSceneTag("on");
            break;
        case "6":
            ToggleImportExport("on");
            break;
        case "Backspace":
            SendClientMessage('objectMode', { mode: "off" });
            break;
        case "?":
        case "h":
            ToggleHelp("objHelp", "toggle", true)
            break;
        case "x":
            if (isVisible(document.getElementById('objSearchField'))) {
                document.getElementById('objSearch').innerHTML = "";
                ResetListGroup("objData", "flex");

            }
            if (isVisible(document.getElementById('objNearbyRange'))) {
                document.getElementById('objNearbyRange').innerHTML = "50";
                GetTrackedObjects();
            }
            break;
    }
}

