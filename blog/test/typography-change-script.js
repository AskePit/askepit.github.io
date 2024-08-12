let typoSwitcher = document.querySelector("input[name=typo]");

typoVariants = [2, 3, 6, 7]
typoVariantsNames = ['news', 'book', 'modest', 'tight']
typo = 0

function switchTypo() {
    typoSwitcher.addEventListener('change', function() {
        typo += 1
        if (typo >= typoVariants.length) {
            typo = 0
        }
        document.getElementById('typography').href = 'typography' + typoVariants[typo] + '.css';
        document.getElementById('typo-capture').innerHTML = typoVariantsNames[typo];
    });
}

window.addEventListener("load", switchTypo);