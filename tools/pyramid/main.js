
function pyramidStep(cardView, card, deck, pyramid) {
	if(!card.opened) return;
	if(card.isEmpty()) return;
	
	if(!pyramidMatch(card, deck.last())) return;
	
	var newCard = new Card(card.rank, card.suit, true);
	deck.cards.push(newCard);
	card.reset();
	++pyramid.ballast;
	
	if(pyramid.isEmpty()) {
		finish(true);
	}

	pyramid.recalc();
	pyramid.render('pyramid');
	deck.render('deck');
}

function deckStep(deck, pyramid) {
	if(deck.isEmpty()) {
		finish(false);
		return;
	}
	
	for(var i = 0; i<pyramid.ballast; ++i) {
		deck.cards.pop();
	}
	
	if(deck.isEmpty()) {
		finish(false);
		deck.render('deck');
		return;
	}
	
	pyramid.ballast = 1;
	deck.render('deck');
}

function finish(win) {
	if(win) {
		infoLabel.innerHTML = 'Hooray!';
	} else {
		infoLabel.innerHTML = 'Game Over';
	}
	
	infoLabel.style.visibility = 'visible';
}

var deckView = document.getElementById('deck');
var infoLabel = document.getElementById('info');

deckView.onclick = function() {
	deckStep(deck, pyramid);
}

var deck = new Deck(SetType.Set52, 1);
deck.shuffle();

var pyramid = new Pyramid(deck, pyramidStep);

deck.open();
deck.render('deck');
pyramid.render('pyramid');