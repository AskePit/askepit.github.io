function switchTheme() {
    let themeSwitcher = document.querySelector("input[name=theme]");
    themeSwitcher.addEventListener('change', function() {
        document.getElementById('theme').href = this.checked ? '../styles_light.css' : '../styles_dark.css';
    });
}
window.addEventListener("load", switchTheme);
