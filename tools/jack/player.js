var PlayerType = {
    Human: 1,
    Computer: 0
}

var Player = function(type, name) {
    this.playerType = type;
    this.hand = new CardArray();
    this.name = name;

    this.takeCard = function(deck, turn, force) {
        if(!force && this.playerType == PlayerType.Computer) {
            if(this.points() >= 17) {
                return false;
            }
        }

        var c = deck.cards.array.pop();

        if(turn) {
            c.open();
        } else {
            c.close();
        }

        this.hand.array.push(c);

        return true;
    }

    this.points = function() {
        var res = 0;
        var aces = 0;

        var cards = this.hand.array;
        for(var i = 0; i<cards.length; ++i) {
            var c = cards[i];
            switch(c.rank) {
                case Rank.Two: res += 2; break;
                case Rank.Three: res += 3; break;
                case Rank.Four: res += 4; break;
                case Rank.Five: res += 5; break;
                case Rank.Six: res += 6; break;
                case Rank.Seven: res += 7; break;
                case Rank.Eight: res += 8; break;
                case Rank.Nine: res += 9; break;
                case Rank.Ten: res += 10; break;
                case Rank.Jack: res += 10; break;
                case Rank.Queen: res += 10; break;
                case Rank.King: res += 10; break;
                case Rank.Ace: {
                    res += 11;
                    ++aces;
                    break;
                }
            }

            while(1) { // if res > 21 then try to decreaseAces values
                if (aces == 0) {
                    break;
                }

                if (res <= 21) {
                    break;
                }

                res = res - 10;
                aces = aces - 1;
            }
        }

        return res;
    }
}