import { sendClientMessage } from '../utils/msg.js';
import { initUIStyle } from '../utils/theme.js';

export let Settings = {
    nearby: {
        range: 50,
        ped: true,
        other: false,
        object: true,
        vehicle: true,
        origin: 'camera',
    },
    spawn: {
        objects: [],
        peds: [],
        vehicles: [],
        propsets: [],
        pickups: [],
    },
    tag: {
        sort: 'dist'
    },
    theme: {
        color: 'retro_wave',
        divider: 'angle up',
        border: true,
        borderrad: false,
        borderradamount: 8,
    },
};

export function fetchSpawnData() {
    sendClientMessage('initObjects', {}).then(function (resp) {
        Settings.spawn.objects = JSON.parse(resp.objects);
        Settings.spawn.peds = JSON.parse(resp.peds);
        Settings.spawn.vehicles = JSON.parse(resp.vehicles);
        Settings.spawn.propsets = JSON.parse(resp.propsets);
        Settings.spawn.pickups = JSON.parse(resp.pickups);
    });
}

export function initSettings() {
    sendClientMessage('initObjSettings', {}).then(function (resp) {
        Settings.nearby = JSON.parse(resp.nearby);
        Settings.tag = JSON.parse(resp.tags);
        Settings.theme = JSON.parse(resp.theme);

        document.getElementById('button-nearby-object').classList.toggle('selected', Settings.nearby.object);
        document.getElementById('button-nearby-ped').classList.toggle('selected', Settings.nearby.ped);
        document.getElementById('button-nearby-vehicle').classList.toggle('selected', Settings.nearby.vehicle);
        // document.getElementById('button-nearby-other').classList.toggle('selected', Settings.nearby.other);
        document.getElementById('nearbyRange').textContent = Settings.nearby.range;
        document.getElementById(`button-nearbyOrigin-${formatId(Settings.nearby.origin)}`).classList.add('selected');
        document.getElementById('activeNearbyOrigin').textContent = Settings.nearby.origin;
        document.getElementById(`button-tagsortby${Settings.tag.sort}`).classList.add('selected');
    });
    initUIStyle(
        Settings.theme.color,
        Settings.theme.divider,
        Settings.theme.border,
        Settings.theme.borderrad,
        Settings.theme.borderradamount
    );
}

function formatId(str) {
    return str.replace(/ /g, '-');
}
