const themes = {
    da_bluegreen_vibrant: [
        ['primary', '#50c1ee'],
        ['secondary', '#00daaf'],
        ['secondary-light', '#c2f0e7'],
        ['bg', '#04101D'],
    ],
    da_bluepurple_light: [
        ['primary', '#aac7ff'],
        ['secondary', '#705575'],
        ['secondary-light', '#fad8fd'],
        ['bg', '#04101D'],
    ],
    da_discord: [
        ['primary', '#fad8fd'],
        ['secondary', '#0a305f'],
        ['secondary-light', '#aac7ff'],
        ['bg', '#05213a'],
    ],
    da_catppuccino: [
        ['primary', '#b4befe'],
        ['secondary', '#313244'],
        ['secondary-light', '#b4befe'],
        // ['secondary-light', '#bec6dc'],
        ['bg', '#18181c'],
    ],
    da_grayscale: [
        ['primary', '#ffffff'],
        ['secondary', '#111111'],
        ['secondary-light', '#ffffff'],
        ['bg', '#111111'],
    ],
    da_hotdog: [
        ['primary', '#ff0000'],
        ['secondary', '#660000'],
        ['secondary-light', '#ff0000'],
        ['bg', '#ffff00'],
    ],
};

export function setTheme(theme) {
    if (!themes[theme]) {
        console.error(`Theme not found: ${theme}`);
        return;
    }
    const root = document.documentElement;
    const t = themes[theme];

    console.log(t);

    t.forEach(([key, value]) => {
        console.log(`Setting --${key} to ${value}`);
        root.style.setProperty(`--${key}`, value);
        if (key === 'bg') {
            root.style.setProperty('--bg-t1', `${value}AB`);
            root.style.setProperty('--bg-t2', `${value}75`);
            root.style.setProperty('--bg-t3', `${value}22`);
        }
    });
}
