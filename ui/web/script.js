var Animations = {}
var FlagTotals = 0
var IKFlagTotals = 0
var KeyPressRepeat = false

var SpawnOption = new Map();
var ControlPassActive = false
var GizmoActive = false
var GizmoActivePassthrough = false
var SelectedObjectSpawnType = "objects"
var SelectedObjectFavs = false
var TrackedObjectsLoopRunning = false
var MouseDown = false
var LeftClickActive = false
var CursorPosDelay = false
const ResolutionX = window.screen.width
const ResolutionY = window.screen.height

var Pressed = {}
var JustPressed = {}
var QuickPress = { Timeout: 400, MiddleMouse: { active: false, }, }

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
    if (spawnType != "objects" &&
        spawnType != "peds" &&
        spawnType != "vehicles" &&
        spawnType != "propsets" &&
        spawnType != "pickups" &&
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
        // ToggleUIAnim("off");
        // SendClientMessage('modifyMode', { mode: "anim", remove: true, })
        // SendClientMessage('modifyMode', { mode: to, add: true, })
        // ControlPassActive = false;
    }
}

function ToggleUI(data) {
    switch(data.value) {
        case "devTreeHUD":
            ToggleUIDevTree(data)
            break;
        case "anim":
            ToggleUIAnim(data.mode);
            break;
        case "object":
            ToggleUIObject(data.mode);
            break;
        case "camera":
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
            case "nuiUpdate":
                UpdateCrosshair(msg.data.objects);
                break;
            case "clipboard":
                ClipboardCopy(msg.data.text);
                break;
            case "controlPass":
                ControlPassActive = msg.data.enable;
                break;
            case "setGizmoState":
                GizmoActive = msg.data.data.shown
                break;
            case "toggleHelp":
                ToggleHelp(msg.data.mode, msg.data.state, msg.data.toggleCursor);
                break;
        }
    })
}

$(document).ready(function() {
    $(document).mousemove(function(event) {
        if (!CursorPosDelay && !ControlPassActive && !GizmoActive &&
                isVisible(document.getElementById('objectHUD')) &&
                !document.activeElement.classList.contains('entryField')) {
            CursorPosDelay = true;
            SendClientMessage('sendCursorPos', {
                x: event.clientX/ResolutionX,
                y: event.clientY/ResolutionY,
                click: LeftClickActive,
            });
            setTimeout(function() { CursorPosDelay = false; }, 30);
        }
    });

    $(document).mousedown(function(event) {
        MouseDown = true;
        switch(event.button) {
            case 0: // Left Click
                LeftClickActive = true;
                break;
        }
        if (isVisible(document.getElementById('animHUD'))) {
            switch(event.button) {
                case 0: // Left Click
                    if (event.target.id == "activeAnimDict" || event.target.id == "activeAnimName") {
                        if (event.target.innerHTML != "") {
                            ClipboardCopy(event.target.innerHTML);
                        }
                    }
                    break;
                case 1: // Middle Click
                    if (ControlPassActive) {
                        SendClientMessage('endPassthrough', {})
                        break;
                    }
                    QuickPress.MiddleMouse.active = true;
                    setTimeout(function() { QuickPress.MiddleMouse.active = false; }, QuickPress.Timeout);
                    SendClientMessage('modifyMode', {
                        mode: "anim",
                        focusCursor: false,
                        keepFocus: true,
                        passthrough: true,
                    });
                    break;
            }
        }
        if (isVisible(document.getElementById('objectHUD'))) {
            if (GizmoActive) {
                switch(event.button) {
                    case 1: // Middle Click
                        QuickPress.MiddleMouse.active = true;
                        setTimeout(function() { QuickPress.MiddleMouse.active = false; }, QuickPress.Timeout);
                        if (GizmoActivePassthrough) {
                            SendClientMessage('modifyMode', { mode: "gizmo", passthrough: false, });
                            GizmoActivePassthrough = false
                        } else {
                            SendClientMessage('modifyMode', { mode: "gizmo", passthrough: true, });
                            GizmoActivePassthrough = true
                        }
                        break;
                }
            } else {
                switch(event.button) {
                    case 0: // Left Click
                        // Modify this for objectHUD
                        if (event.target.id == "activeAnimDict" || event.target.id == "activeAnimName") {
                            if (event.target.innerHTML != "") {
                                ClipboardCopy(event.target.innerHTML);
                            }
                        }
                        if (!ControlPassActive) {
                            SendClientMessage('sendCursorKey', {
                                justPressed: { MouseLeft: true, }
                            });
                        }
                        break;
                    case 1: // Middle Click
                        if (ControlPassActive) {
                            SendClientMessage('endPassthrough', {})
                            break;
                        }
                        QuickPress.MiddleMouse.active = true;
                        setTimeout(function() { QuickPress.MiddleMouse.active = false; }, QuickPress.Timeout);
                        SendClientMessage('modifyMode', { mode: "object", passthrough: true, });
                        if (GizmoActive) {
                            SendClientMessage('modifyMode', { mode: "gizmo", requireActive: true, passthrough: true, });
                        }
                        break;
                }
            }
        }
    });

    $(document).mouseup(function(event) {
        MouseDown = false;
        switch(event.button) {
            case 0: // Left Click
                LeftClickActive = false;
                break;
        }
        if (isVisible(document.getElementById('animHUD'))) {
            switch(event.button) {
                case 1: // Middle Click
                    if (!QuickPress.MiddleMouse.active) {
                        SendClientMessage('endPassthrough', {})
                    }
                    break;
            }
        }
        if (isVisible(document.getElementById('objectHUD'))) {
            switch(event.button) {
                case 1: // Middle Click
                    if (!QuickPress.MiddleMouse.active) {
                        SendClientMessage('endPassthrough', {})
                    }
                    break;
            }
        }
    });


    $(document).keyup(function(event) {
        JustPressed[event.key] = false;
        Pressed[event.key] = false;
    });

    $(document).keydown(function(event) {
        if (ControlPassActive) { return; }

        if (!Pressed[event.key]) {
            JustPressed[event.key] = true;
        }
        Pressed[event.key] = true;

        if (event.key != "Escape" && event.target.getAttribute('contenteditable') == "true") { return; }
        if (event.key == "Escape" && GizmoActive) { return; }

        if (isVisible(document.getElementById('devTreeHUD'))) {
            HandleKeysDevTree(event);
        } else if (isVisible(document.getElementById('animHUD'))) {
            HandleKeysAnim(event);
        } else if (isVisible(document.getElementById('objectHUD'))) {
            HandleKeysObject(event);
        } else if (isVisible(document.getElementById('cameraHUD'))) {
            HandleKeysCam(event);
        }

        JustPressed[event.key] = false;
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
            console.log("searching for", SelectedObjectSpawnType, this.innerHTML);
            e.preventDefault();
            ResetListGroup("objData", "flex");
            SearchBasicRedMList(this.innerHTML, SpawnOption.get(SelectedObjectSpawnType), "objData");
        }
    });

    $("div#nearbyRange.entryField").keydown(function(e) {
        if (e.code == "Enter") {
            console.log("setting nearby object range", this.innerHTML);
            e.preventDefault();
            GetTrackedObjects();
        }
    });

    SendClientMessage('initAnims', {}).then(function(resp) {
        Animations = JSON.parse(resp.animations);
    });

    SendClientMessage('initObjects', {}).then(function(resp) {
        SpawnOption.set("objects", JSON.parse(resp.objects));
        SpawnOption.set("peds", JSON.parse(resp.peds));
        SpawnOption.set("vehicles", JSON.parse(resp.vehicles));
        SpawnOption.set("propsets", JSON.parse(resp.propsets));
        SpawnOption.set("pickups", JSON.parse(resp.pickups));
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

// Help HUD //
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

// Dev Tree Keys //
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

// Animation HUD //
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
    el.innerHTML = "";

    var maxResults = 10000;
    var results = searchList.filter(str => str.toLowerCase().includes(searchValue.toLowerCase()));
    var ul = document.createElement('ul');
    for (var i=0; i < results.length && i < maxResults; ++i) {
        var li = document.createElement('li');
        li.addEventListener('click', function() {
            document.getElementById("activeObject").innerHTML = this.innerHTML;
            // Select Object
        })
        li.innerHTML = results[i];
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
        setTimeout(function() { ToggleSelected(el, "off"); }, 100);
    } else { return; }
    PlayAnimation();
}

function ToggleStop() {
    s_el = document.getElementById('button-stop');
    s_el.classList.toggle('selected');
    var p_el = document.getElementById('button-play');
    p_el.classList.remove('selected');
    setTimeout(function() { s_el.classList.remove('selected'); }, 200);
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

// Anim Keys //
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

// Camera HUD //
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

// Cam Keys //
function HandleKeysCam(event) {
    switch(event.key) {
        case "Escape":
            if (isVisible(document.getElementById('camHelp'))) {
                ToggleHelp("camHelp", "off");
                return;
            }
            console.log("exiting camera mode");
            SendClientMessage('modifyMode', { mode: "freecam", remove: true, });
            SendClientMessage('modifyMode', { mode: "noclip", remove: true, });
            break;
        case "?":
        case "h":
            ToggleHelp("camHelp", "toggle");
            break;
            }
}

// Object HUD //
function ToggleUIObject(state) {
    document.getElementById('objSearchField').style.display = "none";
    document.getElementById('objData').style.display = "none";

    if (state == "on") {
        document.getElementById('objectHUD').style.display = "flex";
        document.getElementById('objControlOptions').style.display = "flex";
        document.getElementById('selectedObjectDisplay').style.display = "flex";
    } else if (state == "off") {
        document.getElementById('objectHUD').style.display = "none";
        document.getElementById('objControlOptions').style.display = "none";
        document.getElementById('selectedObjectDisplay').style.display = "none";
    } else {
        if (isVisible(document.getElementById('objectHUD'))) {
            document.getElementById('objectHUD').style.display = "none";
            document.getElementById('objControlOptions').style.display = "none";
            document.getElementById('selectedObjectDisplay').style.display = "none";
        } else {
            document.getElementById('objectHUD').style.display = "flex";
            document.getElementById('objControlOptions').style.display = "flex";
            document.getElementById('selectedObjectDisplay').style.display = "flex";
        }
    }
}

function UpdateCrosshair(data) {
	var crosshair = document.querySelector('#crosshair');
	if (data.select) {
		crosshair.className = 'selected';
	} else if (data.hover) {
		crosshair.className = 'active';
	} else {
		crosshair.className = 'inactive';
    }
}

function ResetObjData() {
    document.getElementById('objSpawnOptions').style.display = "none";
    document.getElementById('objData').style.display = "none";
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
        ToggleObjectDetails("off");
        el_o.style.display = "inline-flex";
    } else {
        el_o.style.display = "none";
    }
}

// Object Spawn //
function ToggleObjectSpawn(state) {
    var el = document.getElementById('button-spawn');
    ToggleSelected(el, state);
    ResetObjData();

    if (el.classList.contains('selected')) {
        ToggleHelp("objHelp", "off", true)
        ToggleControlObjectSpawn("on");
        SelectObjectButton('button-spawn');
        document.getElementById('objSearchField').style.display = "flex";
        document.getElementById('objSearchList').style.display = "flex";
        document.getElementById('objSpawnOptions').style.display = "inline-flex";
        document.getElementById('objData').style.display = "flex";
    } else {
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

// Object Nearby //
function ToggleTrackedList(state) {
    var el = document.getElementById('button-trackedobjlist');
    ToggleSelected(el, state);
    ResetObjData();

    if (el.classList.contains('selected')) {
        ToggleHelp("objHelp", "off", true)
        ToggleControlObjectSpawn("on");
        GetTrackedObjects();
        SelectObjectButton('button-trackedobjlist');
        document.getElementById('objSearchField').style.display = "none";
        document.getElementById('objSearchList').style.display = "flex";
        document.getElementById('objNearbyRange').style.display = "flex";
        document.getElementById('objNearbyResults').style.display = "flex";
    } else {
        document.getElementById('objSearchField').style.display = "none";
        document.getElementById('objSearchList').style.display = "none";
        document.getElementById('objSpawnOptions').style.display = "none";
    }
}

function GetTrackedObjects() {
    if (TrackedObjectsLoopRunning) { return; }
    TrackedObjectsLoopRunning = true;
    var elID = "objNearbyResults";
    var el = document.getElementById(elID);
    ResetListGroup(elID, "flex");
    const loopId = setInterval(function() {
        if (isVisible(el)) {
            if (!MouseDown) {
                SendClientMessage('nearbyObjects', { range: document.getElementById('nearbyRange').innerHTML, }).then(function(resp) {
                    //TODO: isnt clearing on Escape if nearby is last selected HUD
                    var objects = resp.nearbyObjects;
                    objects.sort((a, b) => a.distance - b.distance);

                    el.innerHTML = "";
                    var ul = document.createElement('ul');
                    for (var i = 0; i < objects.length; ++i) {
                        var li = document.createElement('li');
                        li.innerHTML = `${objects[i].distance.toFixed(2)} ${objects[i].handle} ${objects[i].modelName}`;
                        li.addEventListener('mouseenter', function() {
                            SendClientMessage('trackObject', {
                                handle: this.innerHTML.split(" ")[1],
                                category: "hover",
                            });
                        })
                        li.addEventListener('mouseleave', function() {
                            SendClientMessage('trackObject', {
                                handle: this.innerHTML.split(" ")[1],
                                category: "hover",
                                remove: true,
                            });
                        })
                        li.addEventListener('click', function() {
                            SendClientMessage('trackObject', {
                                handle: this.innerHTML.split(" ")[1],
                                category: "select",
                            });

                        })
                        ul.appendChild(li);
                    }
                    el.appendChild(ul);
                    if (objects.length < 15) {
                        el.style.minHeight = objects.length + ".4vh";
                    } else {
                        el.style.minHeight = "15.4vh";
                    }
                });
            }
        } else {
            clearInterval(loopId);
            TrackedObjectsLoopRunning = false;
        }
    }, 250);
}

// Object Scene //
function ToggleControlScene(state) {
    var el = document.getElementById('button-objectscene');
    ToggleSelected(el, state);

    if (el.classList.contains('selected')) {
        ToggleHelp("objHelp", "off", true)
        ToggleObjectSpawn("off");
        ToggleControlObjectSpawn("off");
        ResetObjData();
        document.getElementById('button-objectspawn').classList.remove('selected');
        document.getElementById('button-objectdetails').classList.remove('selected');
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
        ToggleControlScene("on");
        SelectObjectButton('button-scenecontrol');
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
        ToggleControlScene("on");
        SelectObjectButton('button-scenetags');
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
        ToggleControlScene("on");
        SelectObjectButton('button-importexport');
        document.getElementById('objSpawnOptions').style.display = "none";
        document.getElementById('objSearchList').style.display = "flex";
    } else {
        document.getElementById('objSearchList').style.display = "none";
    }
}

function ToggleObjectDetails(state) {
    var el = document.getElementById('button-objectdetails');
    ToggleSelected(el, state);

    if (el.classList.contains('selected')) {
        ToggleHelp("objHelp", "off", true)
        ToggleObjectSpawn("off");
        ToggleControlObjectSpawn("off");
        ToggleControlScene("off");
        document.getElementById('objSpawnOptions').style.display = "none";
        document.getElementById('objSearchList').style.display = "none";
    } else {
        // document.getElementById('objDetails').style.display = "none";
    }
}

function SelectObjectButton(el) {
    var elementIds = [
        'button-spawn',
        'button-trackedobjlist',
        'button-scenecontrol',
        'button-scenetags',
        'button-importexport',
    ];

    elementIds.forEach(id => { if (id != el) {
        document.getElementById(id).classList.remove('selected');
    }});
}

// Object Keys //
function HandleKeysObject(event) {
    if (GizmoActive) {
        switch(event.key) {
            case "Escape":
                event.preventDefault();
                sendClientMessage('gizmoStop', {})
                break;
        }
    } else {
        switch(event.key) {
            case "Escape":
                var escaped = false;
                event.preventDefault();
                if (document.activeElement.classList.contains('entryField')) {
                    document.activeElement.blur();
                    break;
                }
                if (isVisible(document.getElementById('objHelp'))) {
                    ToggleHelp("objHelp", "off", true);
                    escaped = true;
                    break;
                }
                if (isVisible(document.getElementById('objSpawnOptions'))) {
                    ToggleObjectSpawn("off");
                    escaped = true;
                    break;
                }
                if (isVisible(document.getElementById('objSearchList'))) {
                    ToggleTrackedList("off");
                    escaped = true;
                    break;
                }
                if (isVisible(document.getElementById('objControlSpawnOptions'))) {
                    document.getElementById('objControlSpawnOptions').style.display = "none";
                    escaped = true;
                    break;
                }
                if (isVisible(document.getElementById('objSceneOptions'))) {
                    document.getElementById('objSceneOptions').style.display = "none";
                    escaped = true;
                }
                if (escaped) { break; }

                SendClientMessage('modifyMode', { mode: "object", remove: true, });
                break;
            case " ":
                if (typeof event.target.onclick == "function") {
                    event.target.onclick.apply();
                    event.preventDefault();
                }
                break;
            case "c":
                if (!document.activeElement.classList.contains('entryField') && !ControlPassActive) {
                    SendClientMessage('modifyMode', { mode: "object", passthrough: true, });
                    SendClientMessage('modifyMode', { mode: "gizmo", requireActive: true, passthrough: true, });
                }
                break;
            case "f":
                if (!document.activeElement.classList.contains('entryField') && !ControlPassActive) {
                    SendClientMessage('sendCursorKey', {
                        pressed: Pressed,
                        justPressed: JustPressed
                    });
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
                ToggleSceneMove("on");
                break;
            case "4":
                ToggleSceneTag("on");
                break;
            case "5":
                ToggleImportExport("on");
                break;
            case "6":
                ToggleObjectDetails("on");
                break;
            case "Backspace":
                SendClientMessage('modifyMode', { mode: "object", remove: true, });
                break;
            case "?":
            case "h":
                ToggleHelp("objHelp", "toggle", true)
                break;
            case "r":
                SendClientMessage('sendCursorKey', {
                    pressed: Pressed,
                    justPressed: JustPressed
                });
                break;
            case "x":
                document.getElementById('activeObject').innerHTML = "";
                if (isVisible(document.getElementById('objSearchField'))) {
                    document.getElementById('objSearch').innerHTML = "";
                    ResetListGroup("objData", "flex");

                }
                if (isVisible(document.getElementById('objNearbyRange'))) {
                    document.getElementById('objNearbyRange').innerHTML = "25";
                    GetTrackedObjects();
                }
                break;
        }
    }
}

