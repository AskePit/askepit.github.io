---
tags:
  - article
title: Making bots play cards endlessly, part II
url-title: making_bots_play_cards_endlessly_2
description: We continue forcing bots to play cards endlessly in the desperate hope of shaking out the optimal settings for our card game. The first part of this epic saga is [here](https://askepit.github.io/blog/making_bots_play_cards_endlessly_1/). Highly recommended reading — otherwise, keeping up with the context will be a pain.
keywords:
  - python
  - gamedev
  - cards
image: https://habrastorage.org/r/w1560/getpro/habr/upload_files/685/293/863/6852938638cfdcc0750b81661f913bdb.png
---

We continue forcing bots to play cards endlessly in the desperate hope of shaking out the optimal settings for our card game. The first part of this epic saga is [here](https://askepit.github.io/blog/making_bots_play_cards_endlessly_1/). Highly recommended reading — otherwise, keeping up with the context will be a pain.

So, in the previous episodes, we:

- Experienced pain and _imbalance_
- Wrote the card game logic in Python
- Introduced bots into the game and made them battle it out in thousands upon thousands of matches
- Described the metrics we collect from the game and presented them in not one, not two, but three glorious forms: `Metrics`, `BunchMetrics`, `AveragedMetrics`
- Swore to ourselves that we’d see this through and finally extract those elusive optimal game settings

# Varying the Game

By the end of the first article, we had a `GameRepeater` that kept spinning up the same game over and over again — thousands of times — so that the metrics collected from each match would be nicely averaged out, free from any wild statistical outliers.

Now, with `GameRepeater` as our sturdy foundation, we can take things up a notch and start launching multiple `GameRepeater`s in sequence, each with different game parameters. After each run, we’ll have averaged metrics for each specific configuration — and we can compare how close those settings are to our _ideal metrics_, the ones we've oh-so-carefully imagined in our heads. The settings that end up closest to the ideal ones win. That’s the core idea.

Before diving into building all this joy, I had a few questions for myself:

- How exactly do I compare metrics? No, seriously — turns out our `AveragedMetrics`, as described in the previous article, aren’t exactly plug-and-play comparable without doing a bit of Googling for suitable comparison algorithms.
    
- I had already figured out which game parameters I want to iterate over to find their optimal values — that part was sorted from the get-go. But how do I actually iterate over them? Do I just brute-force my way through every possible combination? Even then, I’ll still need to limit the value ranges somehow, or this thing will spiral out of control.
    

So, I decided to put the first problem on the back burner and tackle the second one right away — since solving it would let us almost finish the main bot-herding algorithm once and for all.

Alright then, let’s start with the game settings themselves. To figure out how to iterate through and combine them, we first need to see what exactly they consist of:

```python
@dataclass
class GameSettings:
    white_player_class: type[PlayerBase]
    black_player_class: type[PlayerBase]
    slots_count: int
    initial_hand_cards: int
    initial_deck_cards: int
    initial_matches: int
    deck: list[Card] = None
```

This class is used like this: you create and populate a `GameSettings` object, then hand it over to `GameBase`, which applies its fields to itself — changing the number of matches, bot players, and the deck composition accordingly.

Now let’s talk about combining and brute-forcing these settings. The combinator itself (or rather, the data behind it) I envision like this:

```python
@dataclass
class GameSettingsCombinator:
    white_player_options: list[type[PlayerBase]]
    black_player_options: list[type[PlayerBase]]
    slots_count: range
    initial_hand_cards: range
    initial_deck_cards: range
    initial_matches: range
```

Some points worth noting:

- For numbers, the standard Python [`range`](https://docs.python.org/2/library/functions.html#range) works beautifully — it lets you define a minimum, maximum, and even the step size for what we want to iterate over
- Bot variants are simply described as a list of classes — nothing fancy there
- We’re skipping the `deck` setting for now, because that one’s a beast on its own — deck iteration is a complex, multi-layered ritual worthy of its own dedicated combinator (and article dessert)

A `GameSettingsCombinator` like this can be configured, for example, like so:

```python
settings_combinator = GameSettingsCombinator(
	white_player_options=[AiAlphaNormalPlayer],
	black_player_options=[AiAlphaNormalPlayer],
	slots_count=range(3, 6+1),
	initial_hand_cards=range(0, 10+1, 1),
	initial_deck_cards=range(10, 40+1, 5),
	initial_matches=range(0, 50+1, 5)
)
```

Here I’ve defined those very limits and step sizes for the settings — the ones I’m _more or less_ happy with.

Now for the juicy part: how would you write a method in `GameSettingsCombinator` that keeps giving birth to fresh variants, permutations, and combinations of all the settings above?

If someone just thought _"Well, obviously, that should be a [generator](https://wiki.python.org/moin/Generators)"_, then congrats — you and I are on the same wavelength.

But I suspect no one is truly prepared for what I’m about to show next:

```python
@dataclass
class GameSettingsCombinator:
    white_player_options: list[type[PlayerBase]]
    black_player_options: list[type[PlayerBase]]
    slots_count: range
    initial_hand_cards: range
    initial_deck_cards: range
    initial_matches: range

    # omg
    def __iter__(self) -> Generator[GameSettings, None, None]:
        for white_player_class in self.white_player_options:
            for black_player_class in self.black_player_options:
                for slots in self.slots_count:
                    for hand_cards in self.initial_hand_cards:
                        for deck_cards in self.initial_deck_cards:
                            for matches in self.initial_matches:
                                yield GameSettings(
                                    white_player_class,
                                    black_player_class,
                                    slots,
                                    hand_cards,
                                    deck_cards,
                                    matches,
                                    None
                                )
    
    def get_combinations_count(self) -> int:
        return len(self.white_player_options) \
            * len(self.black_player_options) \
            * len(self.slots_count) \
            * len(self.initial_hand_cards) \
            * len(self.initial_deck_cards) \
            * len(self.initial_matches)
```

Oof. Don’t ask me about the time complexity of this “algorithm” — it’s a generator with lazy evaluation!

...Though who am I kidding — that’s not going to save the program one bit, since it’ll still grind through _every_ single combination all the way to the bitter end.

So, how are we going to squeeze out those combinations? With the `SettingsTester` class — which, let’s be honest, is what this entire journey has been leading up to:

```python
class SettingsTester:
    game_class: type[GameBase]
    settings_combinator: GameSettingsCombinator
    ideal_metrics: AveragedMetrics

    def launch(self):
        for settings in self.settings_combinator:
            for deck in self.deck_combinator:
                executer = GameRepeater(self.game_class, settings, 1000)
		        executer.launch()
		        averaged = executer.bunch_metrics.get_average()
		
		        # а че дальше-то?
```
Here I've shown `SettingsTester` in a _very_ simplified form, because the original version does a whole bunch of extra bells and whistles — things like timing the runs, showing a progress bar in the console, and so on.

I mean, you’ve seen the generator — you _get_ how long that kind of code can run, right? I don’t remember the exact numbers, but I always just let the script churn overnight, because it could easily take hours.

The diagram of game executions gains new layers of complexity:

![](https://habrastorage.org/webt/64/mn/xx/64mnxx19be33iwqnkzrxodul9qo.png)

However, as you can probably tell, `SettingsTester` is clearly incomplete. Right now, we know how to _extract_ metrics — but we have no idea how to actually _pick the best one_.

And without that, well... our script — and everything we’ve done so far — kind of loses its point, doesn’t it?

# How to Compare Metrics

Once upon a time, I asked ChatGPT how to properly compare the _similarity_ of two numbers when they can lie anywhere within an arbitrary range. What I wanted was a neat little number between 0.0 and 1.0 — where 0.0 means “these numbers don’t even _know_ each other,” and 1.0 means “these are the same soul in different bodies.”

The soulless machine convinced me that there's already an algorithm for this, named after a scientist I'd never heard of. The algorithm actually works in reverse — it calculates the _difference_ between two values on a 0.0 to 1.0 scale, which you can easily invert by subtracting the result from one. ChatGPT handed me the formula like this:

$$
difference(a,b) = \frac{∣a−b∣}{max(a,b)}
$$

I had no complaints — I ran a couple of very scientific (read: minimal and lazy) test cases, and the results _seemed_ convincing. Let’s double-check together whether this approach still holds up:

We’ll try to get a “difference coefficient” for 10 vs. 10000. These are obviously very different. Definitely _more_ different than, say, 10 and 100 — or 10 and 11. And 10 vs. 10 should be zero difference, of course. Let's do the math:


$$
difference(10,10000) = \frac{9990}{10000} = 0.999
$$

$$
difference(10,100) = \frac{90}{100} = 0.9
$$

$$
difference(10,20) = \frac{10}{20} = 0.5
$$

$$
difference(10,11) = \frac{1}{11} = 0.091
$$

$$
difference(10,10) = \frac{0}{10} = 0
$$

Looks decent enough: very different numbers yield high differences, close ones yield low values — _nuff said_. Since the denominator is the larger of the two numbers, the normalization uses the “more extreme” value, which didn’t bother me. I mean, just look what happens if you normalize using the _smaller_ number:

$$
difference(10,10000) = \frac{9990}{10} = 999.0
$$

Yeah. That way lies madness.

So I just inverted the formula to get the similarity I originally wanted:

$$
similarity(a,b) = 1.0 - difference(a,b)
$$

and walked away happy.

But things got weird when I started writing this article — probably a year after that blessed ~~confession~~ chat session. I had, of course, completely forgotten the name of that scientist ChatGPT proudly dropped on me back then. I dug through my chat history to flex that name here for you — only to find I’d deleted the conversation. I tend to do periodic spring cleaning in my chat archive, which in this case came back to bite me.

I decided to go around the problem and simply fed my own code (which, ironically, was based on ChatGPT's own advice) back into the machine and asked, “Hey, what’s this algorithm called?”

The soulless machine shrugged and said, “Dunno. But it _kinda_ looks like a ~~general prosecutor~~ modified [Canberra distance](https://en.wikipedia.org/wiki/Canberra_distance#:~:text=The%20Canberra%20distance%20is%20a,of%20L%E2%82%81%20\(Manhattan\)%20distance.),” which does in fact look suspiciously like mine (yes, _mine_), but it’s still different:

$$
difference(a,b) = \frac{∣a−b∣}{|a| + |b|}
$$

This method is also perfectly valid — definitely not worse than the _max-based_ approach. It normalizes based on both values, which arguably makes more sense, but in practice doesn’t dramatically change the outcome:


$$
difference(10,10000) = \frac{9990}{10010} = 0.998
$$

$$
difference(10,100) = \frac{90}{110} = 0.818
$$

$$
difference(10,20) = \frac{10}{30} = 0.333
$$

$$
difference(10,11) = \frac{1}{21} = 0.048
$$

$$
difference(10,10) = \frac{0}{20} = 0
$$

Sure, you could say the numbers are “a bit off,” but from my not-so-mathematically-trained point of view, either formula is _good enough_ for our task.

What _isn’t_ good enough, though? ChatGPT’s memory. Keep track of what it says. Call it out. Laugh on it.

> Any mathematicians in the room? Sound off in the comments — what’s your take on these two formulas?

---

Alright — now, having this mathematical basis at hand, how do we compare metrics? Our metrics aren’t just numbers — they are something more complex. Let’s start with the `DataRange` class. Let me remind you what it looks like:

```python
@dataclass
class DataRange:
    min: float = 0.0
    max: float = 0.0
    average: float = 0.0
    median: float = 0.0
```

How shall we compute the _similarity_ of two `DataRange` objects? We need to apply a bit of heuristic magic to get the result we want. Here’s what I ended up with:

```python
class DataRange:
    ...
    def get_similarity_coeff(self, other: 'DataRange') -> float:
        def safe_max(one, another):
            max_val = max(one, another)
            if max_val == 0:
                max_val = 1
            return max_val
        
        def diff_coeff(one, another):
            return abs(one - another) / safe_max(one, another)

        def similarity_coeff(one, another):
            return 1.0 - diff_coeff(one, another)

        min_similarity = similarity_coeff(self.min, other.min)
        max_similarity = similarity_coeff(self.max, other.max)
        med_similarity = similarity_coeff(self.median, other.median)

        MEDIAN_WEIGHT = 0.7
        MIN_MAX_WEIGHT = (1.0 - MEDIAN_WEIGHT) / 2.0

        return MIN_MAX_WEIGHT * min_similarity + MIN_MAX_WEIGHT * max_similarity + MEDIAN_WEIGHT * med_similarity
```

What’s important here is that for my specific `DataRange` class, I decided it makes sense to lean heavily on the _median_ when computing similarity—without completely ignoring the min and max, which should also play a role in the outcome. But let’s be honest: if two `DataRange` objects \[10; 100\] and \[12; 80\] share the same median—say, 40—then those two ranges _have_ to be pretty close. After all, the range’s minimum and maximum are usually outliers—deviations from the mean or median. So, in this concrete case, I arbitrarily assigned a _70%_ weight to the median’s influence on similarity, and split the remaining influence between min and max at _15%_ each.

> As you might have noticed, I’m no mathematician, and my familiarity with statistics and data analysis is—if I’m honest—basically surface level. So if you want to tell me in the comments why my approach is just amateur daydreaming and how it _really_ should be calculated, we’ll all come out ahead.

---

Alright, we’ve got one more class we want to compare: `ProbabilityTable`:

```python
@dataclass
class ProbabilityTable:
    table: dict[int, float]
```
An example of the data stored in an object of this class (schematic):

```python
{
	GameOverResult.WHITE_WINS: 0.4,
	GameOverResult.BLACK_WINS: 0.6,
}

and

{
	GameOverResult.WHITE_WINS: 0.6,
	GameOverResult.BLACK_WINS: 0.3,
	GameOverResult.DRAW: 0.1,
}
```

Here, for comparing objects, we can apply a different kind of heuristic. The main ace up our sleeve is that the numbers in the dictionary are, by definition, already normalized to the \[0; 1\] range—so I figured we could compute their _difference_ simply as $difference(a,b) = |a-b|$. Then we convert that to _similarity_ using the inversion we already know: $similarity(a,b) = 1.0 - difference(a,b)$.

Finally, we take the arithmetic mean over the entire map—and voilà: the comparison is done.

```python
class ProbabilityTable:
...
    def get_similarity_coeff(self, other: 'ProbabilityTable') -> float:
        n = 0
        sum = 0.0

        for key, value in self.table.items():
            if key in other.table:
                sum += 1.0 - abs(value - other.table[key])
                n += 1
            
        return sum / n if n > 0 else 0
```

---

We’re approaching the final boss — the `AveragedMetrics` class. This is the ultimate target we need to be able to compare. Let’s recap what data the class holds:

```python
@dataclass
class AveragedMetrics:
    rounds: DataRange
    result: ProbabilityTable
    exausted: DataRange
```

We can see that we already know how to compare all three fields against each other, so all that remains is to somehow _average_ the three results—and voilà. We could take the simple route we used in `ProbabilityTable`—just compute the arithmetic mean—or we could go for the more elaborate approach, like in `DataRange`, and introduce custom weights. Since `AveragedMetrics` is pretty much _the_ class that drives our entire program, we’re leaning toward the flexibility of fine-tuning, and will implement custom weights for each of its fields:

```python
@dataclass
class AveragedMetrics:
    rounds: DataRange = field(default_factory=DataRange)
    result: ProbabilityTable = field(default_factory=ProbabilityTable) # [GameOverResult -> float]
    exausted: DataRange = field(default_factory=DataRange)

    _PROPS_COUNT = 3

    rounds_similarity_weight : float = 1.0 / float(_PROPS_COUNT)
    result_similarity_weight : float = 1.0 / float(_PROPS_COUNT)
    exausted_similarity_weight : float = 1.0 / float(_PROPS_COUNT)

    def set_weights(self, rounds_similarity_weight : float, result_similarity_weight : float, exausted_similarity_weight : float):
        sum = rounds_similarity_weight + result_similarity_weight + exausted_similarity_weight

        self.rounds_similarity_weight = rounds_similarity_weight / sum
        self.result_similarity_weight = result_similarity_weight / sum
        self.exausted_similarity_weight = exausted_similarity_weight / sum

    def get_similarity_coeff(self, other: 'AveragedMetrics') -> float:
        similar = (\
            self.rounds.get_similarity_coeff(other.rounds)     * self.rounds_similarity_weight + \
            self.result.get_similarity_coeff(other.result)     * self.result_similarity_weight + \
            self.exausted.get_similarity_coeff(other.exausted) * self.exausted_similarity_weight \
        )
        return similar
```

In the end, we got the best of both worlds: by default, the class computes similarity via the arithmetic mean (see `_PROPS_COUNT` and how it’s used). But if you wish, you can set arbitrary weights via the `AveragedMetrics.set_weights` method.

Congratulations to us — we can now compare `AveragedMetrics`, and therefore determine which game parameters are closest to our ideal metrics and which configurations lag far behind. This was the key barrier on our journey, and we’ve overcome it together.

# Farming the Deck

Remember the game-settings generator? Oh yes — now we need a second one, just like it, for the card deck. I spent a long time thinking about how to show you its full implementation, then realized that diving into all the details would bring little benefit or clarity.

In short: the deck contains strong, weak, and regular cards. They differ by the sum of their attack and health stats. The total deck size and the counts of weak/strong/regular cards are _fixed_ — that’s an invariant we don’t want to change for any gameplay, design, or artistic reasons. What _we_ want to vary are the individual attack/health stats for each card, of course within the constraints of its rank. There are a few more nuances, invariants, and heuristics that complicate generating card combinations, but they’re out of scope for this article since they don’t add meaningful value right now.

So let the deck combinator remain a black box for us, exposing only its main combinatorial method:

```python
class DeckCombinator:
	def __iter__(self) -> Generator[list[Card], None, None]:
		...
```

The key takeaway is that this deck combinator produces _no fewer_ combinations than the previous terrifying game-settings combinator. Which means our script is in for an even longer ride.

# Combinatorics Ready

Now our missing puzzle pieces are assembled, and we can plug them into the spot where we got stuck:

```python
class SettingsTester:
    game_class: type[GameBase]
    settings_combinator: GameSettingsCombinator
    ideal_metrics: AveragedMetrics

    def launch(self):
        for settings in self.settings_combinator:
            for deck in self.deck_combinator:
                executer = GameRepeater(self.game_class, settings, 1000)
		        executer.launch()
		        averaged = executer.bunch_metrics.get_average()
		
		        # а че дальше-то?
```

Now we’re in a position to answer the question “so what’s next?” and wrap up `SettingsTester`:
```python
def launch(self):
	for settings in self.settings_combinator:
		for deck in self.deck_combinator:
			executer = GameRepeater(self.game_class, settings, 1000)
			executer.launch()
			averaged = executer.bunch_metrics.get_average()
	
			similarity = self.ideal_metrics.get_similarity_coeff(averaged)
	
	        rate = SettingsRate(deepcopy(settings), averaged, similarity)
	        self.top_settings_list.apply(rate)
```

In other words, for each new settings combination we ran the bots through a thousand matches, collected the metrics, compared them to our _ideal metrics_, and computed a similarity score. That score—along with other useful info (for any post-analysis)—gets packed into a `SettingsRate` object and sent off into a special ranking list that keeps the top 10 best game configurations.

Once the script finishes its lengthy run, we end up with our top 10 game settings that deliver the experience closest to our imagined ideal. The only catch is not to mess up those ideal metrics!

Why keep a top 10 when we could just grab the single best result? Well, it might turn out that the top three are all roughly equal in terms of metrics, but we simply _prefer_ the settings that landed in second or third place for any arbitrary reason. Or maybe we want to understand the gap in performance between consecutive entries. Personally, I rarely picked just the number-one result—often there was a slightly lower scorer that was more _elegant_ by some other measure. And hey, that matters too.

So that’s it—we’ve achieved our goal. We can now compute the best settings. Time to wrap things up?

# Mining the Game

There’s no way we can wrap this up yet!

First off, randomness plays a huge role here, so there’s always a chance that the second or third run of the script will spit out different numbers with different results—and that’s perfectly fine.

What’s even more important is that our implementation actually has two _independently_ improvable stories happening in parallel: the overall game settings and the deck composition. They even live in separate generators. And for the most part, they don’t step on each other’s toes.

Pretty soon, after manually running the script in different modes, I realized we could squeeze even more out of this. Check it out:

1. First, run our script **with a fixed deck composition**, varying only the game settings.
2. We get some “best settings” result, which we save off somewhere.
3. Run the script again—this time **locking in those improved game settings** we just found, and instead **varying the deck composition**.
4. We get an improved deck composition, which we also save off.
5. Repeat from step 1, ad infinitum.

My hypothesis is that this way, we can “mine” game settings forever, continually improving them. Eventually, the script will simply hit the ceiling of our _ideal metric_ and start churning out roughly the same high-quality results, with only random noise-level variations.

Moreover, in subsequent runs of our `SettingsTester`, we can choose to either only admit results that are _strictly better_ than anything we’ve seen before into the top list—or kick back and let each script run start from scratch, hoping it will self-improve. At first glance, the former seems like the _only_ “correct” approach, but in practice it quickly plateaus, denying the combinator a chance to, let’s say, “evolve,” even if that comes at the cost of a temporary dip in performance.

One more nice bonus of this alternating approach is that we massively _reduce_ the runtime of a single script round, since we replace this:

```python
def launch(self):
    for settings in self.settings_combinator:
	    for deck in self.deck_combinator:
		    ...
```

to

```python
def launch(self):
	if mode == SETTINGS:
	    for settings in self.settings_combinator:
		    ...
	else:
	    for deck in self.deck_combinator:
		    ...
```

…dramatically reducing the combinatorial load per run, which used to make my script choke.

So atop our multi-layered cake, we add yet another entity: `SettingsMiner`:

![](https://habrastorage.org/webt/lt/bk/jg/ltbkjgxxu-_uztgalar_hfefboq.png)

You get the idea: a miner that endlessly runs a combinator, which runs the repeater _O(n^x)_ times, which runs the game 1,000 times per configuration. Sounds painfully slow—and it is, because “endlessly” is _really_ slow. A single round of `SettingsTester`, depending on the combinator settings, can take anywhere from tens of minutes to hours on a beefy PC. Pretty awesome, right?

In very schematic form, `SettingsMiner` looks like this:

```python
class SettingsMiner:
    def __init__(self):
	    self._read_settigs()
    
    def launch(self):
        while True:
            self._mine_round()
            self._flush_settings()
            self._switch_mode()
```

Noteworthy: every improvement that `SettingsMiner` uncovers I write to a file on the hard drive. This is necessary for a couple of reasons. First, I can stop and restart `SettingsMiner` at any time without losing any results. Second, I have a recorded, saved result that I can use elsewhere or even pull back into the game.

What’s even more fun is that I’m not just dumping the resulting game settings into some config file — nooo — I’m generating _Python code_ into a special file:

```python
from alpha_game_package.alpha_player import AiAlphaNormalPlayer
from core_types import Card, CardType
from game import GameSettings

auto_refined_cards_pool : dict[str, list[Card]] = {  # actual type is dict[type[GameBase], list[Card]]
	'AlphaGame': [
		Card(CardType.BEAST, 'rat', 1, 3, 1),
		Card(CardType.BEAST, 'wasp', 2, 2, 1),
        ...
		Card(CardType.MAGIC, 'black book', 4, 4, 3),
	],
}

auto_refined_game_settings : dict[str, GameSettings] = { # actual type is dict[type[GameBase], GameSettings]
	'AlphaGame': GameSettings(
		white_player_class  = AiAlphaNormalPlayer,
		black_player_class  = AiAlphaNormalPlayer,
		slots_count         = 5,
		initial_hand_cards  = 5,
		initial_deck_cards  = 20,
		initial_matches     = 5,
		deck                = auto_refined_cards_pool['AlphaGame'],
		print_log_to_stdout = False
	),
}

auto_refined_similarity : dict[str, float] = { # actual type is dict[type[GameBase], float]
	'AlphaGame': 0.9756566604127581,
}

last_mode : dict[str, float] = { # actual type is dict[type[GameBase], int]
	'AlphaGame': 0,
}
```

The file is then reloaded on the fly and used again. It looks something like this:

```python
def _reload_settings(self):
	global auto_refined_settings
	importlib.reload(auto_refined_settings)
	import auto_refined_settings
	sleep(1) # to be sure that reimport is done
```

First of all, it’s _awesome_. I mean, I’m, you know, [a connoisseur of such things](https://askepit.github.io/blog/constexpr_game_of_life/). And secondly, these settings can be easily loaded by other test scripts that live alongside the main code and serve as sandboxes for testing. Thanks to this setup, they always have the very best settings available to grab and use.

I won’t dive into the details of `SettingsMiner` here, because what’s valuable is the _idea_ itself, and the implementation is long and tangled—not because it contains anything _especially_ profound, but simply due to a plethora of nuances, preferences, conveniences, and, well, some semblance of architecture and so on.

# Aftertaste

The aftertaste of all this is mixed — perhaps there are _faster_ and _more reliable_ ways to find _balanced_ game settings. After all, one could have just hired a game designer. But I figure the tool we’ve built, while directly applicable only to my never-released game, can still serve as a handy guide for gathering metrics on your own side projects.

Did this tool actually help me improve the game? Honestly, I’m not sure :) Does it even matter, if it gave me an excuse to write a bunch of curious code? Besides, I had fun — so the time wasn’t wasted.

---
<small>© Nikolai Shalakin. Translated by the author.</small>