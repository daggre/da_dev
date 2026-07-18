import { DropDownOptions } from '../src/dropdown.js';
import { sendClientMessage } from '../src/msg.js';
import { Settings } from '../src/settings.js';

// TODO: Add other settings save and edit functions
// TODO: Revise settings to make them easier to add

const themes = {
    da: [
        ['primary', '#8fb8ff'],
        ['secondary', '#4a6fa5'],
        ['secondary-light', '#d7e6ff'],
        ['bg', '#05101e'],
    ],
    oasis: [
        ['primary', '#50c1ee'],
        ['secondary', '#00daaf'],
        ['secondary-light', '#c2f0e7'],
        ['bg', '#04101D'],
    ],
    moonlit_orchid: [
        ['primary', '#aac7ff'],
        ['secondary', '#705575'],
        ['secondary-light', '#fad8fd'],
        ['bg', '#04101D'],
    ],
    wisteria: [
        ['primary', '#fad8fd'],
        ['secondary', '#4169e1'],
        ['secondary-light', '#aac7ff'],
        ['bg', '#05213a'],
    ],
    electric_sunset: [
        ['primary', '#ff4500'],
        ['secondary', '#6a0dad'],
        ['secondary-light', '#ffb347'],
        ['bg', '#1b0030'],
    ],
    overcast: [
        ['primary', '#b4befe'],
        ['secondary', '#313244'],
        ['secondary-light', '#b4befe'],
        ['bg', '#18181c'],
    ],
    giedi_prime: [
        ['primary', '#ffffff'],
        ['secondary', '#111111'],
        ['secondary-light', '#ffffff'],
        ['bg', '#111111'],
    ],
    hotdog: [
        ['primary', '#ff0000'],
        ['secondary', '#660000'],
        ['secondary-light', '#ff0000'],
        ['bg', '#ffff00'],
    ],
    neon_sunset: [
        ['primary', '#ff007f'],
        ['secondary', '#ffbb33'],
        ['secondary-light', '#ffbb33'],
        ['bg', '#1a001a'],
    ],
    arctic_ice: [
        ['primary', '#b3e5fc'],
        ['secondary', '#0288d1'],
        ['secondary-light', '#81d4fa'],
        ['bg', '#011f2d'],
    ],
    cherry_blossom: [
        ['primary', '#ffb7c5'],
        ['secondary', '#ff3366'],
        ['secondary-light', '#ffe4e1'],
        ['bg', '#1a0e1a'],
    ],
    emerald_dream: [
        ['primary', '#3ddc84'],
        ['secondary', '#0b3b0b'],
        ['secondary-light', '#99e599'],
        ['bg', '#021b12'],
    ],
    blueberry_night: [
        ['primary', '#4a90e2'],
        ['secondary', '#1c2b44'],
        ['secondary-light', '#89c9ff'],
        ['bg', '#060c1c'],
    ],
    netrunner: [
        ['primary', '#00c0ee'],
        ['secondary', '#ff00ff'],
        ['secondary-light', '#ffff66'],
        ['bg', '#0a0a0f'],
    ],
    oceanic: [
        ['primary', '#70aadc'],
        ['secondary', '#1e3d59'],
        ['secondary-light', '#a4d4e6'],
        ['bg', '#002233'],
    ],
    solarized_night: [
        ['primary', '#b58900'],
        ['secondary', '#268bd2'],
        ['secondary-light', '#2aa198'],
        ['bg', '#002b36'],
    ],
    rose: [
        ['primary', '#ff6b81'],
        ['secondary', '#212121'],
        ['secondary-light', '#ffccd5'],
        ['bg', '#141414'],
    ],
    night_king: [
        ['primary', '#a0c4ff'],
        ['secondary', '#003366'],
        ['secondary-light', '#d0f4ff'],
        ['bg', '#051730'],
    ],
    dark_cherry: [
        ['primary', '#ff4d6d'],
        ['secondary', '#311432'],
        ['secondary-light', '#d783ff'],
        ['bg', '#12000d'],
    ],
    retro_wave: [
        ['primary', '#ff66c4'],
        ['secondary', '#0abdc6'],
        ['secondary-light', '#ffde59'],
        ['bg', '#2a0066'],
    ],
    verdant_steel: [
        ['primary', '#50c878'], // Emerald Green
        ['secondary', '#2c3e50'], // Steel Gray
        ['secondary-light', '#a8e6cf'], // Mint Aqua
        ['bg', '#0e1f2a'], // Dark Teal Gray
    ],
    mystic_grove: [
        ['primary', '#00a86b'], // Jade Green
        ['secondary', '#1c2833'], // Dark Blue-Gray
        ['secondary-light', '#66d9ff'], // Soft Aqua Green
        ['bg', '#0a1e26'], // Deep Teal Shadow
    ],
};

// ── colour helpers: derive the timeline bar fills from a theme's primary hue ──
function hexToRgb(hex) {
    const h = hex.replace('#', '');
    const n = h.length === 3 ? h.split('').map(c => c + c).join('') : h;
    const int = parseInt(n, 16);
    return [(int >> 16) & 255, (int >> 8) & 255, int & 255];
}
function rgbToHsl(r, g, b) {
    r /= 255; g /= 255; b /= 255;
    const max = Math.max(r, g, b), min = Math.min(r, g, b);
    let h = 0, s = 0; const l = (max + min) / 2;
    if (max !== min) {
        const d = max - min;
        s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
        if (max === r) h = (g - b) / d + (g < b ? 6 : 0);
        else if (max === g) h = (b - r) / d + 2;
        else h = (r - g) / d + 4;
        h /= 6;
    }
    return [h * 360, s, l];
}
const hslCss = (h, s, l) =>
    `hsl(${(((h % 360) + 360) % 360).toFixed(0)}, ${Math.round(s * 100)}%, ${Math.round(l * 100)}%)`;

// Timeline bar fills, DERIVED from the theme so every palette gets matching colours (the hand-tuned
// night-king look falls straight out of these formulas). Anim bars take the primary hue at a muted
// saturation; prop bars take the near-complement, more desaturated, so props read as their own
// species. An achromatic primary (white/grey themes) stays grey — no hue is injected.
function applyTimelineColors(root, t) {
    const primaryHex = (t.find(([k]) => k === 'primary') || [])[1] || '#8fb8ff';
    const [ph, ps] = rgbToHsl(...hexToRgb(primaryHex));
    const animS = Math.min(ps, 0.32);
    const propH = ph + 190;              // ~complement: night-king's blue → warm taupe
    const propS = Math.min(ps, 0.18);
    const vars = {
        'scn-bar-top':  hslCss(ph, animS, 0.48),
        'scn-bar-bot':  hslCss(ph, animS + 0.02, 0.36),
        'scn-prop-top': hslCss(propH, propS, 0.51),
        'scn-prop-bot': hslCss(propH, propS, 0.37),
        'scn-prop-hi':  hslCss(propH, propS, 0.82),  // continuation chevrons / bright accents
        'scn-prop-lo':  hslCss(propH, propS, 0.14),  // the dark action glyph
    };
    Object.entries(vars).forEach(([k, v]) => root.style.setProperty(`--${k}`, v));
}

function setTheme(theme) {
    if (!themes[theme]) {
        console.error(`Theme not found: ${theme}`);
        return;
    }
    const root = document.documentElement;
    const t = themes[theme];

    t.forEach(([key, value]) => {
        // console.log(`Setting --${key} to ${value}`);
        root.style.setProperty(`--${key}`, value);
        if (key === 'bg') {
            root.style.setProperty('--bg-t1', `${value}AB`);
            root.style.setProperty('--bg-t2', `${value}75`);
            root.style.setProperty('--bg-t3', `${value}22`);
        }
    });
    applyTimelineColors(root, t);
    sendClientMessage('setTheme', { theme: t });
    const displayTheme = theme.replace(/_/g, ' ');
    document.getElementById('objSettingsTheme').textContent = displayTheme;
    if (Settings.theme.color != theme) {
        Settings.theme.color = theme;
        sendClientMessage('saveSettings', {
            theme: JSON.stringify(Settings.theme),
        });
    }
}

DropDownOptions.objSettingsTheme = Object.fromEntries(
    Object.keys(themes).map(key => {
        // Create a display name by replacing underscores with spaces
        const displayName = key.replace(/_/g, ' ');
        return [displayName, () => setTheme(key)];
    })
);

// The Settings card now only carries the theme (plus autohide + submit-form, handled elsewhere).
// Divider style, border toggle and rounded-edge controls were removed — the border/radius still
// come from base.css defaults (--brd-size / --brd-rad), just no longer user-toggled.
export function initUIStyle(theme) {
    setTheme(theme);
}
