import { KeyActions } from "../script.js";
import { sendClientMessage } from "../utils/msg.js";

let Animations = {};
let IKFlagTotals = 0;
let FlagTotals = 0;
const Flags = {
    LOOP: 1,
    UPPERBODY: 8,
    SECONDARY: 16,
    TOTAL: 32,
}
let TaskFilter = false;

export function initAnims() {
    // KeyActions['animHUD'] = {
    //     'escape': () => {
    //         elementSetClass('animHUD', 'hidden', true);
    //         sendClientMessage('deactivateMode', { mode: "animation" });
    //     },
    //     'backspace': () => { toggleStop(); },
    //     ' ': () => { togglePlay(); },
    //     '?': () => { toggleHelp("animHelp"); },
    //     '1': () => { toggleSearch(); },
    //     '2': () => { toggleTimings(); },
    //     '3': () => { toggleIKFlags(); },
    //     '4': () => { toggleFlags(); },
    //     '5': () => { toggleTaskFilters(); },
    //     '6': () => { toggleEntity(); },
    //     'c': () => { toggleSettings(); },
    //     'h': () => { toggleHelp("animHelp"); },
    //     'i': () => { toggleIKFlags(); },
    //     'l': () => { toggleLoop(); },
    //     'o': () => { toggleFlags(); },
    //     'p': () => { togglePlay(); },
    //     'q': () => { togglePlay(); },
    //     'r': () => { togglePlay(); },
    //     't': () => { toggleTimings(); },
    //     'u': () => { toggleTorso(); },
    //     'x': () => {},
    // }

    sendClientMessage('initAnims', {}).then(function(resp) {
        Animations = JSON.parse(resp.animations);
    });

    sendClientMessage('initAnimFlags', {}).then(function(resp) {
        let flagList = document.getElementById('animFlagsOptions');
        let ul = document.createElement('ul');

        const flags = JSON.parse(resp.flags);
        flags.forEach(flag => {
            let flagLabel = document.createElement('div');
            flagLabel.classList.add('check', 'label', 'borderright', 'bgi');
            flagLabel.innerHTML = flag.name;

            let flagField = document.createElement('div');
            flagField.classList.add('check', 'entry', 'borderright', 'bgt1');
            flagField.setAttribute('id', "flag-" + flag.value);
            flagField.setAttribute('tabindex', "5");
            flagField.setAttribute('role', "button");
            flagField.setAttribute('aria-pressed', "false");
            flagField.setAttribute('onclick', "toggleFlag(" + flag.value + ")");

            let li = document.createElement('li');
            li.appendChild(flagLabel);
            li.appendChild(flagField);
            ul.appendChild(li);
        });

        let flagLabel = document.createElement('div');
        flagLabel.classList.add('check', 'label', 'borderright', 'bgi');
        flagLabel.innerHTML = "TOTAL";

        let flagField = document.createElement('div');
        flagField.classList.add('check', 'entry', 'borderright', 'bgt1');
        flagField.setAttribute('id', "flagTotals");
        flagField.innerHTML = "0";

        let li = document.createElement('li');
        li.appendChild(flagLabel);
        li.appendChild(flagField);
        ul.appendChild(li);
        flagList.appendChild(ul);
    });

    sendClientMessage('initIKAnimFlags', {}).then(function(resp) {
        let flagList = document.getElementById('animIKFlagsOptions');
        let ul = document.createElement('ul');

        const flags = JSON.parse(resp.flags);
        flags.forEach(flag => {
            let flagLabel = document.createElement('div');
            flagLabel.classList.add('check', 'label', 'borderright', 'bgi');
            flagLabel.innerHTML = flag.name;

            let flagField = document.createElement('div');
            flagField.classList.add('check', 'entry', 'borderright', 'bgt1');
            flagField.setAttribute('id', "ikflag-" + flag.value);
            flagField.setAttribute('tabindex', "4");
            flagField.setAttribute('role', "button");
            flagField.setAttribute('aria-pressed', "false");
            flagField.setAttribute('onclick', "toggleIKFlag(" + flag.value + ")");

            let li = document.createElement('li');
            li.appendChild(flagLabel);
            li.appendChild(flagField);
            ul.appendChild(li);
        });


        let flagLabel = document.createElement('div');
        flagLabel.classList.add('check', 'label', 'borderright', 'bgi');
        flagLabel.innerHTML = "TOTAL";

        let flagField = document.createElement('div');
        flagField.classList.add('check', 'entry', 'borderright', 'bgt1');
        flagField.setAttribute('id', "IKFlagTotals");
        flagField.innerHTML = "0";

        let li = document.createElement('li');
        li.appendChild(flagLabel);
        li.appendChild(flagField);
        ul.appendChild(li);
        flagList.appendChild(ul);
    });

    sendClientMessage('initTaskFilters', {}).then(function(resp) {
        let taskList = document.getElementById('animTaskFilterOptions');
        let ul = document.createElement('ul');

        const taskFilters = JSON.parse(resp.taskFilters);
        taskFilters.forEach((taskFilter, index) => {
            let taskLabel = document.createElement('div');
            taskLabel.classList.add('check', 'label', 'borderright', 'bgi');
            taskLabel.innerHTML = taskFilter;

            let taskField = document.createElement('div');
            taskField.classList.add('check', 'entry', 'taskFilter', 'borderright', 'bgt1');
            taskField.setAttribute('id', "task-" + index);
            taskField.setAttribute('tabindex', "5");
            taskField.setAttribute('role', "button");
            taskField.setAttribute('aria-pressed', "false");
            taskField.onclick = function() { toggleTaskFilter(index, taskFilter); };

            let li = document.createElement('li');
            li.appendChild(taskLabel);
            li.appendChild(taskField);
            ul.appendChild(li);
        });
        taskList.appendChild(ul);
    });

    $("div#valueAnimSearch.entry").keydown(function(e) {
        if (e.code == "Enter") {
            e.preventDefault();
            let dictList = document.getElementById("animDictList");
            let animList = document.getElementById("animList");
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

}

function toggleTaskFilter(taskFilterIndex, taskFilter) {
    let el = document.getElementById("task-" + taskFilterIndex);
    let selected = el.classList.contains("selected");

    const allTaskFilters = document.querySelectorAll('.taskFilter');
    allTaskFilters.forEach(filter => filter.classList.remove('selected'));

    if (!selected) {
        el.classList.add("selected");
        TaskFilter = taskFilter;
    } else {
        TaskFilter = false;
    }
}

function searchRedMAnims(searchValue) {
    let el = document.getElementById("animDictList");
    const maxResults = 10000;
    let results = [];

    el.innerHTML = "";
    if (!searchValue || searchValue == "") { return; }
    searchValue = searchValue.trim().toLowerCase();

    Object.keys(Animations).forEach(animDict => {
        if (animDict.toLowerCase().includes(searchValue)) {
            results.push({ animDict: animDict });
        } else {
            Animations[animDict].every(animName => {
                if (animName.toLowerCase().includes(searchValue)) {
                    results.push({ animDict: animDict });
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

    let ul = document.createElement('ul');
    for (let i=0; i < results.length && i < maxResults; ++i) {
        let li = document.createElement('li');
        li.addEventListener('click', function() {
            document.getElementById("activeAnimDict").innerHTML = this.innerHTML;
            document.getElementById("activeAnimName").innerHTML = "";
            searchAnims(this.innerHTML)
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
    console.log("searched for", searchValue, "found results", results.length);
}

function searchAnims(animDict) {
    let results = [];
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

    let animResults = document.getElementById("animList");
    animResults.innerHTML = "";
    let ul = document.createElement('ul');
    for (let i=0; i < results.length; ++i) {
        let li = document.createElement('li');
        li.innerHTML = results[i].anim;
        li.addEventListener('click', function() {
            document.getElementById("activeAnimName").innerHTML = this.innerHTML;
            togglePlay(true);
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

export function playAnimation() {
    const animDict = document.getElementById("activeAnimDict").innerHTML;
    const anim = document.getElementById("activeAnimName").innerHTML;
    if (anim == "" || animDict == "") { return; }
    const entity = document.getElementById("animEntityField").innerHTML;
    const blendIn = document.getElementById("timingBlendIn").innerHTML;
    const blendOut = document.getElementById("timingBlendOut").innerHTML;
    const playback = document.getElementById("timingPlayback").innerHTML;
    const duration = document.getElementById("timingDuration").innerHTML;
    sendClientMessage('playAnim', {
        entity: entity,
        animDict: animDict,
        animName: anim,
        blendInSpeed: blendIn,
        blendOutSpeed: blendOut,
        playbackRate: playback,
        duration: duration,
        flag: FlagTotals,
        ikFlag: IKFlagTotals,
        taskFilter: TaskFilter,
    });
}

export function toggleFlag(flag) {
    let flagTotals = 0;
    elementSetClass(`flag-${flag}`, "selected")

    for (let i=0; i < Flags.TOTAL; i++) {
        let value = toUint32(1 << i);
        if (isSelected(`flag-${value}`)) {
            flagTotals += value;
        }
    }
    FlagTotals = flagTotals;
    const flagTotalsElement = document.getElementById("flagTotals");
    if (flagTotalsElement) { flagTotalsElement.innerHTML = flagTotals; }

    updateSpecialFlagSelections(flag);
}

function updateSpecialFlagSelections(flag) {
    switch(flag) {
        case Flags.LOOP:
            elementSetClass('button-repeat', 'selected', isSelected(`flag-${Flags.LOOP}`));
            break;
        case Flags.UPEPRBODY:
        case Flags.SECONDARY:
            const torsoSelected =
                isSelected(`flag-${Flags.UPPERBODY}`) &&
                isSelected(`flag-${Flags.SECONDARY}`);
            elementSetClass('button-torso', 'selected', torsoSelected);
            break;
    }
}

export function toggleIKFlag(flag) {
    let el = document.getElementById("ikflag-" + flag);
    el.classList.toggle("selected");

    IKFlagTotals = 0;
    for (let i=0; i < 31 ; i++) {
        let v = toUint32(1 << i);
        if (document.getElementById("ikflag-" + v).classList.contains("selected")) {
            IKFlagTotals += v;
        }
    }
    document.getElementById("IKFlagTotals").innerHTML = IKFlagTotals;
}

export function togglePlay(state) {
    if (elementSetClass('button-play', 'selected', state)) {
        setTimeout(function() { elementSetClass('button-play', 'selected', false); }, 200);
    } else { return; }
    playAnimation();
}

export function toggleStop(state) {
    if (elementSetClass('button-stop', 'selected', state)) {
        setTimeout(function() { elementSetClass('button-stop', 'selected', false); }, 200);
    }
    togglePlay(false);
    sendClientMessage('stopAnim', {});
}

export function toggleLoop() { toggleFlag(1); }

export function toggleTorso(state) {
    const flag8 = isSelected('flag-8');
    const flag16 = isSelected('flag-16');

    if (elementSetClass('button-torso', 'selected', state)) {
        if (!flag8) { toggleFlag(8); }
        if (!flag16) { toggleFlag(16); }
    } else {
        if (flag8) { toggleFlag(8); }
        if (flag16) { toggleFlag(16); }
    }
}

