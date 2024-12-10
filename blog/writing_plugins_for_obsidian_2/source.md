---
tags:
  - article
title: Write Obsidian plugins, part II
---
Let's continue writing our own plugins for Obsidian. You can find the first part of the article [here](https://habr.com/ru/articles/861230/). In it, we:

- Discovered that writing plugins can be even easier than the official documentation suggests
- Wrote three small plugins, which are already being used ~~in production~~ personally by me
- Promised to write a fourth "final boss" plugin

Now, let's get started.

# Plugin 4. Chess Viewer. The Idea

I'm not a chess player, but I'm interested in it :) I have notes with chess sketches. And I'm definitely not alone in this, since right now there are three plugins in the Community plugins section that allow displaying a chessboard with pieces in a note.

I used to use Obsidian Chess, but it used images for the pieces on the board, and for some reason, they took forever to load on the page. Eventually, the piece images disappeared altogether:

![](https://habrastorage.org/webt/oe/co/zj/oecozjunect7vh_ofd0yy6iwb5q.png)

Now, I can't even find this plugin in the list of available ones for installation.

There are a couple of other solutions, like [Chesser](https://github.com/SilentVoid13/Chesser) or [Chess Study](https://github.com/chrislicodes/obsidian-chess-study), but they are more like all-in-one tools — you can move pieces, brainstorm, draw interactive arrows, and so on. In short, it's complicated — I needed something simple, reliable, and not slow.

A plugin that comes close to what I need is [Chessboard Viewer](https://github.com/THeK3nger/obsidian-chessboard): view-only, pieces are drawn in SVG, with minimal options for highlighting important squares and drawing static arrows. But it has two drawbacks:

- I don’t like the appearance of the pieces and the board.
- I've already come up with my own quirky way of cheaply displaying pieces, and it's not SVG.

What’s this method? Honestly, I don’t even know how to explain it — it’s ASCII characters :) Here they are: ♔ ♕ ♖ ♗ ♘ ♙ ♚ ♛ ♜ ♝ ♞ ♟. And when you enlarge them, you can see that they actually look pretty decent, at least in my opinion:

![](https://habrastorage.org/webt/bx/yb/nk/bxybnkzqhjryp6i69fhudk8wi9e.png)

Initially, I wanted to display the board in a minimalist ASCII-only version. But after some struggles, I realized I would face insurmountable problems with displaying empty white and black squares. So, I decided to dive into proper HTML-CSS layout, where each square would render its ASCII symbols. It’s still cheap, and the main feature — the ASCII pieces — remains, but it won’t look as bad.

# How to Describe the Board in a Note

Traditionally, such plugins use [FEN notation](https://www.chess.com/terms/fen-chess) to describe the chessboard. It’s a simple and accessible way to represent the state of the chessboard in one line. The basic version of FEN notation looks like this:

```
rnbqkbnr/pp1ppppp/2p5/8/4P3/8/PPPP1PPP/RNBQKBNR
```

Rows are separated by slashes `/`. The letters stand for: `r` — rook, `n` — knight, `b` — bishop, `q` — queen, `k` — king, `p` — pawn. Uppercase letters are for white, lowercase for black. Numbers indicate the number of consecutive empty squares in the row. After the FEN string, there may be additional annotations regarding turn order, castling rights, and so on, but these aren’t relevant for our task.

We want our plugin to work like this: in the note, we’ll write the FEN notation in a code block with the label `chess`:

````
```chess
8/3k1P2/2N5/b7/5K2/4r3/3P4/8
```
````

And in preview mode, the note should render a chessboard with pieces instead of the code block, looking something like this:

![](https://habrastorage.org/webt/ku/eb/up/kuebupzm7vzynllf__h-aiupvla.png)

# Let's Get Started

So, we want to find all `chess` blocks in the note and replace their content. Hmm, does this sound familiar to you? If you’ve read [the previous article](https://habr.com/ru/articles/861230/), you might remember that this is exactly the scenario of our first, simplest plugin: Guitar Tabs Viewer, which replaced "all dashes with dots" in the pursuit of more readable guitar tablature. So, at the very least, we can borrow from there that replacing HTML during the pre-rendering stage is handled by the `Plugin.registerMarkdownCodeBlockProcessor()` method, and the basic structure of the plugin should look something like this:
```javascript
class ChessLightweightPlugin extends obsidian.Plugin {
    async onload() {
        this.registerMarkdownCodeBlockProcessor('chess', (source, el, ctx) => {
            // Render chess board
            el.innerHTML = ...???
        })
    }
}
```

We just need to figure out what to put in `el.innerHTML`, and the plugin will be ready! Obviously, `el.innerHTML` should contain the HTML markup for the board: black-and-white squares. And in each of the squares, we can optionally place the figure that is present there.

# HTML Skeleton

This is where a bit of bad code comes into play, which has never hurt anyone. I just don't know how else to describe what I've done in terms of HTML implementation for an empty board, so brace yourselves:

```javascript
const boardHtml =
`<div class="board">
    <div class="row" id="row8">
        <div class="square white" id="a8"></div>
        <div class="square black" id="b8"></div>
        <div class="square white" id="c8"></div>
        <div class="square black" id="d8"></div>
        <div class="square white" id="e8"></div>
        <div class="square black" id="f8"></div>
        <div class="square white" id="g8"></div>
        <div class="square black" id="h8"></div>
    </div>
    <div class="row" id="row7">
        <div class="square black" id="a7"></div>
        <div class="square white" id="b7"></div>
        <div class="square black" id="c7"></div>
        <div class="square white" id="d7"></div>
        <div class="square black" id="e7"></div>
        <div class="square white" id="f7"></div>
        <div class="square black" id="g7"></div>
        <div class="square white" id="h7"></div>
    </div>
...
    <div class="row" id="row1">
        <div class="square black" id="a1"></div>
        <div class="square white" id="b1"></div>
        <div class="square black" id="c1"></div>
        <div class="square white" id="d1"></div>
        <div class="square black" id="e1"></div>
        <div class="square white" id="f1"></div>
        <div class="square black" id="g1"></div>
        <div class="square white" id="h1"></div>
    </div>
</div>`
```
Well, you get it — I was too lazy to generate this via JS, plus I got some inexplicable clarity from these eighty-something lines — it's like I'm looking at the skeleton of an empty board :)

Now we can overwrite the `chess`-code block with this board:

```javascript
async onload() {
	this.registerMarkdownCodeBlockProcessor('chess', (source, el, ctx) => {
		el.innerHTML = boardHtml
	})
}
```

We don't even need to check to understand that by doing this, we replaced our code blocks in the notes with a visual _nothing_ — emptiness, since our `<div>` elements still don't have a visual representation.

# CSS

Let's fix that. Here's the CSS file I came up with that should visualize the board:

```css
body {
    --cell-size: 50px;
}

.board {
    margin: 20px 0px 20px 0px;
}

.row {
    display: flex;
    flex-direction: row;
}

.square {
    width: var(--cell-size);
    height: var(--cell-size);
    display: flex;
    align-items: center;
    justify-content: center;
}

.white {
    background-color: color(srgb 0.944 0.944 0.944);
}

.black {
    background-color: color(srgb 0.81333 0.81333 0.81333);
}
```

Nothing special: we give the cells sizes, color them in their respective colors, and arrange them in rows.

At first, I checked the functionality of these styles using a regular pair of HTML-CSS files in a browser, and it worked. But how do we apply this CSS in the plugin now? It's very simple — you create a file named `styles.css` (exactly this name!) and just place it in the folder where `main.js` is located. No additional steps are needed, the styles will be automatically applied.

Now, let's test it on a simple note:

````
# Two rooks mate

```chess
8/8/4k3/R7/7R/8/8/6K1
```

```chess
8/4k3/7R/R7/8/8/8/6K1
```
````

We get:

![](https://habrastorage.org/webt/rv/px/je/rvpxjeqckvyfwrsvymncwuwnlqa.png)

It works! I didn't do it in vain, specifying top and bottom margins in the `.board` class: `margin: 20px 0px 20px 0px;`. Without this, the two boards would stick together into one solid piece.

The boards are drawn, but the content of the `chess` blocks is ignored, and the boards themselves are empty. For now, we'll continue to ignore the FEN notation — we'll get to that later. Right now, let's quickly place the pieces directly in the HTML:

```javascript
const whitesBoardHtml =
`<div class="board">
    <div class="row" id="row8">
        <div class="square white" id="a8">♞</div>
        <div class="square black" id="b8"></div>
        <div class="square white" id="c8">♗</div>
        <div class="square black" id="d8"></div>
        <div class="square white" id="e8">♛</div>
        <div class="square black" id="f8"></div>
        <div class="square white" id="g8">♔</div>
        <div class="square black" id="h8"></div>
    </div>
    <div class="row" id="row7">
        <div class="square black" id="a7"></div>
        <div class="square white" id="b7">♟</div>
        <div class="square black" id="c7"></div>
        <div class="square white" id="d7">♚</div>
        <div class="square black" id="e7"></div>
        <div class="square white" id="f7">♖</div>
        <div class="square black" id="g7"></div>
        <div class="square white" id="h7">♝</div>
    </div>
...
```

We look at the result:

![](https://habrastorage.org/webt/fb/lo/9q/fblo9qqopz-spqulhvs9xka7z2u.png)

Not enough, we need to increase the font size. And I can already see something strange... Let's increase it:

```css
.square {
	...
    font-size: calc(var(--cell-size) * 0.85);
}
```

Let's take a look:

![](https://habrastorage.org/webt/5l/ve/o9/5lveo9jctbasspcp6xuepx1jhye.png)

What is happening?! Why is the black pawn like this? It turned out during the investigation that this is an **ASCII bug**, specifically with the black pawn symbol. It depends on who is rendering the font, but in 90% of cases, there are issues with the black pawn in all programs — it’s larger than the others and blue. And in Obsidian too. But under random circumstances, you might get lucky. I, for example, got lucky once, and the simple:

```css
.square {
	...
    font-family: serif;
}
```

fixed the issue:

![](https://habrastorage.org/webt/kz/8c/ju/kz8cjuasmtvwap5aiad5ex6-dvs.png)

The pawn is back to normal. Strange, but okay. It might only work within Obsidian, but it works.

# Outlining the business logic

Before diving into the actual business logic, let's briefly revisit the plugin itself. We know the HTML structure of the board, so we already know how to "insert" pieces into it: by simply adding the piece's text into the `<div>` cells. Something like this:

```javascript
async onload() {
	this.registerMarkdownCodeBlockProcessor('chess', (source, el, ctx) => {
		// Parse code
		const data = new BoardData(source)

		// Render chess board
		el.innerHTML = boardHtml

		// Fill chess board with pieces
		for (const [addr, piece] of Object.entries(data.addresses)) {
			const cell = el.querySelector('[id=' + addr + ']')
			if (cell) {
				cell.innerText = piece
			}
		}
	})
}
```

Look, we've already planned for the mythical `BoardData`, which doesn't exist yet, but we know that it should have:

- A constructor that takes the source HTML as an argument
- A field `addresses` — a dictionary like `{address; ASCII-figure}`

Now we just need to implement `BoardData`, and the plugin should work.

# Parsing and displaying FEN

The requirements for the parsing class have already been outlined in the previous section: our ultimate goal is to get the `addresses` field as a dictionary of piece addresses. Let's implement it:

```javascript
class BoardData {
    // map of {address piece} like {'a4': '♞'}
    addresses = {}

    constructor(source) {
        const lines = source.split('\n')
        const line = lines?.[0]
        this.#parseFen(line)
    }

    #parseFen(fen) {
        const rowLines = fen.split('/')
    
        let row = 8
        let col = 1
    
        this.addresses = {}
    
        for (const rowLine of rowLines) {
            col = 1
            for (const ch of rowLine) {
                if (isLetter(ch)) {
                    let piece = ''
    
                    if (ch == 'p') piece = '♟'
                    else if (ch == 'r') piece = '♜'
                    else if (ch == 'n') piece = '♞'
                    else if (ch == 'b') piece = '♝'
                    else if (ch == 'q') piece = '♛'
                    else if (ch == 'k') piece = '♚'
                    else if (ch == 'P') piece = '♙'
                    else if (ch == 'R') piece = '♖'
                    else if (ch == 'N') piece = '♘'
                    else if (ch == 'B') piece = '♗'
                    else if (ch == 'Q') piece = '♕'
                    else if (ch == 'K') piece = '♔'
    
                    this.addresses[getAddress(row, col)] = piece
    
                    col += 1
                } else {
                    col += parseInt(ch, 10)
                }
            }
            row -= 1
        }
    }
}
```

This class uses a pinch of helper functions:

```javascript
function isLetter(c) {
    return c.toLowerCase() != c.toUpperCase()
}

function rowToString(r) {
    return r.toString()
}

function colToString(c) {
    return String.fromCharCode('a'.charCodeAt() + c - 1)
}

function getAddress(r, c) {
    return colToString(c) + rowToString(r)
}
```

Now the plugin should render the chess positions according to the FEN description. Let's pull out our old template:

````
# Two rooks mate

```chess
8/8/4k3/R7/7R/8/8/6K1
```

```chess
8/4k3/7R/R7/8/8/8/6K1
```
````

The note takes the following appearance:

![](https://habrastorage.org/webt/vf/r5/zx/vfr5zxxkdeluesned0chrhqo270.png)

Hooray — we've achieved a working chessboard with pieces, congratulations to us!

# Highlighting Cells

We have the basic board display, but one crucial feature for chess notations is missing — the ability to highlight cells with colors, so you can express ideas and the flow of events on the board more clearly. Here's how it is implemented on [chess.com](https://chatgpt.com/c/chess.com):

![](https://habrastorage.org/webt/i5/ox/-m/i5ox-m2kj6mc6nmunloz1p_dpiq.png)

I would like to have green, red, and blue colors in my arsenal. There is also a requirement that the colors should be applied to the cell with some transparency, so that the white and black cells are still distinguishable even when highlighted. A "vignette" effect would also work.

We will implement cell highlighting by programmatically adding one of three special classes to the highlighted cell: `.green-highlight`, `.red-highlight`, `.blue-highlight`:

```css
.red-hihglight {
    box-shadow: 0 0 calc(var(--cell-size)*2) rgba(255, 0, 0, 0.75) inset;
}

.blue-hihglight {
    box-shadow: 0 0 calc(var(--cell-size)*2) rgba(0, 0, 255, 0.4) inset;
}

.green-hihglight {
    box-shadow: 0 0 calc(var(--cell-size)*2) rgba(0, 255, 0, 0.5) inset;
}
```

As you can see, the class includes a `box-shadow` with some strange calculations. This is the result of my experiments with applying a "vignette" effect to the cell using different colors. In the end, it wasn't exactly a vignette, but the result satisfied me — you'll see soon.

First, we need to figure out how to describe information about highlighted cells in an Obsidian note. I came up with the same scheme used by all the chess plugins I know:

````
```chess
fen: rnbqkbnr/pp2pppp/2p5/3p4/3PP3/8/PPP2PPP/RNBQKBNR
green: d7 d5
red: e4
```
````

This means that the parser for the `BoardData` class will become more complex. It will also gain additional fields:

```javascript
class BoardData {
	...
	
    // arrays of [address] like [e2, e4]
    reds = []
    greens = []
    blues = []

    constructor(source) {
        const lines = source.split('\n').map(line => line.trim())

        for (const line of lines) {
            if (line.startsWith('fen:')) {
                const fen = removePrefix(line, 'fen:').trim()
                this.#parseFen(fen)
            } else if (line.startsWith('red:')) {
                const redLine = removePrefix(line, 'red:').trim()
                this.reds = redLine.split(' ')
            } else if (line.startsWith('green:')) {
                const greenLine = removePrefix(line, 'green:').trim()
                this.greens = greenLine.split(' ')
            } else if (line.startsWith('blue:')) {
                const blueLine = removePrefix(line, 'blue:').trim()
                this.blues = blueLine.split(' ')
            } else {
                if (line.contains(':')) {
                    continue
                }
                this.#parseFen(line)
            }
        }
    }
	...
}
```

We will update the plugin to use the newly parsed data:

```javascript
class ChessLightweightPlugin extends obsidian.Plugin {
    async onload() {
        this.registerMarkdownCodeBlockProcessor('chess', (source, el, ctx) => {
            // Parse code
            const data = new BoardData(source)

			...
			
            for (const addr of data.reds) {
                el.querySelector('[id=' + addr + ']').classList.add('red-hihglight')
            }

            for (const addr of data.greens) {
                el.querySelector('[id=' + addr + ']').classList.add('green-hihglight')
            }

            for (const addr of data.blues) {
                el.querySelector('[id=' + addr + ']').classList.add('blue-hihglight')
            }
        })
    }
}
```

Now everything is ready. The boards in the notes can show more information about what's happening:

![](https://habrastorage.org/webt/on/s_/to/ons_toopqci2c1y2kjhwxmaylbw.png)

I don't know about you, but I'm happy with the result. The only thing missing for complete satisfaction is...

# ~~Coup~~ Reversal of the board

The previous image describes the Caro-Kann opening for Black. It's much more convenient to observe it from Black's side. I want to:

````
```chess
...
flipBoard: true
```
````

How to parse this field, I won’t bother showing, it's a trivial task. The slightly more complex task is—how do we actually flip the board? Use `transform`? Programmatically rewrite the cell addresses? Here, as usual, a pinch of hacky code comes into play, which has never hurt anyone:

```javascript
const whitesBoardHtml =
`<div class="board">
    <div class="row" id="row8">
        <div class="square white" id="a8"></div>
        <div class="square black" id="b8"></div>
        <div class="square white" id="c8"></div>
        <div class="square black" id="d8"></div>
        <div class="square white" id="e8"></div>
        <div class="square black" id="f8"></div>
        <div class="square white" id="g8"></div>
        <div class="square black" id="h8"></div>
    </div>
...
    <div class="row" id="row1">
        <div class="square black" id="a1"></div>
        <div class="square white" id="b1"></div>
        <div class="square black" id="c1"></div>
        <div class="square white" id="d1"></div>
        <div class="square black" id="e1"></div>
        <div class="square white" id="f1"></div>
        <div class="square black" id="g1"></div>
        <div class="square white" id="h1"></div>
    </div>
</div>`

const blacksBoardHtml =
`<div class="board">
    <div class="row" id="row1">
        <div class="square white" id="h1"></div>
        <div class="square black" id="g1"></div>
        <div class="square white" id="f1"></div>
        <div class="square black" id="e1"></div>
        <div class="square white" id="d1"></div>
        <div class="square black" id="c1"></div>
        <div class="square white" id="b1"></div>
        <div class="square black" id="a1"></div>
    </div>
...
    <div class="row" id="row8">
        <div class="square black" id="h8"></div>
        <div class="square white" id="g8"></div>
        <div class="square black" id="f8"></div>
        <div class="square white" id="e8"></div>
        <div class="square black" id="d8"></div>
        <div class="square white" id="c8"></div>
        <div class="square black" id="b8"></div>
        <div class="square white" id="a8"></div>
    </div>
</div>`
```

No, what's wrong with that? Just eighty lines of shame, and here you are already writing in the plugin:

```javascript
async onload() {
	this.registerMarkdownCodeBlockProcessor('chess', (source, el, ctx) => {
		// Parse code
        const data = new BoardData(source)
        
		...

		// Render chess board
		el.innerHTML = data.flipBoard ? blacksBoardHtml : whitesBoardHtml

		...
	})
}
```

And now you're comfortably sitting in the black side's seat:

![](https://habrastorage.org/webt/wx/cp/ug/wxcpugrv9cc_nyzm4e2pff3ru9i.png)

# Is that it?

Yes, it is. :)

Could we make the plugin even better? Absolutely! Right now, I have a kanban board with the following TODO list for this plugin:

![](https://habrastorage.org/webt/jy/xz/jp/jyxzjpj9wwf5s1ob2oihlgresms.png)

Someday I’ll get around to tackling all these tasks, but for now, I can use the plugin as it is, and you’ve already grasped the one key idea I wanted to convey:

> Just drop the styles.css into the plugin folder!

Yes, technically, everything else in this article is more about layout, business logic, and a pinch of the wow-effect, where your note transforms from plain text into a mini-webpage. So consider this my little con.

---

This concludes our journey with creating plugins for Obsidian. I wish you success in writing your own Obsidian plugins, as now you know that it’s not difficult at all, but quite fun, and most importantly — can be really useful for your own everyday note-taking operations.

As promised, here’s the [GitHub link](https://github.com/AskePit/aske-obsidian-plugins) if anyone wants to explore or use the plugins we wrote here.

---
<small>© Nikolai Shalakin. Translated by the author.</small>