(function () {
    const THEMES = { light: '../styles_light.css', dark: '../styles_dark.css' };
    const DEFAULT = 'light';

    function applyTheme(name) {
        document.getElementById('theme').href = THEMES[name] || THEMES[DEFAULT];
        const sw = document.querySelector("input[name=theme]");
        if (sw) sw.checked = name === 'dark';
    }

    function switchTheme() {
        applyTheme(localStorage.getItem('theme') || DEFAULT);
        const sw = document.querySelector("input[name=theme]");
        sw.addEventListener('change', function () {
            const name = this.checked ? 'dark' : 'light';
            localStorage.setItem('theme', name);
            applyTheme(name);
        });
    }

    window.addEventListener("load", switchTheme);
})();
