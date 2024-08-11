let switcher = document.querySelector("input[name=typo]");

typo = 1

window.onload = () => {
    switcher.addEventListener('change', function() {
        typo += 1
        if (typo > 7) {
            typo = 1
        }
        document.getElementById('typography').href = 'typography' + typo + '.css';
        document.getElementById('typo-capture').innerHTML = 'typo ' + typo;
    });
}
