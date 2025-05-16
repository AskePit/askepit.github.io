---
tags:
  - article
title: Making bots play cards endlessly, part I
url-title: making_bots_play_cards_endlessly_1
description: So there I was, doing what I love—messing around with writing mini-games that no one but me would ever see. This time, I was tinkering with a card game, a knockoff of Inscryption. Well, more like a pale imitation with vague goals and even vaguer prospects.
keywords:
  - python
  - gamedev
  - cards
image: https://habrastorage.org/r/w1560/getpro/habr/upload_files/685/293/863/6852938638cfdcc0750b81661f913bdb.png
---
# The Essence of the Problem

So there I was, doing what I love—messing around with writing mini-games that no one but me would ever see. This time, I was tinkering with a card game, a knockoff of [Inscryption](https://store.steampowered.com/app/1092790/Inscryption/). Well, more like a pale imitation with vague goals and even vaguer prospects. But one thing was clear: the core mechanic of the game was card-based combat, and it needed to be engaging enough to suck the player in for hours.

When I first started this whole thing, designing the rules of a card game seemed ridiculously simple—throw together a dozen or two weird and wacky cards, set up a playing field with card slots, and come up with some straightforward combat rules. What could possibly go wrong?

> **Spoiler Alert**  
> Let’s all keep count of how many times the word _unbalanced_ appears in this article.

Once I actually sat down to implement it using the first approach that came to mind, I was immediately disappointed—I ended up with an _unbalanced_, boring mess. So, I scrapped it and tried again using a different approach, only to make it even worse. Classic case of "it'll be fine" turning into "why did I think this would be fine?"

Before we go any further, let’s clarify what I was aiming for. Inscryption’s card game is _unbalanced_ by design. All things being equal, the player has an inherent advantage. The game compensates for this _imbalance_ through starting conditions and differences in player vs. opponent card pools. But I knew that if I started off in this _unbalanced_ chaos, I’d never be able to properly control the evolution of the game. My plan was to first establish a fair, equal, sweaty, skill-based experience under symmetrical conditions. Only then, once I had this as a benchmark, would I tweak and modify things—stacking the odds either for or against the player as needed. Naturally, I completely botched this first step by trying to brute-force my way through.

In the first version of the game, I figured that if both players had identical decks and their cards attacked each other simultaneously—each card hitting the one directly opposite—then it would result in a fair, intense showdown. Instead, I got a situation where, on average, all the cards annihilated each other, leaving the board perpetually empty. Riveting gameplay, right?

Then I thought, okay, if in Inscryption the player moves first and then the opponent follows, I could just do the same—if I’m copying, might as well go all in. But this led to another problem: whoever went first had a massive advantage, making the game _unbalanced_ again. Funny enough, a similar first-move advantage exists in chess, but there it’s subtle and gets evened out over many moves. Here, with just four or five miserable card slots and a handful of cards, that advantage was painfully obvious.

# The Idea

I was feeling pretty down because I had no clue how to turn my _unbalanced_ mess of a game into something remotely enjoyable. Randomly tweaking rules, blindly playtesting, and endlessly slogging through iteration after iteration? That sounded soul-crushingly boring.

And then it hit me—why suffer through playing my own boring game when I could make a bot do it for me? Just throw in two bots, force them to duke it out in hundreds of game variations until they drop, and let them figure out (on my behalf, no less) the optimal set of rules.

A fascinating and incredibly tempting idea. It’s always nice when the work does itself. The only catch, of course, was that in order for the work to do itself, I first had to put in a ridiculous amount of effort automating the very process that was supposed to relieve me of said effort. But hey, minor details. Once you're hooked on an idea, no amount of technicalities can scare you off.

# Formalizing the Task

Before I could start writing any code, I had to go through a rather annoying stage. You see, all this _"let’s compare game results with different rules and decide which one is better"_ stuff sounds suspiciously like something out of a humanities textbook. But we’re not here for vague feelings—we need numbers, something tangible, real parameters and metrics. And, surprise surprise, we had none. Worse still, it wasn’t immediately obvious where to get them.

Let’s think this through: our bots play a thousand games using one set of rules, then another thousand games with slightly tweaked rules. What exactly are we measuring in the first thousand games? And in the second? And even if we do manage to measure _something_, how do we compare those results and decide which version is better? Yeah… not exactly shaping up to be an easy problem.

# Let’s Start Writing Something—Anything

As you’ve probably guessed, I already had some groundwork laid for the card game. There were visual assets, code, and an engine in which all of this existed as a prototype—a prototype that currently made my blood boil due to its _unbalanced_ nature.

So, naturally, we won’t be using any of that. We’re starting from scratch. In Python.

Why? Because this is a separate research task, and all those fancy engine features—assets, animations, visual effects—would just get in the way. What we need is a crude, ugly script running in a barebones console, tirelessly crunching numbers like a loyal workhorse. Then, armed with our beautifully fine-tuned results, we can return to our nice, cozy engine and implement the card game’s core mechanics _once and for all_ (spoiler: not really).

# Let’s Set Some Ground Rules

I have a pretty tough task ahead: explaining everything I did, walking you through all the problems and solutions, without drowning in excessive details. There’s a lot of code—it’s brilliant, of course—but dumping it all on you would be pointless.

So, I’ll carefully break things down step by step, sprinkling in bits of code where necessary. Keep in mind, though, that I’m _not_ here to explain the exact rules and mechanics of my game—because in the context of this discussion, that’s not the important part. What really matters is how to achieve proper game balance. And that’s exactly where we’ll focus our attention.

# Writing the Game

Before the bots can start playing, we need to define the game rules.

Let’s outline the key requirements so we can structure everything properly:

- Some rules will be _fixed_. We won’t touch them, and we’ll justify this however we see fit—maybe they’re dictated by the lore, maybe they _capture the spirit_ of our game, maybe we just like them, or maybe they’re our spouse’s/kid’s/cat’s favorite.
- Some rules _should_ be tweakable. In other words, we want multiple _variations_ of the game. I decided to go with 2-3 versions, naming them Alpha, Beta, Gamma, etc.
- If the game has multiple versions, then the bots must also have versions: Alpha-bot, Beta-bot, Gamma-bot, etc. Each bot is trained to play a specific variation of the game. _But_, let’s make things more interesting: each bot type should have different intelligence levels. So, for example, we’ll have AlphaIdiot, AlphaNormie, and AlphaStronk. This allows us to test how much the bot’s intelligence level influences success in the game—and from those observations, we might gain insights into the game’s balance and fairness.
- The whole reason we’re doing this: game parameters. These are what we want to optimize automatically. We’re hoping that our bots will figure out the perfect balance for each game variation, making them all fair (at least from our _highly subjective_ perspective). In my case, the key parameters include: the number of card slots on the board, deck size, deck composition, starting hand size, initial matchsticks for the player, and the number of matchsticks in the shared pool.

Given all of this, our basic game class structure should look something like this:

```python
class GameBase:
    black_player: PlayerBase
    white_player: PlayerBase
    
    table: Table

    ...

    # methods
```

Let’s break this down:

- The name `GameBase` hints that this is the base version of the game. Variations like `AlphaGame`, `BetaGame`, and `GammaGame` will inherit from it. This class will contain methods for the _fixed_ rules.
- Similarly, `PlayerBase` is the parent class for our `GammaIdiot`, `AlphaNormie`, `BetaStronk`, etc. Each subclass will implement its own AI behavior. For example, the `make_move` method of the Idiot bot might just throw a random card onto a random slot. Meanwhile, the Stronk bot will analyze the board, assess threats, and make a calculated move—or even pass if that’s the best option.
- The `table` object stores all game-related data: slots, decks, matchsticks, etc. But for now, we’re not too concerned about that.

> If you’ve been itching to practice writing an [abstract factory](https://en.wikipedia.org/wiki/Abstract_factory_pattern), now’s your chance! Creating a game instance with _compatible_ bot players of the appropriate intelligence level is a perfect use case. I’ll leave that as a challenge for those who want to dive deeper.

## Game Code

Each game variation—`AlphaGame`, `BetaGame`, `GammaGame`, etc.—follows the same development pattern:

1. Inherit from `GameBase`.
2. Implement the game’s state machine.

A state machine makes writing game rules easy and structured. Let’s take `AlphaGame` as an example. First, I describe the rules and states in plain English:

```
## Start conditions

- 2 cards in a hand  
- 10 cards in a deck  
- 5 matches  
- unlimited matches bank  
- 5 slots  

## Game states  

- WHITE_RESOURCE_TAKE. Options:  
    - Draw a card from the deck  
    - Take a match from the bank  
    - Do nothing and skip  
- WHITE_MOVE. Options:  
    - Place a new card on the board by paying matches  
    - Do nothing and skip  
- BLACK_RESOURCE_TAKE. Mirrors WHITE_RESOURCE_TAKE  
- BLACK_MOVE. Mirrors WHITE_MOVE  
- WHITE_STRIKE. Sequence:  
    - Choose attacker card and target card  
    - Attack  
    - Counter-attack if target survives  
- BLACK_STRIKE. Mirrors WHITE_STRIKE  
```

With this plan in hand, I can now go full zombie coder mode and just translate the above into Python.

### Defining States

```python
class State(Enum):
    WHITE_RESOURCE_TAKE = 0
    WHITE_MOVE = 1
    BLACK_RESOURCE_TAKE = 2
    BLACK_MOVE = 3
    WHITE_STRIKE = 4
    BLACK_STRIKE = 5
    GAME_OVER = 6
```

This still looks like plain English, just in a more structured form!

### Game Class

The game itself is just a state machine. Without unnecessary noise, it looks like this:

```python
class AlphaGame(GameBase):
    state: State

    def launch(self):
        self.state = State.WHITE_RESOURCE_TAKE
        super().launch()

    def update(self) -> bool:  # Returns False when the game ends
        match self.state:
            case State.WHITE_RESOURCE_TAKE:
                self.white_resource_take()
            case State.WHITE_MOVE:
                self.white_move()
            case State.BLACK_RESOURCE_TAKE:
                self.black_resource_take()
            case State.BLACK_MOVE:
                self.black_move()
            case State.WHITE_STRIKE:
                self.white_strike()
            case State.BLACK_STRIKE:
                self.black_strike()
            case State.GAME_OVER:
                return False
            
        return True
```

### Running the State Machine

In the base class, we have a simple loop to run the game:

```python
class GameBase:
    def launch(self):
        while self.update():
            pass
```

If the loop exits, the game is over. That’s it! Now all that’s left is to implement `self.white_resource_take()`, `self.white_move()`, `self.black_strike()`, etc. These methods contain the actual gameplay logic—bot moves and state transitions.

### Example: `white_strike()`

```python
def white_strike(self):
    (attacker_slot, victim_slot) = self.white_player.strike()

    self._cards_combat(attacker_slot, victim_slot, Side.WHITE)
    self.change_state(State.BLACK_STRIKE)
```

Here, we see three main actions:

- The bot’s logic is called via `self.white_player.strike()`.
- The game processes the attack in `_cards_combat()`.
- The game state transitions to `State.BLACK_STRIKE`.

### Example: `strike()` for an Idiot Bot

Since we have different bot types, `self.white_player.strike()` will behave differently depending on the bot. Here’s how the dumbest bot, `AlphaIdiotPlayer`, implements it:

```python
def strike(self) -> tuple[int, int]:  # (attacker_slot, victim_slot)
    attacker_slot = self.table.slots.get_random_slot(self.side, SlotStatus.OCCUPIED)
    victim_slot = self.table.slots.get_random_slot(self.side.get_opposite(), SlotStatus.OCCUPIED)

    return (attacker_slot, victim_slot)
```

This bot has full access to the game table and can make decisions based on the data. In this case, the _Idiot_ just picks a random occupied slot for both the attacker and the target—because, well, he’s an Idiot.

## Metrics

Now, metrics take the stage for the first time. These will help us quantify the quality of a game, compare different variations, and determine which one is _more better_™.

Defining what makes a good game… turns out to be tricky. Translating it into numbers is even harder. I started with verbal descriptions and eventually boiled it down to these key points for my game:

- **Fairness**: Over a long run, two equally skilled players should have a 50/50 chance of winning.
- **Game length**: The game shouldn't be too short or too long—otherwise, it gets boring. I estimated that an engaging game should last around 10 rounds on average.
- **No deadlocks**: If games often result in a stalemate or become unplayable, that's _bad_. We want to avoid that.

With these ideas in mind, I structured my metrics into three parameters:

```python
class GameOverResult(Enum):
    NONE = 0
    WHITE_WINS = 1
    BLACK_WINS = 2
    DRAW = 3
    INFINITY = 4

@dataclass
class Metrics:
    rounds: int = 0
    result: GameOverResult = GameOverResult.NONE
    exhausted: bool = False
```

At the end of a game, we get a `Metrics` object. The core idea is:

1. Define _ideal_ metrics for a perfectly balanced game.
2. Playtest a specific game variation and gather its actual metrics.
3. Compare them. This allows us to:
    - Measure how close a game is to our _ideal_.
    - Compare different game variations against each other.

### Collecting Metrics

Here’s a quick reminder of how a game runs:

```python
class GameBase:
    def launch(self):
        while self.update():
            pass
```

All we need to do is call `game.launch()`, and the game plays itself. Inserting metric-tracking logic at the right places is straightforward.

I won’t bore you with counting rounds or recording game results—that's trivial. What matters is that each completed game produces a `Metrics` object. From here, we can start analyzing and tweaking our game to find the best possible balance.

## Playing the Game at Scale

To properly measure a game's balance under specific rules and parameters, I need to force bots to play the same game over and over. Running, say, **1,000 identical games** should provide a stable statistical picture.

At the end of those 1,000 games, I'll have 1,000 `Metrics` objects. The problem? I wasn't initially sure what to do with them.

### Organizing the Data

At first, I decided to just store these objects in a simple [Structure of Arrays (SoA)](https://en.wikipedia.org/wiki/Parallel_array) format:

```python
@dataclass
class BunchMetrics:
    rounds: list[int] = field(default_factory=list)
    results: list[GameOverResult] = field(default_factory=list)
    exhausted: list[bool] = field(default_factory=list)
    
    def add_metrics(self, metric: Metrics):
        self.rounds.append(metric.rounds)
        self.results.append(metric.result)
        self.exhausted.append(metric.exhausted)
```

### Automating Multiple Runs

The `GameRepeater` class is responsible for running multiple games and collecting metrics:

```python
class GameRepeater:
    game: GameBase
    bunch_metrics: BunchMetrics
    execute_count: int

    def launch(self):
        for _ in range(self.execute_count):
            self.game.launch()
            self.bunch_metrics.add_metrics(self.game.get_metrics())
            self.game.reset()
```

This class **repeatedly plays the same game** (with the same bots inside) and **stores the results**.

### Visualizing the Process

This can be represented with a simple diagram:

![](https://habrastorage.org/r/w1560/webt/ff/uz/rm/ffuzrmjbzpzwdlxrgosq53vc94y.png)

You'll see later why this diagram, simple as it is, actually matters.

## Averaging Metrics

Now that we've gathered a bunch of data, the next step is to extract something unified that we can compare against the ideal metrics. The task turned out to be more complex than I initially thought, so let's dive into how we can do this.

> **Disclaimer**: This chapter might turn into an ode to my lack of knowledge in libraries like Pandas and NumPy. But that’s not certain — feel free to let me know in the comments how real grown-ups solve this problem.

So, we have the `BunchMetrics`. How can we turn it into a single `Metrics`?

### The Obvious Thought: Averaging

The first thing that comes to mind is to just average everything and get one `Metrics` object. However, this approach hits a roadblock quickly. Let's revisit the metrics:

```python
@dataclass
class Metrics:
    rounds: int = 0
    result: GameOverResult = GameOverResult.NONE
    exhausted: bool = False
```

While we can easily average the number of rounds, it’s tricky to average a `bool` value. As for `GameOverResult`, there’s a problem: how do you average an `enum`? Moreover, even in the simplest case — the number of rounds — if we just average everything, we lose significant information. Consider:

- What if we look at the median instead of the mean?
- What if the median is significantly different from the mean? Could that provide useful insights?
- What if two games out of a thousand lasted over 200 rounds?
- What if ten games out of a thousand were completed in one round?

The conclusions from such situations are secondary, but the key point is: I want to analyze all of this data together. That’s why I came up with the following structure:

```python
@dataclass
class DataRange:
    min: float = 0.0
    max: float = 0.0
    average: float = 0.0
    median: float = 0.0
```

### Moving in the Right Direction

- `BunchMetrics` can easily be transformed into `DataRange` for each metric.
- `DataRange` gives us plenty of room to analyze the data.

However, there’s one problem: the `result` field doesn’t fit into the `DataRange` concept:

```python
results: list[GameOverResult] = field(default_factory=list[GameOverResult])
```

### Problem with Averaging `Enum` Types

When creating ideal metrics, I want to specify something like:

> "My ideal game result distribution is as follows: White wins 49.75% of the time, Black wins 49.75%, Draws occur 0.5%, and other outcomes are 0%."

A `DataRange` doesn’t fit this well, so I came up with something else. It was lucky that while explaining the idea, it mapped perfectly to code, leading me to the following solution:

```python
@dataclass
class ProbabilityTable:
    table: dict[int, float] = field(default_factory=dict[int, float])  # key -> probability proportion
    
    def inc_value(self, key: int, value: float):
        if key not in self.table:
            self.table[key] = 0.0
        self.table[key] += value

    def normalize(self):
        total = 0.0
        for val in self.table.values():
            total += val
        
        for key in self.table:
            self.table[key] /= total
        self.normalized = True

    def get_probability(self, key: int) -> float:
        if not self.normalized:
            self.normalize()
        
        return self.table[key]
```

This `ProbabilityTable` class stores normalized probabilities for each possible game outcome, which fits perfectly with what I needed.

### Introducing `AveragedMetrics`

Now we can introduce our "uber" data structure, the `AveragedMetrics` class:

```python
@dataclass
class AveragedMetrics:
    rounds: DataRange = field(default_factory=DataRange)
    result: ProbabilityTable = field(default_factory=ProbabilityTable)  # [GameOverResult -> float]
    exhausted: DataRange = field(default_factory=DataRange)
```

### Adding a Method to `BunchMetrics`

The `BunchMetrics` class now has a method that produces averaged data:

```python
@dataclass
class BunchMetrics:
    ...
    def get_average(self) -> 'AveragedMetrics':
        res = AveragedMetrics()

        res.rounds = DataRange.MakeFromList(self.rounds)
        res.result = ProbabilityTable.MakeFromList(self.results)
        res.exhausted = DataRange.MakeFromList(self.exhausted)

        return res
```

The `MakeFromList` methods for `DataRange` and `ProbabilityTable` are not particularly complex, so I’ll skip their implementation here.

### Defining Ideal Metrics

After all these data transformations, I came to another important conclusion: ideal metrics should also be represented as `AveragedMetrics`. For example:

```python
ideal_metrics = AveragedMetrics(
    rounds=DataRange(min=5, max=15, average=10, median=10),
    result=ProbabilityTable(
        table={
            GameOverResult.BLACK_WINS: 0.4975,
            GameOverResult.WHITE_WINS: 0.4975,
            GameOverResult.DRAW: 0.005,
        }
    ),
    exhausted=DataRange(min=0, max=0, average=0, median=0),
)
```

### Benefits of This Approach

- **Representation of game outcomes**: The probability table is the best way to express the desired outcome distribution. It’s simply impossible to do this with the `Metrics` class.
- **Granular control**: You can now specify not just ideal averages or medians, but also desired minimums and maximums, allowing for more detailed control and analysis.

## What’s Next?

What comes next? Well, you’ll find out in the next article! Yes, that’s right. Here’s what you can expect in the next installment:

- **We’ll explore the combinatorial search of game rules and extract metrics.**
- **We’ll learn how to compare two `AveragedMetrics` objects.** It sounds simple at first, but when you really think about it, it’s actually not. Why? Well, think about how you would compare two _almost_ identical `AveragedMetrics` and how you would express the result of such a comparison.
- **Based on the metrics, we’ll identify the game with ideal parameters.**
- **We’ll build an infinite miner for the best game rules, evolving from the best ones through code generation and modification.** (Yes, shock content ahead.)
- **Finally, we’ll create a game that won’t be _imbalanced_ anymore.**

Stay tuned for all that exciting stuff coming soon!

---
<small>© Nikolai Shalakin. Translated by the author.</small>