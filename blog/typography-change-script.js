let typoSwitcher = document.querySelector("input[name=typo]");

typoVariants = [3, 2, 6, 7]
typoVariantsNames = ['book', 'magazine', 'modern', 'tight']
typo = -1

function switchTypo() {
    function switchWork() {
        typo += 1
        if (typo >= typoVariants.length) {
            typo = 0
        }
        document.getElementById('typography').href = '../typography' + typoVariants[typo] + '.css';
        document.getElementById('typo-capture').innerHTML = typoVariantsNames[typo];
    }

    typoSwitcher.addEventListener('change', function() {
        switchWork();
    });
    switchWork();
}

window.addEventListener("load", switchTypo);