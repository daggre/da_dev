import { elementSetOnlyClass } from '../utils/nav.js';

const crosshairElement = document.getElementById('crosshair');

const CrosshairTypes = new Map([
    ['hover', 'active'],
    ['select', 'selected'],
    ['none', 'inactive'],
]);

const CrosshairClasses = [...CrosshairTypes.values()];

export function updateCrosshair(data) {
    // Find the first matching crosshair class, default to "inactive"
    const selectedClass =
        [...CrosshairTypes].find(([key]) => data[key])?.[1] || 'inactive';
    elementSetOnlyClass(crosshairElement, selectedClass, CrosshairClasses);
}
