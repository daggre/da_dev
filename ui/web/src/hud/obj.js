import { MCP } from '../events.js';
import { toggleHUD, toggleSection } from './common.js';
import { getScenes, trackSceneObjects } from '../scene.js';
import { searchSpawnObject, getTrackedObjects } from '../obj.js';

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
        'objSceneTagOptions',
        'objSceneObjectsList',
        'objSettings',
        'import-hud',
        'export-hud',
    ],
    visible: ['objControlOptions'], // Default visible elements
    buttons: {
        spawn: 'button-spawn',
        tracked: 'button-trackedobjlist',
        importExport: 'button-importexport',
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
        importExport: [
            'objScenesLeftColumn',
            'objScenesList',
            'sceneSelected',
            'objSceneTagOptions',
            'objSceneObjectsList',
        ],
    },
};

export function toggleObjectHUD(state) {
    const objectHudEl = document.getElementById('object-hud');
    state = state ?? objectHudEl.classList.contains('hidden');
    toggleSection(state, ObjectHUD.visible, [], ObjectHUD.all);
    objectHudEl.classList.toggle('hidden', !state);
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

export function toggleObjectImportExportHUD(state) {
    toggleHUD(
        state,
        ObjectHUD,
        'importExport',
        ObjectHUD.buttons.importExport,
        () => {
            getScenes();
            trackSceneObjects();
        }
    );
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
    listEl.classList.toggle('hidden', !state);
}

const ObjectDetailsFields = new Map([
    ['objDetailsEntityHandle', 'handle'],
    ['objDetailsEntityNetworkId', 'networkID'],
    // ["objDetailsEntityModelHash", "modelHash"],
    ['objDetailsEntityModelName', 'modelName'],
    ['objDetailsEntityPosX', 'coords_x'],
    ['objDetailsEntityPosY', 'coords_y'],
    ['objDetailsEntityPosZ', 'coords_z'],
    ['objDetailsEntityRotPitch', 'rotation_pitch'],
    ['objDetailsEntityRotRoll', 'rotation_roll'],
    ['objDetailsEntityRotYaw', 'rotation_yaw'],
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
    ObjectDetailsOptions.forEach((value, key) => {
        document.getElementById(key).classList.toggle('selected', data.selectData[value]);
    });
    objDetailsEl.classList.remove('hidden');
}

export function toggleCrosshair(state) {
    document.getElementById('crosshair').classList.toggle('hidden', !state || !MCP);
}

