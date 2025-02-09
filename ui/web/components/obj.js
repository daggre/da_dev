import { MouseDown, showConfirm } from '../script.js';
import { selectOnly, resetList, isVisible, elementSetClass, elementHasClass, elementSetText, toggleSection } from '../utils/nav.js';
import { sendClientMessage } from '../utils/msg.js';

let ActiveScene = "autosave";
let NearbyOption = {
    object: true,
    ped: true,
    vehicle: true,
    other: false,
    origin: "camera",
    range: 50,
}
let SceneObjectsLoopRunning = false;
let SelectedObjectSpawnType = "objects";
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

        elementSetClass('button-nearby-object', 'selected', NearbyOption.object);
        elementSetClass('button-nearby-ped', 'selected', NearbyOption.ped);
        elementSetClass('button-nearby-vehicle', 'selected', NearbyOption.vehicle);
        elementSetClass('button-nearby-other', 'selected', NearbyOption.other);
        document.getElementById('nearbyRange').innerHTML = NearbyOption.range;

        document.getElementById('button-nearbyOrigin-' + NearbyOption.origin.replace(/ /g, '-')).classList.add('selected');
        document.getElementById("activeNearbyOrigin").innerHTML = NearbyOption.origin;

        TagOption = JSON.parse(resp.tags);
        document.getElementById('button-tagsortby' + TagOption.sort).classList.add('selected');
    });
}

export function copyScene() {
    const newSceneName = document.getElementById('selectedScene').innerHTML;
    console.log("Copy scene", ActiveScene, newSceneName);
    sendClientMessage('saveScene', { scene: newSceneName, });
    ActiveScene = newSceneName;
    getScenes();
}

export function clearScene() {
    const sceneName = ActiveScene;
    showConfirm(`Unsaved changes will be lost.<br><br>Remove scene '${sceneName}' objects?`).then(confirm => {
        if (confirm) {
            // TODO: implement clearScene
            sendClientMessage('clearScene', { scene: sceneName });
            trackSceneObjects();
        } else {
            console.log("Clear scene cancelled");
        }
    });
}

export function deleteScene() {
    // CONFIRM YOU ARE DELETING THE SCENE
    const sceneName = ActiveScene;
    showConfirm(`This action cannot be undone!<br><br>Delete scene '${sceneName}'?`).then(confirm => {
        if (confirm) {
            // TODO: implement deleteScene
            sendClientMessage('deleteScene', { scene: sceneName });
            ActiveScene = "autosave";
            getScenes();
        } else {
            console.log("Delete scene cancelled");
        }
    });
}

export function searchSpawnObject(searchString) {
    resetList('objSpawnList');
    searchObjects(searchString, SpawnOption.get(SelectedObjectSpawnType), "objSpawnList", 3);
}

function searchObjects(searchValue, searchList, elementId, tabIndex) {
    let el = document.getElementById(elementId);
    el.style.minHeight = "0";
    if (searchValue == "") return;

    const maxResults = 10000;
    const selectedObject = document.getElementById('activeObject').innerHTML;
    let results = searchList.filter(str => str.toLowerCase().includes(searchValue.toLowerCase()));
    let ul = document.createElement('ul');
    for (let i=0; i < results.length && i < maxResults; ++i) {
        let li = document.createElement('li');
        const name = results[i];
        if (name == selectedObject) { li.classList.add('liSelect'); }
        li.addEventListener('mouseenter', function() {
            li.classList.add('liHover');
        });
        li.addEventListener('mouseout', function() {
            li.classList.remove('liHover');
        });
        li.addEventListener('click', function() {
            // Remove liSelect class from any li in this element that has liSelect
            el.querySelectorAll('li').forEach(function(li) {
                li.classList.remove('liSelect');
            });
            li.classList.add('liSelect');
            selectSpawnObject(this.innerHTML);
        })
        if (tabIndex)
            li.setAttribute('tabindex', tabIndex);
        li.innerHTML = name;
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
    let el = document.getElementById("objNearbyResults");
    resetList(el);
    const loopId = setInterval(function() {
        if (isVisible(el)) {
            if (!MouseDown) {
                let currentNearbyRange = document.getElementById('nearbyRange').innerHTML;
                if (currentNearbyRange != NearbyOption.range) {
                    NearbyOption.range = currentNearbyRange;
                    sendClientMessage('setObjSettings', { nearby: JSON.stringify(NearbyOption) });
                }
                sendClientMessage('nearbyObjects', {
                    range: currentNearbyRange,
                    origin: NearbyOption.origin,
                }).then(function(resp) {
                        let objects = resp.nearbyObjects;
                        objects.sort((a, b) => a.distance - b.distance);

                        el.innerHTML = "";
                        let ul = document.createElement('ul');
                        let filteredLength = 0;
                        for (let i = 0; i < objects.length; ++i) {
                            if (objects[i].objType && !NearbyOption[objects[i].objType]) {
                                continue;
                            }

                            filteredLength++;
                            let li = document.createElement('li');
                            let handle = objects[i].handle;
                            if (objects[i].networkId) {
                                handle = handle + " [" + objects[i].networkId + "]";
                            }
                            li.innerHTML = `${objects[i].distance.toFixed(2)} ${handle} ${objects[i].modelName}`;
                            if (objects[i].select) {
                                li.classList.add('liSelect');
                                li.classList.add('liPseudoFocus');
                            } else if (objects[i].hover) {
                                // li.classList.add('liHover');
                            }
                            li.addEventListener('mouseenter', function() {
                                li.classList.add('liHover');
                                sendClientMessage('trackObject', {
                                    handle: this.innerHTML.split(" ")[1],
                                    category: "hover",
                                });
                            })
                            li.addEventListener('mouseout', function() {
                                li.classList.remove('liHover');
                                sendClientMessage('trackObject', {
                                    handle: this.innerHTML.split(" ")[1],
                                    category: "hover",
                                    remove: true,
                                });
                            })
                            li.addEventListener('click', function() {
                                li.classList.add('liSelect');
                                sendClientMessage('trackObject', {
                                    handle: this.innerHTML.split(" ")[1],
                                    category: "select",
                                });

                        })
                        ul.appendChild(li);
                    }
                    el.appendChild(ul);
                    if (filteredLength < 15) {
                        el.style.minHeight = filteredLength + ".4vh";
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
    let el = document.getElementById("objScenesList");
    resetList(el);
    sendClientMessage('scenesList', {}).then(function(resp) {
        let sceneList = JSON.parse(resp.scenes);
        // Sort list by names alphabetically
        sceneList.sort((a, b) => a.name.localeCompare(b.name));

        let ul = document.createElement('ul');
        for (let i = 0; i < sceneList.length; ++i) {
            let li = document.createElement('li');
            const name = sceneList[i].name;
            li.innerHTML = name;
            if (name == ActiveScene) { li.classList.add('liSelect'); }
            li.addEventListener('mouseenter', function() {
                li.classList.add('liHover');
            });
            li.addEventListener('mouseout', function() {
                li.classList.remove('liHover');
            });
            li.addEventListener('click', function() {
                ActiveScene = this.innerHTML;
                el.querySelectorAll('li').forEach(function(li) {
                    li.classList.remove('liSelect');
                });
                li.classList.add('liSelect');
                elementSetText('selectedScene', ActiveScene);
                // elementSetClass('objSceneObjectsListOptions', 'hidden', false);
                sendClientMessage('loadSceneObjects', { scene: ActiveScene });
                trackSceneObjects();
            })
            li.setAttribute('tabindex', '23');
            ul.appendChild(li);
        }
        el.appendChild(ul);
        if (sceneList.length < 4) {
            el.style.minHeight = sceneList.length + ".3vh";
        } else {
            el.style.minHeight = "4.9vh";
        }
    });
}

export function trackSceneObjects() {
    if (SceneObjectsLoopRunning) { return; }
    SceneObjectsLoopRunning = true;
    let el = document.getElementById("objSceneObjectsList");
    resetList(el);
    const loopId = setInterval(function() {
        if (isVisible(el)) {
            if (!MouseDown) {
                sendClientMessage('getSceneObjects', {
                    scene: ActiveScene,
                }).then(function(resp) {
                        let objects = resp.objects;
                        el.innerHTML = "";
                        let ul = document.createElement('ul');
                        if (!Array.isArray(objects) || objects.length === 0) {
                            let li = document.createElement('li');
                            li.innerHTML = "";
                            ul.appendChild(li);
                            el.appendChild(ul);
                            el.style.minHeight = "1.3vh";
                            return;
                        }
                        // This is for objects in the scene
                        if (TagOption.sort == "dist") {
                            objects.sort((a, b) => a.distance - b.distance);
                        } else if (TagOption.sort == "name") {
                            objects.sort((a, b) => a.modelName.localeCompare(b.modelName));
                        }

                        for (let i = 0; i < objects.length; ++i) {
                            let li = document.createElement('li');
                            let handle = objects[i].handle;
                            if (objects[i].networkId) {
                                handle = handle + " [" + objects[i].networkId + "]";
                            }
                            li.innerHTML = `${objects[i].distance.toFixed(2)} ${handle} ${objects[i].modelName}`;
                            if (objects[i].select) {
                                li.classList.add('liSelect');
                            } else if (objects[i].hover) {
                                li.classList.add('liHover');
                            }
                            li.addEventListener('mouseenter', function() {
                                sendClientMessage('trackObject', {
                                    handle: this.innerHTML.split(" ")[1],
                                    category: "hover",
                                });
                            });
                            li.addEventListener('mouseout', function() {
                                sendClientMessage('trackObject', {
                                    handle: this.innerHTML.split(" ")[1],
                                    category: "hover",
                                    remove: true,
                                });
                            });
                            li.addEventListener('click', function() {
                                sendClientMessage('trackObject', {
                                    handle: this.innerHTML.split(" ")[1],
                                    category: "select",
                                });
                            });
                            ul.appendChild(li);
                        }
                        el.appendChild(ul);
                        if (objects.length < 4) {
                            el.style.minHeight = objects.length + ".3vh";
                        } else {
                            el.style.minHeight = "4.9vh";
                        }
                    });
            }
        } else {
            clearInterval(loopId);
            SceneObjectsLoopRunning = false;
        }
    }, 250);
}

function selectSpawnObject(object) {
    elementSetText("activeObject", object);
    sendClientMessage('selectSpawnObject', { name: object });
}

export function toggleNearbyFilter(type) {
    const selected = elementSetClass(`button-nearby-${type}`, 'selected');
    NearbyOption[type] = selected;
    sendClientMessage('setObjSettings', { nearby: JSON.stringify(NearbyOption) });
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

    elementSetClass(`${PREFIX_OBJ_SPAWN}${prev}`, 'selected', false);
    elementSetClass(`${PREFIX_OBJ_SPAWN}${spawn}`, 'selected', true);

    searchSpawnObject(document.getElementById('objSearch').innerHTML);
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

    "objSpawnLeftColumn",
    "objSearchField",
    "objSpawnName",
    "objSpawnOptions",
    "objSpawnList",

    "objNearbyLeftColumn",
    "objNearbyOrigin",
    "selectedNearbyOrigin",
    "objNearbyFilter",
    "objNearbyRange",
    "objNearbyResults",

    "objScenesLeftColumn",
    "objScenesList",
    "sceneSelected",
    "objSceneTagOptions",
    "objSceneObjectsList",
];

const ObjectHUD_Visible = [
    "objControlOptions",
    "objDetails",
];

const ObjectHUD_Buttons = [
    "button-spawn",
    "button-trackedobjlist",
    "button-importexport",
];

const ObjectHUD_Spawn = [
    "objSpawnLeftColumn",
    "objSearchField",
    "objSpawnName",
    "objSpawnOptions",
    "objSpawnList",
];

const ObjectHUD_Nearby = [
    "objNearbyLeftColumn",
    "objNearbyOrigin",
    "selectedNearbyOrigin",
    "objNearbyFilter",
    "objNearbyRange",
    "objNearbyResults",
];

const ObjectHUD_ImportExport = [
    "objScenesLeftColumn",
    "objSceneControlOptions",
    "objScenesList",
    "sceneSelected",
    "objSceneTagOptions",
    "objSceneObjectsList",
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
    if (state) {
        selectOnly('button-spawn', ObjectHUD_Buttons);
        document.getElementById('button-spawn').focus();
    } else {
        elementSetClass('button-spawn', 'selected', state);
    }
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
    if (state) {
        selectOnly('button-trackedobjlist', ObjectHUD_Buttons);
        document.getElementById('button-trackedobjlist').focus();
        getTrackedObjects();
    } else {
        elementSetClass('button-trackedobjlist', 'selected', state);
    }
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
    if (state) {
        getScenes();
        selectOnly('button-importexport', ObjectHUD_Buttons);
        document.getElementById('button-importexport').focus();
        trackSceneObjects();
    } else {
        elementSetClass('button-importexport', 'selected', state);
    }
}
