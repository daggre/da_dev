var TreeKeys = {}
var DevKeys = {}
var HudTree = {}

function SendClientMessage(endpoint, data) {
    fetch(`https://${GetParentResourceName()}/${endpoint}`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json; charset=UTF-8',
        },
        body: JSON.stringify(data),
    }).then(resp => resp.json());
}

window.onload = function() {
    window.addEventListener('message', function(msg) {
        // console.log(msg);
        switch(msg.data.type) {
            case "show":
                InitializeTree(msg.data.optionTree);
                Show();
                break;
            case "hide":
                Hide();
                break;
        }
    })
}

$(document).ready(function() {
    $(document).keydown(function(event) {
        switch(event.key) {
        case "Escape": //ESC
            // Explicitly handle Escape as exit UI
            SendClientMessage('exit', { });
            Hide();
            break;
        default:
            HandleKey(event.key)
            break;
        };
    });
});

InitializeTree = function(optionTree) {
    TreeKeys = {}
    DevKeys = {}
    HudTree = optionTree

    $('#menuOptions').html("");
    $('#devOptions').html("");
    $("#menuSpacer").hide();
    $("#optionsSpacer").hide();
    $('#footer').html("");

    // console.log("tree", optionTree)
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
    if (value.name == "Exit") {
        const html = '<div class="row"> <div class="column footervalue">Cancel</div> <div class="column key">C</div> </div>'
        $("#footer").append(html);
    } else {
        $("#optionsSpacer").show();
        const html = '<div class="row"> <div class="column value">'+value.optionName+'</div> <div class="column key">'+value.key+'</div> </div>';
        $("#devOptions").append(html);
    }
}

AppendMenuOption = function(index, value) {
    $("#menuSpacer").show();
    TreeKeys[value.key] = index;
    const html = '<div class="row"> <div class="column value"> \> '+value.menuName+'</div> <div class="column key">'+value.key+'</div> </div>';

    $("#menuOptions").append(html);
}

KeyTranslate = function(key) {
    let map = {
        // Translate fr keyboard
        '&': '1',
        'é': '2',
        '"': '3',
        '\'': '4',
    };
    let lowercaseKey = key.toLowerCase();
    return map.hasOwnProperty(lowercaseKey) ? map[lowercaseKey] : lowercaseKey;
}

HandleKey = function(key) {
    let translatedKey = KeyTranslate(key)
    if (TreeKeys[translatedKey]) {
        let idx = TreeKeys[translatedKey]
        $("#header").html(HudTree.subMenu[idx].name)
        InitializeTree(HudTree.subMenu[idx])
    } else if (DevKeys[translatedKey]) {
        let idx = DevKeys[translatedKey]
        SendClientMessage('trigger', {
            menuName: HudTree.options[idx].menuName,
            optionName: HudTree.options[idx].optionName
        });
        Hide();
    } else {
        SendClientMessage('exit', { key: translatedKey });
        Hide();
    }
}

Show = function() {
    // $("#header").html("da_dev")
    $("#dev-display").show();
}

Hide = function() {
    $("#dev-display").hide();
}
