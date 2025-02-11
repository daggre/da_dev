const themes = {
    da_bluegreen_vibrant: [
        ['primary', '#50c1ee'],
        ['secondary', '#bb73eb'],
        ['tertiary', '#00daaf'],
        ['tertiary-light', '#c2f0e7'],
        ['tertiary-dark', '#00daaf'],
        ['highlight', '#bec6dc'],
        ['bg', '#04101D'],
    ],
    da_bluepurple_light: [
        ['primary', '#aac7ff'],
        ['primary-dark', '#0a305f'],
        ['secondary', '#bec6dc'],
        ['tertiary', '#705575'],
        ['tertiary-light', '#fad8fd'],
        ['tertiary-dark', '#573e5c'],
        ['highlight', '#bec6dc'],
        ['bg', '#04101D'],
    ],
    da_discord: [
        ['primary', '#fad8fd'],
        ['primary-dark', '#cdbcf5'],
        // ['secondary', '#bec6dc'],
        ['tertiary', '#aac7ff'],
        ['tertiary-dark', '#0a305f'],
        ['highlight', '#bec6dc'],
        ['bg', '#05213a'],
    ],
    da_grayscale: [
        ['primary', '#ffffff'],
        ['primary-dark', '#000000'],
        ['secondary', '#aaaaaa'],
        ['tertiary', '#888888'],
        ['tertiary-light', '#ffffff'],
        ['tertiary-dark', '#111111'],
        ['highlight', '#dddddd'],
        ['bg', '#111111'],
    ],
    da_hotdog: [
        ['primary', '#ff0000'],
        ['primary-dark', '#660000'],
        ['secondary', '#ffaaaa'],
        ['tertiary', '#ff0000'],
        ['tertiary-light', '#ff0000'],
        ['tertiary-dark', '#660000'],
        ['highlight', '#ffdddd'],
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
