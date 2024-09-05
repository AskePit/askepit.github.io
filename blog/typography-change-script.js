let typoSwitcher = document.querySelector("input[name=typo]");

typoVariantsNames = ['neutral', 'book', 'magazine', 'modern']
typo = -1

function switchTypo() {
    function switchWork() {
        typo += 1
        if (typo >= typoVariantsNames.length) {
            typo = 0
        }
        document.getElementById('typography').href = '../typography_' + typoVariantsNames[typo] + '.css';
        document.getElementById('typo-capture').innerHTML = typoVariantsNames[typo];
    }

    typoSwitcher.addEventListener('change', function() {
        switchWork();
    });
    switchWork();
}

window.addEventListener("load", switchTypo);