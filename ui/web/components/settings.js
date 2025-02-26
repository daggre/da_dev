import { sendClientMessage } from '../utils/msg.js';
import { elementSetClass } from '../utils/nav.js'; // TODO: refactor elementSetClass
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

        elementSetClass(
            'button-nearby-object',
            'selected',
            Settings.nearby.object
        );
        elementSetClass('button-nearby-ped', 'selected', Settings.nearby.ped);
        elementSetClass(
            'button-nearby-vehicle',
            'selected',
            Settings.nearby.vehicle
        );
        elementSetClass(
            'button-nearby-scene',
            'selected',
            Settings.nearby.scene
        );
        document.getElementById('nearbyRange').textContent =
            Settings.nearby.range;
        document
            .getElementById(
                `button-nearbyOrigin-${formatId(Settings.nearby.origin)}`
            )
            .classList.add('selected');
        document.getElementById('activeNearbyOrigin').textContent =
            Settings.nearby.origin;
        document
            .getElementById(`button-tagsortby${Settings.tag.sort}`)
            .classList.add('selected');
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
