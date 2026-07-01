import { MCP } from '../events.js';
import { toggleHUD, toggleSection } from './common.js';
import { getScenes, getLoadedScenes, renderFocusedScene, trackSceneObjects } from '../scene.js';
import { searchSpawnObject, getTrackedObjects } from '../obj.js';
import { showInspect } from '../inspect.js';

const ObjectHUD = {
    all: [
        'objHelp',
        'objControlOptions',
        'objDetails',
        'objSpawnLeftColumn',
        'objSearchField',
        'objSpawnName',
        'objSpawnOptions',
        'objSpawnList',
        'objNearbyLeftColumn',
        'objNearbyOrigin',
        'selectedNearbyOrigin',
        'objNearbyFilter',
        'objNearbyRange',
        'objNearbyResults',
        'objScenesLeftColumn',
        'objScenesList',
        'sceneSelected',
        'objObjectsLeftColumn',
        'objSceneTagOptions',
        'objSceneObjectsList',
        'objInspectLeftColumn',
        'objSettings',
        'import-hud',
        'export-hud',
    ],
    visible: ['objControlOptions'], // Default visible elements
    buttons: {
        spawn: 'button-spawn',
        tracked: 'button-trackedobjlist',
        sceneControl: 'button-scenecontrol',
        objects: 'button-objects',
        inspect: 'button-inspect',
    },
    sections: {
        spawn: [
            'objSpawnLeftColumn',
            'objSearchField',
            'objSpawnName',
            'objSpawnOptions',
            'objSpawnList',
        ],
        nearby: [
            'objNearbyLeftColumn',
            'objNearbyOrigin',
            'selectedNearbyOrigin',
            'objNearbyFilter',
            'objNearbyRange',
            'objNearbyResults',
        ],
        // scenes tab = scene management (saved + loaded lists)
        sceneControl: [
            'objScenesLeftColumn',
            'objScenesList',
            'sceneSelected',
        ],
        // objects tab = browse the focused scene's objects
        objects: [
            'objObjectsLeftColumn',
            'objSceneTagOptions',
            'objSceneObjectsList',
        ],
        // inspect tab = entity bones / skeleton viewer (children hide with the container)
        inspect: [
            'objInspectLeftColumn',
        ],
    },
};

export function toggleObjectHUD(state) {
    const objectHudEl = document.getElementById('object-hud');
    state = state ?? objectHudEl.classList.contains('hidden');
    toggleSection(state, ObjectHUD.visible, [], ObjectHUD.all);
    objectHudEl.classList.toggle('hidden', !state);
    if (state) restoreSelectedObjectTab();
}

// On (re)open, the previously-selected tab button keeps its `.selected` highlight, but
// toggleObjectHUD hides every column — so the active tab looks selected yet shows
// nothing, and its onShow (e.g. showInspect, which populates the inspect column) never
// runs. Re-open the selected tab so its column and content are restored.
const ObjectTabToggles = {
    'button-spawn': () => toggleObjectSpawnHUD(true),
    'button-scenecontrol': () => toggleObjectSceneControlHUD(true),
    'button-objects': () => toggleObjectObjectsHUD(true),
    'button-trackedobjlist': () => toggleObjectNearbyHUD(true),
    'button-inspect': () => toggleObjectInspectHUD(true),
};
function restoreSelectedObjectTab() {
    for (const [id, openTab] of Object.entries(ObjectTabToggles)) {
        const el = document.getElementById(id);
        if (el && el.classList.contains('selected')) {
            openTab();
            return;
        }
    }
}

export function toggleObjectSpawnHUD(state) {
    toggleHUD(state, ObjectHUD, 'spawn', ObjectHUD.buttons.spawn, () => {
        searchSpawnObject(document.getElementById('objSearch').textContent);
    });
}

export function toggleObjectNearbyHUD(state) {
    toggleHUD(
        state,
        ObjectHUD,
        'nearby',
        ObjectHUD.buttons.tracked,
        getTrackedObjects
    );
}

export function toggleObjectSceneControlHUD(state) {
    toggleHUD(
        state,
        ObjectHUD,
        'sceneControl',
        ObjectHUD.buttons.sceneControl,
        () => {
            getScenes();
            getLoadedScenes();
        }
    );
}

export function toggleObjectObjectsHUD(state) {
    toggleHUD(
        state,
        ObjectHUD,
        'objects',
        ObjectHUD.buttons.objects,
        () => {
            renderFocusedScene();
            trackSceneObjects();
        }
    );
}

export function toggleObjectInspectHUD(state) {
    toggleHUD(state, ObjectHUD, 'inspect', ObjectHUD.buttons.inspect, () => {
        showInspect();
    });
}

export function toggleObjectSettingsHUD(state) {
    toggleHUD(state, ObjectHUD, 'settings', ObjectHUD.buttons.settings);
}

const ObjectDetailsCategoryMap = new Map([
    ['button-objDetailsPosition', 'objDetailsListPosition'],
    ['button-objDetailsStatus', 'objDetailsListStatus'],
]);

export function toggleObjectDetail(elId, state) {
    console.log('toggleObjectDetail', elId, state);
    const el = document.getElementById(elId);
    if (state === undefined) {
        state = !el.classList.contains('selected');
    }
    el.classList.toggle('selected', state);
    const listEl = ObjectDetailsCategoryMap.get(elId);
    document.getElementById(listEl).classList.toggle('hidden', !state);
}

const ObjectDetailsFields = new Map([
    ['objDetailsEntityHandle', 'handle'],
    ['objDetailsEntityNetworkId', 'networkID'],
    // ["objDetailsEntityModelHash", "modelHash"],
    ['objDetailsEntityModelName', 'modelName'],
]);
const ObjectDetailsFloats = new Map([
    ['objDetailsEntityPosX', 'pos_x'],
    ['objDetailsEntityPosY', 'pos_y'],
    ['objDetailsEntityPosZ', 'pos_z'],
    ['objDetailsEntityRotPitch', 'rot_x'],
    ['objDetailsEntityRotRoll', 'rot_y'],
    ['objDetailsEntityRotYaw', 'rot_z'],
]);

const ObjectDetailsOptions = new Map([
    ['objDetailsEntityVisible', 'visible'],
    ['objDetailsEntityFrozen', 'frozen'],
    ['objDetailsEntityCollision', 'collision'],
]);

function clearObjectDetails() {
    ObjectDetailsFields.forEach((value, key) => {
        document.getElementById(key).textContent = '';
    });
    ObjectDetailsFloats.forEach((value, key) => {
        document.getElementById(key).textContent = '';
    });
    ObjectDetailsOptions.forEach((value, key) => {
        document.getElementById(key).textContent = '';
    });
}

export function updateObjectDetails(data) {
    const objDetailsEl = document.getElementById('objDetails');
    if (!data.select) {
        clearObjectDetails();
        objDetailsEl.classList.add('hidden');
        return;
    }

    ObjectDetailsFields.forEach((value, key) => {
        document.getElementById(key).textContent = data.selectData[value];
    });
    ObjectDetailsFloats.forEach((value, key) => {
        document.getElementById(key).textContent = data.selectData[value].toFixed(3).replace(/\.?0+$/, '');
    });
    ObjectDetailsOptions.forEach((value, key) => {
        document.getElementById(key).classList.toggle('selected', data.selectData[value]);
    });
    objDetailsEl.classList.remove('hidden');
}

export function toggleCrosshair(state) {
    document.getElementById('crosshair').classList.toggle('hidden', !state || !MCP);
}
