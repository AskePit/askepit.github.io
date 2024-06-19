let switcher = document.querySelector("input[name=theme]");

window.onload = () => {
    switcher.addEventListener('change', function() {
        document.getElementById('theme').href = this.checked ? 'styles_dark.css' : 'styles_light.css';
    });
}
