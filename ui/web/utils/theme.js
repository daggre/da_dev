import { DropDownOptions } from '../components/dropdown.js';
import { sendClientMessage } from './msg.js';
import { Settings } from '../components/settings.js';

// TODO: Add other settings save and edit functions
// TODO: Revise settings to make them easier to add

const themes = {
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

function setDividerStyle(divider) {
    const style = dividerStyles[divider];
    document.documentElement.style.setProperty('--divider', `"${style} "`);
    document.getElementById('objSettingsDividerStyle').textContent = divider;
    if (Settings.theme.divider != divider) {
        Settings.theme.divider = divider;
        sendClientMessage('saveSettings', {
            theme: JSON.stringify(Settings.theme),
        });
    }
}

// Define the mapping of option names to divider style values
const dividerStyles = {
    'angle down': '',
    'angle up': '',
    chevron: '',
    flame: '',
    // 'honeycomb': "", // optional entry
    'inverted chevron': '',
    pixelated: '',
    'quadrant top': '▛',
    'quadrant bottom': '▙',
    round: '',
    // 'trapezoid': "", // optional entry
    vertical: '▌',
    waveform: '',
};

// Generate the dropdown options object using Object.entries and Object.fromEntries
DropDownOptions.objSettingsDividerStyle = Object.fromEntries(
    Object.entries(dividerStyles).map(([name]) => [
        name,
        () => setDividerStyle(name),
    ])
);

export function initUIStyle(
    theme,
    divider,
    border,
    borderrad,
    borderradamount
) {
    console.log(theme, divider, border, borderrad, borderradamount);
    console.log(Settings.theme);
    setTheme(theme);
    setDividerStyle(divider);
    document
        .getElementById('objSettingsBorder')
        .classList.toggle('selected', !border);
    setBorder();
    document
        .getElementById('objSettingsCurvedBorder')
        .classList.toggle('selected', !borderrad);
    setCurvedBorder();
    document.getElementById('objSettingsCurvedBorderAmount').textContent =
        borderradamount;
    setCurvedBorderAmount();
}

export function setBorder() {
    // Toggle var(--brd-size) if #objSettingsBorder is selected
    const selected = document
        .getElementById('objSettingsBorder')
        .classList.toggle('selected');
    if (selected) {
        document.documentElement.style.setProperty('--brd-size', '2px');
    } else {
        document.documentElement.style.setProperty('--brd-size', '0px');
    }
    if (Settings.theme.border != selected) {
        Settings.theme.border = selected;
        sendClientMessage('saveSettings', {
            theme: JSON.stringify(Settings.theme),
        });
    }
}

export function setCurvedBorderAmount() {
    const curved = document
        .getElementById('objSettingsCurvedBorder')
        .classList.contains('selected');
    const el = document.getElementById('objSettingsCurvedBorderAmount');
    // Check that the text content is a number
    if (!isNaN(el.textContent)) {
        const borderRad = el.textContent;
        if (curved) {
            document.documentElement.style.setProperty(
                '--brd-rad',
                `${borderRad}px`
            );
        }
        if (Settings.theme.borderradamount != borderRad) {
            Settings.theme.borderradamount = borderRad;
            sendClientMessage('saveSettings', {
                theme: JSON.stringify(Settings.theme),
            });
        }
    }
}

export function setCurvedBorder() {
    const selected = document
        .getElementById('objSettingsCurvedBorder')
        .classList.toggle('selected');
    if (selected) {
        document.documentElement.style.setProperty(
            '--brd-rad',
            `${Settings.theme.borderradamount}px`
        );
    } else {
        document.documentElement.style.setProperty('--brd-rad', '0px');
    }

    if (Settings.theme.borderrad != selected) {
        Settings.theme.borderrad = selected;
        sendClientMessage('saveSettings', {
            theme: JSON.stringify(Settings.theme),
        });
    }
}
