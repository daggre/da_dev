import { sendClientMessage } from '../utils/msg.js';
import { elementSetClass } from '../utils/nav.js'; // TODO: refactor elementSetClass

export let Settings = {
    Nearby: { object: true, ped: true, vehicle: true, other: false, origin: "camera", range: 50, },
    Spawn: { objects: [], peds: [], vehicles: [], propsets: [], pickups: [], },
    Tag: { sort: "dist" },
}

export function fetchSpawnData() {
    sendClientMessage('initObjects', {}).then(function(resp) {
        Settings.Spawn.objects = JSON.parse(resp.objects);
        Settings.Spawn.peds = JSON.parse(resp.peds);
        Settings.Spawn.vehicles = JSON.parse(resp.vehicles);
        Settings.Spawn.propsets = JSON.parse(resp.propsets);
        Settings.Spawn.pickups = JSON.parse(resp.pickups);
    });
}

export function initSettings() {
    sendClientMessage('initObjSettings', {}).then(function(resp) {
        Settings.Nearby = JSON.parse(resp.nearby);
        Settings.Tag = JSON.parse(resp.tags);

        elementSetClass('button-nearby-object', 'selected', Settings.Nearby.object);
        elementSetClass('button-nearby-ped', 'selected', Settings.Nearby.ped);
        elementSetClass('button-nearby-vehicle', 'selected', Settings.Nearby.vehicle);
        elementSetClass('button-nearby-scene', 'selected', Settings.Nearby.scene);
        document.getElementById('nearbyRange').textContent = Settings.Nearby.range;
        document.getElementById(`button-nearbyOrigin-${formatId(Settings.Nearby.origin)}`).classList.add('selected');
        document.getElementById("activeNearbyOrigin").textContent = Settings.Nearby.origin;
        document.getElementById(`button-tagsortby${Settings.Tag.sort}`).classList.add('selected');
    });
}

function formatId(str) { return str.replace(/ /g, '-'); }
