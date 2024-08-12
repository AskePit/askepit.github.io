function switchTheme() {
    let themeSwitcher = document.querySelector("input[name=theme]");
    themeSwitcher.addEventListener('change', function() {
        document.getElementById('theme').href = this.checked ? '../styles_dark.css' : '../styles_light.css';
    });
}
window.addEventListener("load", switchTheme);
