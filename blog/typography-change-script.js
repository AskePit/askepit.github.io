(function () {
    const VARIANTS = ['neutral', 'book'];
    const DEFAULT = 'neutral';

    function applyTypo(name) {
        const idx = VARIANTS.indexOf(name);
        document.getElementById('typography').href = '../typography_' + (idx >= 0 ? name : DEFAULT) + '.css';
        const sw = document.querySelector("input[name=typo]");
        if (sw) sw.checked = idx === 1;
    }

    function switchTypo() {
        applyTypo(localStorage.getItem('typo') || DEFAULT);
        const sw = document.querySelector("input[name=typo]");
        sw.addEventListener('change', function () {
            const current = VARIANTS.indexOf(localStorage.getItem('typo') || DEFAULT);
            const next = VARIANTS[(current + 1) % VARIANTS.length];
            localStorage.setItem('typo', next);
            applyTypo(next);
        });
    }

    window.addEventListener("load", switchTypo);
})();
