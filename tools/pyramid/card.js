var Suit = {
    Spades: 'S',
    Hearts: 'H',
    Clubs: 'C',
    Diamonds: 'D',
	No: 'No',
}

var Rank = {
    Two: '2',
    Three: '3',
    Four: '4',
    Five: '5',
    Six: '6',
    Seven: '7',
    Eight: '8',
    Nine: '9',
    Ten: 'T',
    Jack: 'J',
    Queen: 'Q',
    King: 'K',
    Ace: 'A',
	No: 'No'
}

function pyramidRankValue(card) {
	switch(card.rank) {
		case Rank.Ace: return 1;
        case Rank.Two: return 2;
        case Rank.Three: return 3;
        case Rank.Four: return 4;
        case Rank.Five: return 5;
        case Rank.Six: return 6;
        case Rank.Seven: return 7;
        case Rank.Eight: return 8;
        case Rank.Nine: return 9;
        case Rank.Ten: return 10;
        case Rank.Jack: return 11;
        case Rank.Queen: return 12;
        case Rank.King: return 13;
    }
}

function pyramidMatch(card, deckCard) {
	cardVal = pyramidRankValue(card);
	deckCardVal = pyramidRankValue(deckCard);
	
	return Math.abs(cardVal-deckCardVal)%11 == 1;
}

var SetType = {
    Set52: 52,
    Set36: 36,
    Set32: 32,
    Set24: 24
}

var SuitSet = [
    Suit.Spades,
    Suit.Hearts,
    Suit.Clubs,
    Suit.Diamonds,
];

var RankSet_52 = [
    Rank.Two,
    Rank.Three,
    Rank.Four,
    Rank.Five,
    Rank.Six,
    Rank.Seven,
    Rank.Eight,
    Rank.Nine,
    Rank.Ten,
    Rank.Jack,
    Rank.Queen,
    Rank.King,
    Rank.Ace,
];

var RankSet_36 = [
    Rank.Six,
    Rank.Seven,
    Rank.Eight,
    Rank.Nine,
    Rank.Ten,
    Rank.Jack,
    Rank.Queen,
    Rank.King,
    Rank.Ace,
];

var RankSet_32 = [
    Rank.Seven,
    Rank.Eight,
    Rank.Nine,
    Rank.Ten,
    Rank.Jack,
    Rank.Queen,
    Rank.King,
    Rank.Ace,
];

var RankSet_24 = [
    Rank.Nine,
    Rank.Ten,
    Rank.Jack,
    Rank.Queen,
    Rank.King,
    Rank.Ace,
];

function getRandSuit() {
    var r = Math.floor(Math.random()*3);
    switch(r) {
        case 0: return Suit.Spades;
        case 1: return Suit.Hearts;
        case 2: return Suit.Clubs;
        case 3: return Suit.Diamonds;
    }
}

function getRandRank() {
    var r = Math.floor(Math.random()*13);
    switch(r) {
        case 0: return Rank.Two;
        case 1: return Rank.Three;
        case 2: return Rank.Four;
        case 3: return Rank.Five;
        case 4: return Rank.Six;
        case 5: return Rank.Seven;
        case 6: return Rank.Eight;
        case 7: return Rank.Nine;
        case 8: return Rank.Ten;
        case 9: return Rank.Jack;
        case 10: return Rank.Queen;
        case 11: return Rank.King;
        case 12: return Rank.Ace;
    }
}

function RandCard() {
    this.rank = getRandRank();
    this.suit = getRandSuit();
    this.opened = Math.random() >= 0.5;
}

function Card(rank, suit, opened) {
    this.rank = rank;
    this.suit = suit;
    this.opened = opened;

    this.open = function() {
        this.opened = true;
    }

    this.close = function() {
        this.opened = false;
    }
	
	this.toggle = function() {
		this.opened = !this.opened;
	}
	
	this.isEmpty = function() {
		return this.rank == Rank.No || this.suit == Suit.No;
	}
	
	this.reset = function() {
		this.rank = Rank.No;
		this.suit = Suit.No;
	}
}

function getCardPath(card) {
    var url;
	if(card.isEmpty()) {
		url = '';
	} else if (card.opened) {
        let ext = '.svg'
        url = 'cards/' + card.rank + card.suit + ext;
    } else {
        url = 'cards/shirt.svg';
    }
    return url;
}

function getCardUrl(card) {
    var url;
	if(card.isEmpty()) {
		url = '';
	} else if (card.opened) {
        let ext = '.svg'
        url = 'url("cards/' + card.rank + card.suit + ext + '")';
    } else {
        url = 'url("cards/shirt.svg")';
    }
    return url;
}

function preloadImage(im_url) {
    let img = new Image();
    img.src = im_url;
}

function Deck(setType, deckCount) {
    this.cards = [];

    this.shuffle = function() {
        var cards = this.cards;
        var j, x, i;
        for (i = cards.length; i; --i) {
            j = Math.floor(Math.random() * i);
            x = cards[i - 1];
            cards[i - 1] = cards[j];
            cards[j] = x;
        }
    }
	
	this.open = function() {
		for(var i = 0; i<this.cards.length; ++i) {
			this.cards[i].open();
		}
	}
	
	this.isEmpty = function() {
		return this.cards.length < 1;
	}

    var rankSet;
    switch(setType) {
        case SetType.Set52: rankSet = RankSet_52; break;
        case SetType.Set36: rankSet = RankSet_36; break;
        case SetType.Set32: rankSet = RankSet_32; break;
        case SetType.Set24: rankSet = RankSet_24; break; 
    }

    for(var d = 0; d<deckCount; ++d) {
        for (var s = 0; s<SuitSet.length; ++s) {
            for (var r = 0; r<rankSet.length; ++r) {
                var c = new Card(rankSet[r], SuitSet[s], false);
                this.cards.push(c);

                preloadImage(getCardPath(new Card(rankSet[r], SuitSet[s], true)));
            }
        }
    }
	
	this.last = function() {
		return this.cards[this.cards.length-1];
	}
	
	this.render = function(viewId) {
        var view = document.getElementById(viewId);
		
		if(this.isEmpty()) {
			view.style.backgroundImage = getCardUrl(new Card(Rank.No, Suit.No, true));
            view.style.backgroundRepeat = 'no-repeat';
			return;
		}

		var c = this.last();
		view.style.backgroundImage = getCardUrl(c);
        view.style.backgroundRepeat = 'no-repeat';
		
		var shadow = '';
		var cardsCount = this.cards.length;
		var x = cardsCount%2; // to make same color sequence for stacked shadows
		
		for(var i = 0; i<cardsCount; ++i) {
			var color = (i+x)%2 ? '#777' : '#e9e5b8';
			var delim = i == cardsCount-1 ? '' : ',';
			
			shadow += '-' + i + 'px -' + i + 'px ' + color + delim;
		}
		
		view.style.boxShadow = shadow;
		view.style.transform = 'translate(' + cardsCount + 'px, ' + cardsCount + 'px)';
    }
}


function Pyramid(deck, stepFunc) {	
    this.cards = [];
	this.levels = 7;
	
	for (var i = 0; i<this.levels; ++i) {
		this.cards[i] = [];
	}
	
	this.ballast = 1;

    for(var row = 0; row<this.levels; ++row) {
		for(var col = 0; col<row+1; ++col) {
			var c = deck.cards.pop();			
			this.cards[row].push(c);
		}
	}
	
	for(var i = 0; i<this.levels; ++i) {
		this.cards[this.levels-1][i].open();
	}
	
    this.render = function(viewId) {
        var view = document.getElementById(viewId);
        while(view.firstChild) {
            view.removeChild(view.firstChild);
        }

        for(var row = 0; row<this.levels; ++row) {
			var cols = this.cards[row].length;
			for(var col = 0; col<cols; ++col) {
			
				var cardView = document.createElement('div');
				var card = this.cards[row][col];
				
				var cardUrl = getCardUrl(card);
				if(cardUrl == '') {
					cardView.setAttribute('class', 'card-space no-card');
				} else {
					cardView.setAttribute('class', 'card-space card');
					cardView.style.backgroundImage = getCardUrl(card);
                    cardView.style.backgroundRepeat = 'no-repeat';
                    cardView.style.transform = 'translateY(-' + 11.9*row + 'vh)';
				}
								
				(function(_cardView, _card, _deck, _pyramid){
					cardView.onclick = function () { stepFunc(_cardView, _card, _deck, _pyramid) };
				})(cardView, card, deck, this);
				
				view.appendChild(cardView);
			}
			
			view.appendChild(document.createElement('br'));
        }
    }
	
	this.recalc = function() {
		var rows = this.levels-1;
        for(var row = 0; row<rows; ++row) {
			var cols = this.cards[row].length;
			for(var col = 0; col<cols; ++col) {
				var card = this.cards[row][col];
				if(card.opened) continue;
				if(this.cards[row+1][col].isEmpty() && this.cards[row+1][col+1].isEmpty()) {
					card.open();
				}
			}
		}
	}
	
	this.isEmpty = function() {
		/*var count = 0;
		var rows = this.cards.length-1;
        for(var row = 0; row<rows; ++row) {
			var cols = this.cards[row].length;
			for(var col = 0; col<cols; ++col) {
				var card = this.cards[row][col];
				if(!card.isEmpty()) {
					++count;
				}
			}
		}
		
		return !count;*/
		return this.cards[0][0].isEmpty();
	}
}