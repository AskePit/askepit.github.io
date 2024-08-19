
var dealerScoreLabel = document.getElementById('dealer_score');
var playerScoreLabel = document.getElementById('player_score');
var infoLabel = document.getElementById('info');
var addButton = document.getElementById('add');
var controlButton = document.getElementById('control');

dealerScoreLabel.style.visibility = "hidden";
playerScoreLabel.style.visibility = "hidden";

var deck = new Deck(SetType.Set52, 6);
deck.shuffle();

var dealer = new Player(PlayerType.Computer, "Computer");
dealer.takeCard(deck, false, true);
dealer.takeCard(deck, true, true);


var player = new Player(PlayerType.Human, "Player");
player.takeCard(deck, true, true);
player.takeCard(deck, true, true);


dealer.hand.render('dealer_hand');
player.hand.render('player_hand');

function setControlToStop() {
    controlButton.innerHTML = 'S';
    controlButton.onclick = function() {
        addButton.disabled = true;
        controlButton.disabled = true;
        dealersTurn();
    };
}

function setControlToReset() {
    controlButton.innerHTML = 'R';
    controlButton.disabled = false;
    controlButton.onclick = function() {
        location.reload(true);
    };
}

function showResult(result) {
    infoLabel.innerHTML = result;
    infoLabel.style.visibility = 'visible';
    dealerScoreLabel.style.visibility = 'visible';
    playerScoreLabel.style.visibility = 'visible';
}

function sleep(milliseconds) {
	var dt = new Date();
	while ((new Date()) - dt <= milliseconds) { /* Do nothing */ }
}

function reflowThen(fn) {
    var tempDiv = document.createElement("div");
    tempDiv.innerHTML = '\
                        <p style="margin: 0; padding: 0;\
                        position: absolute; bottom: 0; right: 0;\
                        z-index: -9999;">\
                        <span id="reflow-sensor"\
                        style="margin: 0; padding: 0;\
                        font-family: monospace; font-size: 10px;"\
                        >\xA0\xA0\xA0</span></p>';

    document.body.appendChild(tempDiv.firstChild);
    var reflowSensor = document.getElementById("reflow-sensor");
    var counter = 0;
    var interval = setInterval(function () {
        if (reflowSensor.offsetWidth > 2 || ++counter > 99) {
            clearInterval(interval);
            document.body.removeChild(reflowSensor.parentNode);
            fn();
        }
    }, 20);
}

function dealersTurn() {
    dealer.hand.array[0].open();
    dealer.hand.render('dealer_hand');
    dealerTakeLoop(true, 500);
}

function dealerTakeLoop(cont, delay) {
    if (cont) {
        setTimeout(
            function() {
                var res = dealer.takeCard(deck, true, false);
                dealer.hand.render('dealer_hand');
                dealerTakeLoop(res, delay);
            },
            delay
        );

        return;
    }

    finishGame();
}

function finishGame() {
    var dealerPoints = dealer.points();
    var playerPoints = playerScoreLabel.innerHTML;
    dealerScoreLabel.innerHTML = dealerPoints;

    if(dealerPoints > 21) {
        showResult('You Win!');
    } else if(dealerPoints > playerPoints) {
        showResult('You Lose!');
    } else if(playerPoints > dealerPoints) {
        showResult('You Win!');
    } else {
        showResult('No winner.');
    }

    setControlToReset();
}

playerScoreLabel.innerHTML = player.points();

addButton.onclick = function() {
    player.takeCard(deck, true, true);
    player.hand.render('player_hand');

    var points = player.points();
    playerScoreLabel.innerHTML = points;

    if(points > 21) {
        addButton.disabled = true;
        controlButton.disabled = false;
        showResult('You Lose!');
        setControlToReset();
        return;
    }
};

setControlToStop();