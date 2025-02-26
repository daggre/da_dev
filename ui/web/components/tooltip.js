import { elementSetClass } from '../utils/nav.js';

let TooltipEnabled = true;

export function tooltipListener() {
    const tooltip = document.createElement('div');
    elementSetClass(tooltip, 'hidden', true);
    tooltip.id = 'tooltip';
    document.body.appendChild(tooltip);

    let focusedElement = null;

    function showTooltip(label) {
        if (label) {
            tooltip.textContent = label;
            elementSetClass(tooltip, 'hidden', !TooltipEnabled);
        }
    }

    function hideTooltip() {
        elementSetClass(tooltip, 'hidden', true);
    }

    function handleHover(event) {
        if (event.target.hasAttribute('aria-label')) {
            showTooltip(event.target.getAttribute('aria-label'));
        } else {
            if (focusedElement === null) {
                hideTooltip();
            } else {
                showTooltip(focusedElement.getAttribute('aria-label'));
            }
        }
    }

    function handleFocus(event) {
        if (event.target.hasAttribute('aria-label')) {
            focusedElement = event.target;
            if (!document.querySelector(':hover')) {
                showTooltip(event.target.getAttribute('aria-label'));
            }
        }
    }

    function handleFocusOut(event) {
        if (focusedElement === event.target) {
            focusedElement = null;
        }
        if (!document.querySelector(':hover')) {
            hideTooltip();
        }
    }

    document.addEventListener('mouseover', handleHover);
    document.addEventListener('focusin', handleFocus);
    document.addEventListener('focusout', handleFocusOut);
}

export function setTooltips() {
    TooltipEnabled = elementSetClass('objSettingsTooltip', 'selected');
    if (!TooltipEnabled) {
        elementSetClass('tooltip', 'hidden', true);
    }
}
