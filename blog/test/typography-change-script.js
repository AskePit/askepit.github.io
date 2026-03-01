let typoSwitcher = document.querySelector("input[name=typo]");
let typoDesc = document.getElementById("typography-desc");

let typoVariantsNames = [
    '1',
    '2_magazine',
    '3_book',
    '4',
    '5',
    '6_modern',
    '7_tight',
    '10_neutral',
    '11_serif',
]
let typo = -1

function switchTypo() {
    function switchWork() {
        typo += 1
        if (typo >= typoVariantsNames.length) {
            typo = 0
        }
        document.getElementById('typography').href = 'typography' + typoVariantsNames[typo] + '.css';
        typoDesc.textContent = typoVariantsNames[typo];
    }

    typoSwitcher.addEventListener('change', function() {
        switchWork();
    });
    switchWork();
}

window.addEventListener("load", switchTypo);
