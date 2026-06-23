let TooltipEnabled = true;

export function addTooltipListener() {
    const tooltip = document.createElement('div');
    tooltip.classList.add('hidden');
    tooltip.id = 'tooltip';
    document.body.appendChild(tooltip);

    let focusedElement = null;

    function showTooltip(label) {
        if (label) {
            tooltip.textContent = label;
            tooltip.classList.toggle('hidden', !TooltipEnabled);
        }
    }

    function hideTooltip() {
        tooltip.classList.add('hidden');
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

    // Tooltips are disabled: the HUD now uses explicit text buttons instead of
    // icons, so hover labels are redundant. (Listeners left here, commented, in
    // case icon-driven tooltips are wanted again.)
    // document.addEventListener('mouseover', handleHover);
    // document.addEventListener('focusin', handleFocus);
    // document.addEventListener('focusout', handleFocusOut);
    void handleHover; void handleFocus; void handleFocusOut;
}

export function setTooltips() {
    TooltipEnabled = document.getElementById('objSettingsTooltip').classList.toggle('selected');
    if (!TooltipEnabled) {
        document.getElementById('tooltip').classList.add('hidden');
    }
}
