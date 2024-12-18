import { resetListGroup, MouseDown } from '../script.js';
import { sendClientMessage } from '../utils/msg.js';
import { isVisible, elementSetClass, elementHasClass, elementSetText, toggleSection } from '../utils/nav.js';

let NearbyOption = {
    object: true,
    ped: true,
    vehicle: true,
    other: false,
    origin: "camera",
    range: 50,
}
let SceneObjectsLoopRunning = false;
var SelectedObjectSpawnType = "objects";
let SpawnOption = new Map();
let TagOption = { sort: "dist", }
let TrackedObjectsLoopRunning = false;

export function initObj() {
    initializeObjectHUD();

    sendClientMessage('initObjects', {}).then(function(resp) {
        SpawnOption.set("objects", JSON.parse(resp.objects));
        SpawnOption.set("peds", JSON.parse(resp.peds));
        SpawnOption.set("vehicles", JSON.parse(resp.vehicles));
        SpawnOption.set("propsets", JSON.parse(resp.propsets));
        SpawnOption.set("pickups", JSON.parse(resp.pickups));
    });

    sendClientMessage('initObjSettings', {}).then(function(resp) {
        NearbyOption = JSON.parse(resp.nearby);

        if (NearbyOption.object) {
            document.getElementById('button-nearby-object').classList.add('selected');
        } else {
            document.getElementById('button-nearby-object').classList.remove('selected');
        }
        if (NearbyOption.ped) {
            document.getElementById('button-nearby-ped').classList.add('selected');
        } else {
            document.getElementById('button-nearby-ped').classList.remove('selected');
        }
        if (NearbyOption.vehicle) {
            document.getElementById('button-nearby-vehicle').classList.add('selected');
        } else {
            document.getElementById('button-nearby-vehicle').classList.remove('selected');
        }
        if (NearbyOption.other) {
            document.getElementById('button-nearby-other').classList.add('selected');
        } else {
            document.getElementById('button-nearby-other').classList.remove('selected');
        }

        document.getElementById('nearbyRange').innerHTML = NearbyOption.range;

        document.getElementById('button-nearbyOrigin-' + NearbyOption.origin.replace(/ /g, '-')).classList.add('selected');
        document.getElementById("activeNearbyOrigin").innerHTML = NearbyOption.origin;

        TagOption = JSON.parse(resp.tags);
        document.getElementById('button-tagsortby' + TagOption.sort).classList.add('selected');
    });

    $("div#objSearch.entryField").keydown(function(e) {
        if (e.code == "Enter") {
            e.preventDefault();
            resetListGroup("objData", "flex");
            searchBasicRedMList(this.innerHTML, SpawnOption.get(SelectedObjectSpawnType), "objData");
        }
    });

    $("div#nearbyRange.entryField").keydown(function(e) {
        if (e.code == "Enter") {
            console.log("setting nearby object range", this.innerHTML);
            e.preventDefault();
            getTrackedObjects();
        }
    });
}

function searchBasicRedMList(searchValue, searchList, elementId) {
    var el = document.getElementById(elementId);
    el.innerHTML = "";

    var maxResults = 10000;
    var results = searchList.filter(str => str.toLowerCase().includes(searchValue.toLowerCase()));
    var ul = document.createElement('ul');
    for (var i=0; i < results.length && i < maxResults; ++i) {
        var li = document.createElement('li');
        li.addEventListener('click', function() {
            selectSpawnObject(this.innerHTML)
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

export function getTrackedObjects() {
    if (TrackedObjectsLoopRunning) { return; }
    TrackedObjectsLoopRunning = true;
    var elID = "objNearbyResults";
    var el = document.getElementById(elID);
    resetListGroup(elID, "flex");
    const loopId = setInterval(function() {
        if (isVisible(el)) {
            if (!MouseDown) {
                var currentNearbyRange = document.getElementById('nearbyRange').innerHTML;
                if (currentNearbyRange != NearbyOption.range) {
                    NearbyOption.range = currentNearbyRange;
                    sendClientMessage('setObjSettings', { nearby: JSON.stringify(NearbyOption) });
                }
                sendClientMessage('nearbyObjects', {
                    range: currentNearbyRange,
                    origin: NearbyOption.origin,
                }).then(function(resp) {
                        var objects = resp.nearbyObjects;
                        objects.sort((a, b) => a.distance - b.distance);

                        el.innerHTML = "";
                        var ul = document.createElement('ul');
                        for (var i = 0; i < objects.length; ++i) {
                            if (objects[i].objType && !NearbyOption[objects[i].objType]) {
                                continue;
                            }

                            var li = document.createElement('li');
                            var handle = objects[i].handle;
                            if (objects[i].networkId) {
                                handle = handle + " [" + objects[i].networkId + "]";
                            }
                            li.innerHTML = `${objects[i].distance.toFixed(2)} ${handle} ${objects[i].modelName}`;
                            if (objects[i].select) {
                                li.classList.add('selected');
                            } else if (objects[i].hover) {
                                li.classList.add('hover');
                            }
                            li.addEventListener('mouseenter', function() {
                                sendClientMessage('trackObject', {
                                    handle: this.innerHTML.split(" ")[1],
                                    category: "hover",
                                });
                            })
                            li.addEventListener('mouseleave', function() {
                                sendClientMessage('trackObject', {
                                    handle: this.innerHTML.split(" ")[1],
                                    category: "hover",
                                    remove: true,
                                });
                            })
                            li.addEventListener('click', function() {
                                sendClientMessage('trackObject', {
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

export function getScenes() {
    var elID = "objScenesList";
    var el = document.getElementById(elID);
    resetListGroup(elID, "flex");
    sendClientMessage('scenesList', {}).then(function(resp) {
        var sceneList = resp.scenes;
        // Sort list by names alphabetically
        sceneList.sort((a, b) => a.name.localeCompare(b.name));

        el.innerHTML = "";
        var ul = document.createElement('ul');
        for (var i = 0; i < sceneList.length; ++i) {
            var li = document.createElement('li');
            li.innerHTML = sceneList[i].name;
            // li.addEventListener('mouseenter', function() {
            //     console.log("hovering over scene", this.innerHTML);
            // })
            // li.addEventListener('mouseleave', function() {
            //     console.log("leaving scene", this.innerHTML);
            // })
            li.addEventListener('click', function() {
                const sceneName = this.innerHTML;
                elementSetText('selectedScene', sceneName);
                getSceneObjects(sceneName);
            })
            ul.appendChild(li);
        }
        el.appendChild(ul);
        // if (sceneList.length < 4) {
        //     el.style.minHeight = sceneList.length + ".3vh";
        // } else {
        //     el.style.minHeight = "4.9vh";
        // }
    });
}

export function getSceneObjects(sceneName) {
    if (SceneObjectsLoopRunning) { return; }
    SceneObjectsLoopRunning = false;
    var elID = "objSceneObjectsList";
    var el = document.getElementById(elID);
    resetListGroup(elID, "flex");
    const loopId = setInterval(function() {
        if (isVisible(el)) {
            if (!MouseDown) {
                sendClientMessage('sceneObjects', {
                    scene: sceneName,
                }).then(function(resp) {
                        var objects = resp.objects;
                        // This is for objects in the scene
                        if (TagOption.sort == "dist") {
                            objects.sort((a, b) => a.distance - b.distance);
                        } else if (TagOption.sort == "name") {
                            objects.sort((a, b) => a.model.localeCompare(b.model));
                        }
                        el.innerHTML = "";
                        var ul = document.createElement('ul');
                        for (var i = 0; i < objects.length; ++i) {
                            var li = document.createElement('li');
                            var handle = objects[i].handle;
                            if (objects[i].networkId) {
                                handle = handle + " [" + objects[i].networkId + "]";
                            }
                            li.innerHTML = `${objects[i].distance.toFixed(2)} ${handle} ${objects[i].model}`;
                            // li.addEventListener('mouseenter', function() {
                            //     console.log("hovering over object", this.innerHTML);
                            // })
                            // li.addEventListener('mouseleave', function() {
                            //     console.log("leaving object", this.innerHTML);
                            // })
                            li.addEventListener('click', function() {
                                // TODO: Implement
                                SelectObject(this.innerHTML.split(" ")[1]);
                            })
                            ul.appendChild(li);
                        }
                        el.appendChild(ul);
                        if (objects.length < 4) {
                            el.style.minHeight = objects.length + ".3vh";
                        } else {
                            el.style.minHeight = "4.9vh";
                        }
                    });
            } else {
                clearInterval(loopId);
                SceneObjectsLoopRunning = false;
            }
        }
    }, 250);
}

function selectSpawnObject(object) {
    setElementText("activeObject", object);
    sendClientMessage('selectSpawnObject', { name: object });
}

export function toggleNearbyFilter(type) {
    const selected = elementSetClass(`button-nearby-${type}`, 'selected');
    NearbyOption[type] = selected;
    console.log("setting nearby object type", type, selected);
    sendClientMessage('setObjSettings', { nearby: JSON.stringify(NearbyOption) });
    console.log(NearbyOption);
}

export function tagSelectSort(sortType) {
    elementSetClass(`button-tagsortby${TagOption.sort}`, 'selected', false);
    elementSetClass(`button-tagsortby${sortType}`, 'selected', true);
    TagOption.sort = sortType;
    sendClientMessage('setObjSettings', { tags: JSON.stringify(TagOption) });
}

const PREFIX_OBJ_SPAWN = "button-spawn";
const validSpawns = new Set(["objects", "peds", "vehicles", "propsets", "pickups", "other"]);

export function selectSpawnType(spawn) {
    const prev = SelectedObjectSpawnType;
    if (!prev || !spawn) {
        console.error("Invalid prev or spawn value:", { prev, spawn });
        return;
    }
    if (spawn === prev) { return; }
    if (!validSpawns.has(spawn)) {
        console.error("Invalid spawn type:", spawn);
        return;
    }
    SelectedObjectSpawnType = spawn;

    elementSetClass(`${PREFIX_OBJ_SPAWN}${prev}`, 'hidden', false);
    elementSetClass(`${PREFIX_OBJ_SPAWN}${spawn}`, 'hidden', true);

    resetListGroup("objData", "none");

    elementSetText('objSearch', "");
    document.getElementById('objSearch').focus();
}

function formatId(str) { return str.replace(/ /g, '-'); }

const PREFIX_NEARBY_ORIGIN = "button-nearbyOrigin-";
const validOrigins = new Set(["camera", "offset", "player", "raycast", "select", "set position"]);

export function selectNearbyOrigin(origin) {
    const prev = NearbyOption.origin;
    if (!prev || !origin) {
        console.error("Invalid prev or origin value:", { prev, origin });
        return;
    }
    if (origin === prev) { return; }
    if (!validOrigins.has(origin)) {
        console.error("Invalid origin type:", origin);
        return;
    }
    NearbyOption.origin = origin;

    elementSetClass(`${PREFIX_NEARBY_ORIGIN}${formatId(prev)}`, 'selected', false);
    elementSetClass(`${PREFIX_NEARBY_ORIGIN}${formatId(origin)}`, 'selected', true);

    elementSetText('activeNearbyOrigin', origin);

    sendClientMessage('setNearbyOriginPos', origin == "set position" ? {} : { remove: true });
    sendClientMessage('setObjSettings', { nearby: JSON.stringify(NearbyOption) });
}

const ObjectHUD_All = [
    "objHelp",
    "objControlOptions",
    "objDetails",
    "objLeftColumn",
    "objNearbyResults",
    "sceneData",

    "objSearchField",
    "selectedObjectDetails",
    "objSpawnOptions",
    "objData",
    "objNearbyOrigin",
    "selectedNearbyOrigin",
    "objNearbyFilter",
    "objNearbyRange",
    "objNearbyResults",
    "objScenesList",
    "objSceneTagOptions",
    "objSceneObjectsList",
    "sceneSelected",
];

const ObjectHUD_Visible = [
    "objControlOptions",
    "objDetails",
];

const ObjectHUD_Spawn = [
    "objSearchField",
    "objLeftColumn",
];

const ObjectHUD_Nearby = [
    "objNearbyOrigin",
    "selectedNearbyOrigin",
    "objNearbyFilter",
    "objNearbyRange",
    "objNearbyResults",
    "objLeftColumn",
];

const ObjectHUD_ImportExport = [
    "objScenesList",
    "objSceneTagOptions",
    "objSceneObjectsList",
    "objLeftColumn",
    "sceneSelected",
];

export function initializeObjectHUD() {
    toggleSection(
        false,
        [],
        ObjectHUD_Visible,
        ObjectHUD_All
    );
    elementSetClass('objectHUD', 'hidden', true);
}

export function toggleObjectHUD(state) {
    if (state == undefined)
        state = elementHasClass('objectHUD', 'hidden');
    toggleSection(
        state,
        ObjectHUD_Visible, // Elements to show when visible
        [],
        ObjectHUD_All      // All relevant elements
    );
    elementSetClass('objectHUD', 'hidden', !state);
}

export function toggleObjectSpawnHUD(state) {
    if (state == undefined)
        state = elementHasClass(ObjectHUD_Spawn[0], 'hidden');
    toggleSection(
        state,
        ObjectHUD_Spawn,
        ObjectHUD_Visible,
        ObjectHUD_All
    );
}

export function toggleObjectNearbyHUD(state) {
    if (state == undefined)
        state = elementHasClass(ObjectHUD_Nearby[0], 'hidden');
    toggleSection(
        state,
        ObjectHUD_Nearby,
        ObjectHUD_Visible,
        ObjectHUD_All
    );
    if (state) getTrackedObjects();
}

export function toggleObjectImportExportHUD(state) {
    if (state == undefined)
        state = elementHasClass(ObjectHUD_ImportExport[0], 'hidden');
    toggleSection(
        state,
        ObjectHUD_ImportExport,
        ObjectHUD_Visible,
        ObjectHUD_All
    );
    if (state) getScenes();
}
