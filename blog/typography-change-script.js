let typoSwitcher = document.querySelector("input[name=typo]");

let typoVariantsNames = ['book', 'neutral']
let typo = -1

function switchTypo() {
    function switchWork() {
        typo += 1
        if (typo >= typoVariantsNames.length) {
            typo = 0
        }
        document.getElementById('typography').href = '../typography_' + typoVariantsNames[typo] + '.css';
    }

    typoSwitcher.addEventListener('change', function() {
        switchWork();
    });
    switchWork();
}

window.addEventListener("load", switchTypo);
