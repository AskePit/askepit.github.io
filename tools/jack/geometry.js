var r = 150;

var show = 30; // px
var degDiff = (show*180) / (Math.PI*r);

function Point(x, y) {
    this.x = x;
    this.y = y;
}

function degToRad(deg) {
    return deg*Math.PI/180;
}

function transform(deg) {
    deg -= 90;
    var rad = degToRad(deg);

    var x = Math.round(r*Math.cos(rad));
    var y = Math.round(r*Math.sin(rad) + r);

    var p = new Point(x, y);
    return p;
}

function getTransformProp(deg) {
    var p = transform(deg);

    return 'translate(' + p.x + 'px, ' + p.y + 'px) rotate(' + deg + 'deg)';
}

function getDeg(cardNum, cardCount) {
    var deg = (cardNum - Math.floor(cardCount/2))*degDiff;
    if(cardCount%2 == 0) {
        deg += degDiff/2;
    }

    return deg;
}