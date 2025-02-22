import { toggleHUD, toggleSection } from './common.js';
import { searchSpawnObject } from '../obj.js';
import { getScenes, trackSceneObjects } from "../scene.js";
import { getTrackedObjects } from "../obj.js";

const ObjectHUD = {
    all: [
        "objHelp", "objControlOptions", "objDetails",
        "objSpawnLeftColumn", "objSearchField", "objSpawnName",
        "objSpawnOptions", "objSpawnList", "objNearbyLeftColumn",
        "objNearbyOrigin", "selectedNearbyOrigin", "objNearbyFilter",
        "objNearbyRange", "objNearbyResults", "objScenesLeftColumn",
        "objScenesList", "sceneSelected", "objSceneTagOptions",
        "objSceneObjectsList", "objSettings"
    ],
    visible: ["objControlOptions"], // Default visible elements
    buttons: {
        spawn: "button-spawn",
        tracked: "button-trackedobjlist",
        importExport: "button-importexport",
        settings: "button-objsettings"
    },
    sections: {
        spawn: ["objSpawnLeftColumn", "objSearchField", "objSpawnName", "objSpawnOptions", "objSpawnList"],
        nearby: ["objNearbyLeftColumn", "objNearbyOrigin", "selectedNearbyOrigin", "objNearbyFilter", "objNearbyRange", "objNearbyResults"],
        importExport: ["objScenesLeftColumn", "objScenesList", "sceneSelected", "objSceneTagOptions", "objSceneObjectsList"],
        settings: ["objSettings"],
    }
};

export function toggleObjectHUD(state) {
    const objectHudEl = document.getElementById('objectHUD');
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
    toggleHUD(state, ObjectHUD, 'nearby', ObjectHUD.buttons.tracked, getTrackedObjects);
}

export function toggleObjectImportExportHUD(state) {
    toggleHUD(state, ObjectHUD, 'importExport', ObjectHUD.buttons.importExport, () => {
        getScenes();
        trackSceneObjects();
    });
}

export function toggleObjectSettingsHUD(state) {
    toggleHUD(state, ObjectHUD, 'settings', ObjectHUD.buttons.settings);
}
