---
tags:
  - article
  - cpp
title: constexpr Game of Life
url-title: constexpr_game_of_life
description: For over a decade now, C++ has had constexpr, a feature that allows programmers to dump part of the workload onto the compiler. When I first encountered it, it blew my mind—imagine the compiler crunching some pretty complex calculations before the program even runs!
keywords:
  - c++
  - constexpr
  - python
  - game of life
  - abnormal programming
image: https://habrastorage.org/webt/p1/t-/7c/p1t-7csilx5ekan-m7ryligjg3o.png
---

# How It All Began

For over a decade now, C++ has had [`constexpr`](https://en.cppreference.com/w/cpp/language/constexpr), a feature that allows programmers to dump part of the workload onto the compiler. When I first encountered it, it blew my mind—imagine the compiler crunching some pretty complex calculations *before the program even runs*!

At some point, a thought struck me: if the compiler can calculate everything for you, then **why bother with runtime at all**? What are you going to do there—print out some results? Come on, that's lame. Totally unsportsmanlike.

And that's exactly when my challenge was born:

> "Hands off" or "don’t even think about running the exe file."

# Setting the Goal

Let’s spell out the main idea one more time for clarity: we want to write a program, compile it, and have **all** computations happen *during compilation*. Actually running the program? *Not interested.*

But the code **must work**.

Contradictory? Perhaps. Impossible? Nah. We’re doing this.

![](https://habrastorage.org/webt/p1/t-/7c/p1t-7csilx5ekan-m7ryligjg3o.png)

Complicating Factors: I'm a Windows Dev. Ah yes, I’m one of those *Windows programmers*. Go ahead, prepare your popcorn for the inevitable flame wars. For me, this means dealing with Windows-specific horrors: Visual Studio's compiler, `cmd`, `bat`, `exe`, and all the other nightmares that haunt Linus's dreams. This setup will undoubtedly throw extra wrenches into the works, but hey, I’m all for it.

The program must do something reasonable and useful. The overplayed examples of calculating factorials or Fibonacci numbers are off the table—too cliché, zero practical value, and utterly unchallenging. Forcing the compiler to play Doom? Tempting, but I’ll pass. Not because the compiler couldn't handle it, but because *I* probably couldn’t handle it.

So, I landed somewhere in the middle. We’ll make the compiler play a game, but something significantly simpler. Say, [Conway’s Game of Life](https://en.wikipedia.org/wiki/Conway%27s_Game_of_Life). I mean, if even Google [can run this simulation directly on their search page](https://www.google.com/search?q=game+of+life&oq=game+of+life), why can’t I force a C++ compiler to do the same?

For those who didn’t click the links and aren’t familiar with this “game,” here’s an animation:

![](https://habrastorage.org/webt/qy/aa/qd/qyaaqd5gqbax2fjijv1clg2bbkk.gif)

Let’s refresh the rules of the Game of Life:

- If a cell is alive and has fewer than two neighbors, it dies.
- If a cell is alive and has more than three neighbors, it dies.
- If a cell is empty but has exactly three neighbors, life is born in that cell.
- And so it goes, generation after generation, endlessly.

“But wait,” you’ll say, “Game of Life is a *game*. It needs frames, a main loop, infinite execution, rendering—even animations! And here you are spinning us some nonsense about compile-only.”

Fair point. But in this challenge, I’m giving myself plenty of room for creativity. The one hard rule is this: **you cannot execute the compiled file.** Not directly, not indirectly. Beyond that? Anything goes. And this is where we’ll need to get *very* creative.

# Nuances of `constexpr`

Let’s clarify some language subtleties upfront. In C++, you can mark a function or method as `constexpr`. But—and here’s the kicker—this doesn’t guarantee compile-time execution. If the function is called with non-`constexpr` parameters, your `constexpr` marker will be quietly ignored, and you won’t even get a heads-up about it.

For example, take this code—it *will* perform the calculation during compilation:

```cpp
constexpr int twice(int n)
{
    return n * 2;
}

int main()
{
    return twice(17);
}
```

The program will exit with code `34`, and the calculation `17 * 2` will have been performed during compilation, meaning the binary will simply store the result `34`.

> Of course, we’re talking theory here, so let’s skip over the fact that the compiler can optimize such trivial multiplication all on its own, even without explicitly using `constexpr`. For the sake of this discussion, let’s pretend the compiler won’t bother without it.

Now, let’s tweak things to make compile-time execution *impossible*:

```cpp
constexpr int twice(int n)
{
    return n * 2;
}

int main()
{
    int n;
    std::cin >> n;
    return twice(n);
}
```

Now, the return code depends on user input, which means the compiler's ability to compute the result at compile-time is effectively *gone*. However, the code still compiles and runs. This demonstrates that the `twice` function can be legally used in both compile-time and runtime contexts.

That said, it doesn’t mean you can just slap `constexpr` onto any function as a catch-all. The moment you add something incompatible with compile-time evaluation, you’ll be greeted with a compilation error:

```cpp
constexpr int twice(int n)
{
    std::cout << n * 2 << std::endl;
    return n * 2;
}
```

When we try to compile this, we get:

```
error C3615: constexpr function 'twice' cannot result in a constant expression
```

Okay, but what if I want to guarantee that my function always, *always* runs in a compile-time context? Enter [`std::is_constant_evaluated`](https://en.cppreference.com/w/cpp/types/is_constant_evaluated) from C++20. This is a `constexpr` function you can call inside another `constexpr` function to check if you’re *actually* in a `constexpr` context or if you’ve been downgraded to runtime. Because, of course, the C++ standards committee loves its complexities.

In our case, we *need* to ensure we’re operating in a compile-time context. Any deviation from this course should ideally result in a compilation error. Sure, we could wrap ourselves in layers of `constexpr` and sprinkle some `std::is_constant_evaluated` checks. But, fortunately, the same C++20 also introduced the [`consteval`](https://en.cppreference.com/w/cpp/language/consteval) specifier. Think of it as `constexpr` on steroids: it marks a method as being *exclusively* for compile-time execution. Any attempt to use it at runtime will immediately throw a righteous compilation error. And that’s exactly what we need—strict guarantees that the compiler’s exe will sweat, not ours.

> This article uses C++20 features and, when necessary, dips into C++23. Not everyone can unleash these wonders in production, but hey, that’s just life as a C++ developer.

# Starting the Game of Life

Let’s begin by writing some code without worrying about `consteval` or other quirks for now. We’ll sort that out as we go.

So, we need a canvas of a specific size. I’m going with 16x16. Later, you’ll see why I chose this size and (hopefully) admire the cleverness.

And so, the abnormal programming begins:

```cpp
#include <array>

constexpr bool _ = false;
constexpr bool X = true;

constexpr size_t N = 16;
using Canvas = std::array<std::array<bool, N>, N>;

constexpr Canvas life { {
	{_,X,_,_,_,_,_,_,_,_,_,_,_,_,_,_,},
	{_,_,X,_,_,_,_,_,_,_,_,_,_,_,_,_,},
	{X,X,X,_,_,_,_,_,_,_,_,_,_,_,_,_,},
	{_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,},
	{_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,},
	{_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,},
	{_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,},
	{_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,},
	{_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,},
	{_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,},
	{_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,},
	{_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,},
	{_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,},
	{_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,},
	{_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,},
	{_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,},
} };

int main()
{
    return life[0][1];
}
```

I know, I said I wouldn’t bother with compile-time stuff for now, and then I went ahead and smothered everything in `constexpr`. Well, forgive me—I couldn’t resist. There’s no real computation yet, but I’ve already laid the groundwork.

Here’s what we’ve done so far: we introduced a two-dimensional canvas entity, `Canvas`, and declared the starting frame of the game, `life`, which contains a curious little pattern called the *Glider*. In the Game of Life, the Glider behaves like a rotating, moving object that more or less retains its shape over a defined period. Easier to show than to explain:

![](https://habrastorage.org/webt/f1/je/pf/f1jepfxskshjwvskqqsofflp9kg.gif)

This pattern is perfect for testing the game logic—it should move diagonally downward and to the right every frame.

Now, I foresee a question: "why did you add `return life[0][1];`?" Without that line, the compiler would decide all our variables were pointless fluff and cut *everything* from the binary.

Also, the `[0][1]` position contains a live cell, so the program should return `1` when it exits. Not that it ever *will* exit, mind you—remember the main rule of this challenge!

Of course, we’re not at the stage of executing anything yet, since we haven’t even compiled anything.

---

# Running the Compiler

Since we’re on Windows, the most logical compiler at our disposal is the one used by Visual Studio—Microsoft Visual C++ (MSVC). Its binary is famously named `cl.exe`.

Now, we *don’t* want to use Visual Studio as an IDE—that’s for the faint of heart. Our goal is to use `cl.exe` directly. And here we hit our first snag. On Linux, you can simply open a terminal and immediately run `gcc` to get down to business. But if you open a fresh `cmd` and type `cl /help`, you’ll get:

```
'cl' is not recognized as an internal or external command,
operable program or batch file.
```

By default, the shell environment isn’t configured to work with `cl` out of the box, and the path to it isn’t even included in `PATH`. And yes, this is *by design*. Here’s [some delightfully verbose documentation](https://learn.microsoft.com/en-us/cpp/build/building-on-the-command-line?view=msvc-170) about how to simply get `cl` up and running.

**TL;DR**: To handle the Visual C++ compiler manually, you first need to set up the shell environment. There are nearly a dozen ways to do this, depending on your desired platform and bitness. For each configuration, there’s a dedicated `.bat` file. Rule #1 of Windows compiler hygiene: first run the environment setup batch file, then use `cl`.

Here’s how it works:

```bash
"C:\Program Files\Microsoft Visual Studio\2022\Community\VC\Auxiliary\Build\vcvars64.bat"

cl /help
```

Here, we used the batch file for x64-native tools, which suits our needs.

You know all those x64/x86 Native Tools Command Prompt for VS2022 shortcuts? They’re essentially pre-configured shells where you can run `cl.exe` straight out of the box. But we’re dismissing that option too, because we want to compile from any bare terminal.

At this stage, the command we need for compilation looks like this:

```bash
cl /std:c++latest main.cpp
```

Its execution confirms that our setup compiles successfully, so we can proceed with writing more code.

# Stretching the Compile-Time Boundaries

With the compiler primed and ready, let’s soldier on with our Game of Life implementation.

In reality, the computational part of our simulation is painfully simple: you take an old `Canvas`, calculate the new `Canvas` based on the game’s rules, render/display it somehow, and repeat this until the end of time—that’s the whole program. The cornerstone of this algorithm is a function with the signature `Canvas update(Canvas old)`, responsible for calculating the next generation of cells:

```cpp
consteval Canvas update(Canvas old)
{
    Canvas res;

    for (int r = 0; r < N; ++r) {
        for (int c = 0; c < N; ++c) {

            int neighboursCount = 0;
            for (int nr = r - 1; nr <= r + 1; ++nr) {
                for (int nc = c - 1; nc <= c + 1; ++nc) {
                    if (nr == r && nc == c) continue;
                    
                    int wrappedR = (nr + N) % N;
                    int wrappedC = (nc + N) % N;
                    neighboursCount += static_cast<int>(old[wrappedR][wrappedC]);
                }
            }

            const bool isAlive = old[r][c];
            res[r][c] = neighboursCount == 3 || (isAlive && neighboursCount == 2);
        }
    }

    return res;
}
```

In essence, the entire logic of the game boils down to this single line: `res[r][c] = neighboursCount == 3 || (isAlive && neighboursCount == 2);`. The rest is just scanning cells and their neighbors.

Notice that I added wrapping to the canvas. This means if a live cell "goes off" the screen on the right, it reappears on the left. This was done to make life on a small canvas less likely to fizzle out into nothingness and more likely to sustain itself for as long as possible.

Sneakily, I also slapped a consteval onto the function, and the compiler didn’t even complain. Just like that—it’s perfectly okay with evaluating this at compile-time! Loops, branching, creating new variables—all of these luxuries are available to us. The toothless constexpr from the distant era of C++11 couldn’t handle loops or local variables, demanded a single return, and allowed branching only via the ternary operator. Remembering all that, I’m honestly amazed at the current compile-time capabilities of the language.

Now, let’s create a variable to store the second generation of cells:

```cpp
constexpr Canvas newLife = update(life);
```

And, of course, we’ll use our little trick with this variable to stop the compiler from stripping everything out:

```cpp
int main()
{
    return newLife[0][0];
}
```

Theoretically, we now have the second frame of the game calculated at compile-time. The only thing left to figure out is how to actually *see* it.
# Extracting the Information

How do we get the result after the compiler finishes its work? The first idea that came to mind was to make the compiler generate an ASM listing alongside the binary and check there. Our calculated second frame should definitely be there as a constant. Alternatively, we could parse the `exe` file—it should also contain this constant in some form. However, parsing a binary file with a complex structure reeks of madness.

## Assembly

To get an ASM file, the compiler needs the `/Fa` flag. To prevent the file from being overly bloated, we’ll also apply the highest level of optimization, while crossing our fingers that the optimizer doesn’t aggressively prune the frame we’re looking for. For optimization, we’ll add the `/O2` flag. In the end, we run the following command:

```bash
cl /std:c++latest /Fa /O2 main.cpp
```

Now, in addition to `main.exe`, we get a file named `main.asm`. Let’s take a look inside. Before we get to the actual assembly opcodes, there’s a section for declaring constant data, where we can see our familiar `newLife` represented as a set of 256 numbers. Here's a snippet of the listing:

```asm
CONST	SEGMENT
?newLife@@3V?$array@V?$array@_N$0BA@@std@@$0BA@@std@@B DB 00H ; newLife
	DB	00H
...
	DB	00H
	DB	01H
	DB	00H
	DB	01H
	DB	00H
...
	DB	00H
	DB	01H
	DB	01H
	DB	00H
	DB	00H
...
	DB	00H
	DB	00H
	DB	00H
	DB	00H
	DB	01H
	DB	00H

...
```

I copied this data array and tweaked it a bit in a text editor to make the frame readable:

```
0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0
1 0 1 0 0 0 0 0 0 0 0 0 0 0 0 0
0 1 1 0 0 0 0 0 0 0 0 0 0 0 0 0
0 1 0 0 0 0 0 0 0 0 0 0 0 0 0 0
0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0
0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0
0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0
0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0
0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0
0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0
0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0
0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0
0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0
0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0
0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0
0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0
```

Well, does it look like the second frame of a diagonally moving Glider? Seems like it does! I applied the same scheme for the third and fourth frames:

```cpp
constexpr Canvas third = update(update(life));
// и
constexpr Canvas fourth = update(update(update(life)));
```

Got the following "images":

```
0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0
0 0 1 0 0 0 0 0 0 0 0 0 0 0 0 0
1 0 1 0 0 0 0 0 0 0 0 0 0 0 0 0
0 1 1 0 0 0 0 0 0 0 0 0 0 0 0 0
0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0
0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0
0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0
0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0
0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0
0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0
0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0
0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0
0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0
0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0
0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0
0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0
```

```
0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0
0 1 0 0 0 0 0 0 0 0 0 0 0 0 0 0
0 0 1 1 0 0 0 0 0 0 0 0 0 0 0 0
0 1 1 0 0 0 0 0 0 0 0 0 0 0 0 0
0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0
0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0
0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0
0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0
0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0
0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0
0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0
0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0
0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0
0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0
0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0
0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0
```

The doubts are gone — this is our Glider, which means the Game of Life frames are being calculated correctly.
## Binary File

Now let’s try to dig into the binary file and find the same data that we saw in the ASM listing.

To do this, we’ll need at least a superficial understanding of the structure of an `.exe` file. I didn’t have that knowledge, but fortunately, I knew where to get it easily and painlessly — I remembered that [Alek OS](https://www.youtube.com/@AlekOS) had a [video](https://www.youtube.com/watch?v=-OzGawe9fmM) on YouTube where he explained the format of Windows binaries. By the way, I highly recommend Alek OS to everyone — his videos have filled more than one gap in my general knowledge that’s useful for any programmer.

Let’s not dive into dense thickets and instead demonstrate how I learned to jump through a binary file to the places needed for my task:

The array of our frame should be located in the `.rdata` section of the binary file. This is where all the read-only data resides.

The header, explaining where to go to find the `.rdata` section, is located almost at the beginning of the file:

![](https://habrastorage.org/webt/7q/eb/zz/7qebzzjfouzjjggfnjkxvrbzziu.png)

In the image, we see the beginning of the `.exe` file in a hex editor. Highlighted in yellow are 8 bytes allocated for the `.rdata` label. Moving 12 bytes forward from the yellow area, we find information about the starting location of the `.rdata` section in the file, marked in red. Since this is little-endian, `00 F0 00 00` translates to the offset `0xF000`.

Let's head straight there and take a look:

![](https://habrastorage.org/webt/tx/44/qx/tx44qxvj7jaxmwzhke1nnr086ry.png)

Hmm, nothing resembling our array is visible. In desperation, we scroll down a bit:

![](https://habrastorage.org/webt/ez/dr/zy/ezdrzyl1ioivefadv_zydjjzm90.png)

And there it is! Our Glider, recognizable immediately even amidst the binary noise. Viewing the executable's internals with Far3, set to display 16 bytes per line, reveals our 16x16 matrix perfectly readable—even in raw binary!

I couldn't discern what data precedes our array in the `.rdata` section, nor the rationale behind the array's specific placement. It likely stems from arbitrary compiler decisions.

However, I did discover that regardless of the compilation, the array consistently appears at byte `0x320` within the `.rdata` section (or byte `0xF320` from the file's start). Yes, this "magic number" may vary with compiler quirks or celestial alignments, but as long as the array remains there, I can parse the binary and extract the results of the constexpr program!

Parsing the binary is much more elegant than parsing assembly text, so we'll stick with this approach to retrieve the output.

---

# Bringing the Game to Life

Now pay close attention—our abnormal programming journey continues here.

We'll copy the contents of our `life` array into a file named `life.txt`:
```
{_,X,_,_,_,_,_,_,_,_,_,_,_,_,_,_},
{_,_,X,_,_,_,_,_,_,_,_,_,_,_,_,_},
{X,X,X,_,_,_,_,_,_,_,_,_,_,_,_,_},
{_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_},
{_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_},
{_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_},
{_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_},
{_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_},
{_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_},
{_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_},
{_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_},
{_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_},
{_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_},
{_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_},
{_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_},
{_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_},
```

And in our C++ code, we'll implement a truly hacker-worthy inclusion:

```cpp
constexpr Canvas life { {
    #include "life.txt"
} };
```

From now on, we consider the `life.txt` file as our "rendering window." And, as you may have noticed, it simultaneously serves as part of the C++ code.

Our clever plan is as follows:

- Compile the program
- Parse the exe file to extract the new Game of Life frame
- Write the new frame back into `life.txt`
- Repeat until we get tired of it

We can easily script this solution into an infinite loop using Python.

The brilliance and absurdity of this idea lie in the fact that if you view `life.txt` in any text editor that supports live content updates while running the script, you’ll effectively observe the Game of Life in motion! And in ASCII graphics, no less. Actually, it might be more accurate to call it C++-syntax graphics, as this content remains valid C++ code throughout. C++ code that mutates with each frame of the game. It's practically [evolutionary programming](https://en.m.wikipedia.org/wiki/Evolutionary_programming) in action.
# Writing the Main Loop

At this point, the article takes a sharp linguistic turn, shifting from C++ to Python.

Some might protest loudly, accusing me of cheating in plain sight—deliberately avoiding runtime in C++ only to run away to Python's runtime. Fair enough, but technically, I'm not executing the compiled exe file, so the challenge's rules remain intact.

---

Now, let's sketch out our game loop:

```python
def update():
    compile_cpp()
    life = parse()
    render(life)

def main():
    while True:
        update()
        time.sleep(0.25)

if __name__ == "__main__":
    main()
```

It's straightforward here—inside an infinite loop with a slight delay, we keep invoking `update()`, which embodies the sequence we described earlier: compilation, parsing, and "rendering."

All that's left for us is to implement the `compile_cpp`, `parse`, and `render` methods.

## Compiling C++

The first thing we need to learn is how to invoke `cl.exe` from within a Python script. Keep in mind that this isn’t straightforward, as we need to set up the environment first. Therefore, we start by running the batch script and then the compiler:

```python
def compile_cpp():
    ENVIRONMENT_SETUP = r'"C:\Program Files\Microsoft Visual Studio\2022\Community\VC\Auxiliary\Build\vcvars64.bat"'
    
    COMPILE = 'cl /std:c++latest /O2 main.cpp'

    os.system(f'{ENVIRONMENT_SETUP} && {COMPILE}')
```

Notice that I had to combine the two commands into one using `&&` to push them through a single `os.system` call. The issue here is that each call to `os.system` launches a new shell, meaning the context and environment do not persist between calls. If I split the code into two separate commands, I would encounter an error along the lines of "I don’t know who this cl.exe is," because whatever environment setup happens in one `os.system` call is confined to that call.

## Parsing the Binary

Now, after successfully compiling the program, let's try parsing the exe file to ensure that all the necessary data is indeed being parsed and extracted.

```python
N = 16

with open('main.exe', 'rb') as f:
    f.seek(0xF320)
    for r in range(N):
        for c in range(N):
            print(int.from_bytes(f.read(1)), end=' ')
        print()
```

We get:

```
0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0
1 0 1 0 0 0 0 0 0 0 0 0 0 0 0 0
0 1 1 0 0 0 0 0 0 0 0 0 0 0 0 0
0 1 0 0 0 0 0 0 0 0 0 0 0 0 0 0
0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0
0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0
0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0
0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0
0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0
0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0
0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0
0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0
0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0
0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0
0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0
0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0
```

Everything is fine, the binary parses correctly, and the magic offset still works. This means we can finalize:

```python
def parse():
    life = []

    with open('main.exe', 'rb') as f:
        f.seek(0xF320)

        for r in range(N):
            life.append([])
            for c in range(N):
                cell = int.from_bytes(f.read(1))
                life[r].append(cell)
    
    return life
```

## Rendering to `life.txt`

The key here is not to break C++ syntax; otherwise, we won’t get the next frame due to a compilation error in the C++ code during the next iteration of `update()`:

```python
def render(life):
    with open('life.txt', 'w') as f:
        for r in range(N):
            f.write('{')
            for c in range(N):
                cell = 'X' if life[r][c] == 1 else '_'
                f.write(f'{cell},')
            f.write('},\n')
```

Admiring the Results

![](https://habrastorage.org/webt/sf/89/ty/sf89tydi7a92arnsc2akhkbmgnk.gif)

Isn’t it a marvel:

- `constexpr`-only
- Mutation of source code
- Source code as visual content
- Without running the binary

# Fighting for FPS

You could say we've achieved what we wanted—a Game of Life simulation computed entirely by the C++ compiler. But for complete satisfaction, I want to address a few remaining issues with our solution.

The first glaring problem is the low FPS. It feels like we're running at about 1 frame per second. On the one hand, what did I expect? Each frame requires launching the compiler from scratch, which then has to process its entire standard cycle of parsing, optimization, and code generation.

Remember the `time.sleep(0.25)` in my `main-loop`? Yeah, I definitely overdid it, and I've since removed it—the animation shown above is already running without that delay. Yet the FPS is *still painfully low*.

Let’s recall that our script must invoke the `bat` file to configure the shell environment for each frame. Based on my empirical estimates, this step alone accounts for at least half of the total execution time. To fix this, we need a way for the script to run the `bat` file just once at startup and somehow retain the initialized context. Hmm, once again, I find myself like:

![](https://habrastorage.org/webt/p1/t-/7c/p1t-7csilx5ekan-m7ryligjg3o.png)

So, using `os.system` doesn't let us retain shell environment settings. I’m no Python expert, but the documentation at [docs.python.org](https://docs.python.org/) suggests that if [`os.system`](https://docs.python.org/3/library/os.html#os.system) isn't powerful enough for your needs, you can use [`subprocess.run`](https://docs.python.org/3/library/subprocess.html#subprocess.run).

Giving in to laziness and my weak will, I turned to ChatGPT, which suggested a solution using `subprocess.run`. It might not be the most elegant code, but it works.

The key idea: use `subprocess.run` to invoke our batch file along with the `set` command:

```bash
"C:\Program Files\Microsoft Visual Studio\2022\Community\VC\Auxiliary\Build\vcvars64.bat" && set
```

What does the `set` command do? If called without arguments, it simply outputs a list of all the current shell environment variables to stdout. Something like this:

```bash
$ set
HISTFILE='/root/.ash_history'
HOME='/root'
HOSTNAME='localhost'
IFS=' '
LINENO=''
OLDPWD='/'
OPTIND='1'
PAGER='less' PATH='/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin'
PPID='1'
PS1='\h:\w\$ '
PS2='> '
PS4='+ '
PWD='/root'
SHLVL='3'
TERM='linux'
TZ='UTC-01:00' _='--version'
script='/etc/profile.d/*.sh'
```

What the cunning ChatGPT suggests:

- Run the batch file.
- Run `set`.
- *Parse* the stdout and save the parsed variables into a dictionary.
- Use `subprocess.run` to call the C++ compiler in the loop, leveraging its advanced optional argument `env=` to pass our parsed map!

I can't decide whether this is brilliant or just plain stupid—like most of what’s happening in this article.

In the end, we write a `setup()` function to be called at the start of the script:

```python
msvc_env = {}

def setup():
    CMD = r'"C:\Program Files\Microsoft Visual Studio\2022\Community\VC\Auxiliary\Build\vcvars64.bat" && set'
    result = subprocess.run(CMD, stdout=subprocess.PIPE, shell=True)

    for line in result.stdout.decode().splitlines():
        if '=' in line:
            key, value = line.split('=', 1)
            msvc_env[key] = value
```

And in `compile_cpp()`, we'll replace `os.system` with `subprocess.run` and pass in our environment variables:

```python
def compile_cpp():
    COMPILE_CMD = 'cl /std:c++latest /O2 main.cpp'

    result = subprocess.run(
        COMPILE_CMD,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        shell=True,
        env=msvc_env
    )
```

Enjoying the result:

![](https://habrastorage.org/webt/ow/bo/hf/owbohfdfkthtajt_axbl7j8ixaa.gif)

By my estimation, it’s about 5 FPS compared to the old result of 1 FPS. This means our efforts weren’t in vain, and the result improved not just twofold but about fivefold.

It’s also worth mentioning that the compiler has a `/MP{n}` flag, which forces it to work in multiple threads, but my experiments showed that, in my case, the benefit was negligible.

# Compile-time Random

Technically, we have a working version of Game of Life, but it’s static, with a lone figure on the canvas. What we want is an explosion of cellular chaos, with cells interacting with each other. Manually populating the starting frame is a tedious and thankless task; we’d like to randomize the first frame so that every run has an unpredictable scenario.

These desires bring us two problems to solve. First, how do we implement randomness under `constexpr` conditions? Second, we need to somehow tell the compiler that the canvas should be randomly populated **only during the first compilation.** Subsequent runs should work in simulation mode, as in the current implementation.

Let’s set the second problem aside for now and focus on implementing compile-time randomness.

The first thing that came to mind was shaders. Specifically, how simple pseudo-random sequences are sometimes implemented in them. Usually, it’s not some sophisticated randomness with proper distribution, but rather a haphazard spaghetti of mathematical operations. For example, I dug this out of my notes:

```hlsl
float random (vec2 st) {
    return fract(sin(dot(st.xy,
        vec2(12.9898,78.233)))*u_time*1.0
    );
}
```

Looks dubious? I probably can’t resist and will write out the shader before your eyes, as proof that it works quite well:

```hlsl
void main() {
    vec2 st = gl_FragCoord.xy/u_resolution.xy;
    
    st *= 10.0;
    st = floor(st);
    
    vec3 back = vec3(0.1, 0.9, 0.5);
    vec3 front = vec3(0.2, 0.2, 0.2);
    
    gl_FragColor = vec4(mix(back, front, random(st)), 1.0);
}
```

And now, take a look at the result:

![](https://habrastorage.org/webt/dk/oj/h8/dkojh84dpq2f4gppxcl1pdfqhbo.gif)

Does it matter that the randomness here is very pseudo? Not at all. Moreover, you don’t even need to go to the lengths shown in the shader — a simple but effective pseudo-random number generator can be implemented using a straightforward formula with operations that are perfectly valid in a `consteval` context:

$$
R_{n+1}=(R_n*a+b) \bmod m
$$

Or, to put it simply, for the next number in the sequence, we:

- Multiply it by something large and preferably prime
- Add something large and preferably prime
- Take the modulus with something large and preferably prime, or even better, something cleverly bit-shifted

I settled on:

```cpp
seq = (110351545 * seq + 12345) % (1 << 31);
```

The problem is that the sequence will always be the same unless we find a way to start it with some random seed. Yes, to implement randomness, we need randomness—classic. In the shader example, the seed was the current time.

I went digging around the internet and eventually stumbled upon a GitHub snippet. No need to follow the link; I'll tell you right away what I gleaned from it: the author uses the `__TIME__` macro as a seed. Yes, it's also time, but in a peculiar format.

In fact, this macro is paired with the `__DATE__` macro. Both work quite intriguingly. Let's recall how macros work in principle: before parsing, the compiler runs the preprocessor, which substitutes text where the macros are located. Only after this does actual compilation of the source code begin. For `__DATE__` and `__TIME__`, the preprocessor substitutes string literals of the current build time in the format `"Jan 14 2012"` and `"22:29:12"`. It's fascinating to realize that with such macros in your code, the source code reaching the compiler is slightly different every time since `__TIME__` expands to a different string literal every second. My experiments, however, showed that with `__TIME__`, the substitution updates every 10 seconds for some reason—likely due to specifics of the MSVC preprocessor implementation. For our purposes, this limitation poses no problem.

In practice, the string is perfectly embedded in the assembly file. If I write something like this in the C++ code:

```cpp
constexpr const char* dd = __DATE__;
constexpr const char* tt = __TIME__;
```

then the asm listing will include a snippet like this:

```asm
;	COMDAT ??_C@_08BCGBJOAF@20?313?330@
CONST	SEGMENT
??_C@_08BCGBJOAF@20?313?330@ DB '20:13:30', 00H		; `string'
CONST	ENDS
;	COMDAT ??_C@_0M@DINKGNNG@Nov?520?52024@
CONST	SEGMENT
??_C@_0M@DINKGNNG@Nov?520?52024@ DB 'Nov 20 2024', 00H	; `string'
CONST	ENDS
```

That's how I inadvertently revealed the time this article was written.

Alright—how do we use a `const char*` as a seed? By hashing it into a number, of course. We'll write a custom hash. Here’s a function that returns a `consteval` seed:

```cpp
consteval uint32_t seed()
{
    uint32_t hash = 0;

    for (int i : {0, 1, 3, 4, 6}) {
        hash += static_cast<uint32_t>(__TIME__[i]);
    }

    return hash;
}
```

Why indices 0, 1, 3, 4, 6? If `__TIME__` only changes every 10 seconds, then the truly variable parts of the constant `"20:13:30"` are only those indices. The last character at index 7 will always remain unchanged, even though it isn’t a `:`.

---

So, let’s combine this knowledge and create the function `consteval Canvas random_canvas()`:
```cpp
consteval Canvas random_canvas()
{
    Canvas res;

    uint32_t seq = seed();

    for (uint32_t r = 0; r < N; ++r) {
        for (uint32_t c = 0; c < N; ++c) {
            seq = (110351545  * seq + 12345) % (1 << 31);
            res[r][c] = seq % 3 == 0;
        }
    }

    return res;
}
```

What is `seq % 3 == 0`? Well, it’s a sort of threshold, a weird attempt to decide whether a cell is alive or dead. I’m not sure how sound this solution is, but it ended up giving me good results for generating the first frame. For example, here’s one:

```
{X,X,_,_,X,X,_,_,X,X,_,_,_,_,_,_,},
{_,X,_,_,_,X,X,X,_,_,_,_,_,X,X,_,},
{_,_,_,_,_,_,X,_,X,_,X,_,_,X,X,_,},
{_,X,_,_,_,_,_,_,_,_,_,_,_,_,X,_,},
{_,_,_,X,_,X,_,_,X,_,_,X,X,_,X,X,},
{_,_,_,_,_,_,_,_,_,X,X,_,_,_,_,_,},
{_,_,X,X,_,X,_,X,_,_,_,_,X,X,_,_,},
{_,X,X,_,_,_,_,_,_,_,_,_,X,_,_,_,},
{X,_,X,_,_,X,_,_,X,_,_,X,_,_,_,_,},
{X,_,_,_,X,_,X,_,_,X,X,X,_,X,X,_,},
{_,_,_,_,X,X,_,X,_,X,_,_,_,_,X,X,},
{_,X,_,_,_,X,X,_,X,X,_,X,X,_,_,_,},
{_,_,_,_,X,_,_,X,X,_,_,_,X,_,X,_,},
{_,_,X,_,_,_,_,X,_,_,X,_,_,_,X,_,},
{_,_,_,_,_,_,_,_,X,X,_,_,X,_,_,_,},
{_,X,_,X,_,_,X,_,X,X,X,_,_,X,_,_,},
```

I think it’s a worthy first frame.

# Implementing Conditional Compilation

The final hurdle in our way is figuring out how to make the compiler understand what it’s supposed to do: generate the first random frame or simulate a new frame based on the previous one.

This puzzle kept me busy for a while, as it wasn’t immediately obvious how C++ code could determine whether it was being run *for the first time* or not. Then I remembered: this is C++, and you can smother it in macros until you lose your mind. Sometimes, these macros can work wonders, as we’ve already seen with `__TIME__`.

The solution turned out to be simple—almost prosaic. Any compiler allows you to pass custom `define`s at runtime so that the code can behave differently based on them. For MSVC, this is done using the `/D{define_name}` flag. This approach is as old as time itself, but you tend to forget about it when you need it most because, these days, macros are trendy to bash and shame.

So, the classic approach comes into play. Previously, we had:

```cpp
constexpr Canvas newLife = update(life);
```

Now it becomes:

```cpp
#ifdef STARTUP
constexpr Canvas newLife = random_canvas();
#else
constexpr Canvas newLife = update(life);
#endif
```
The changes on the script side concern how the compiler is invoked:

```python
first_build = True

def compile_cpp():
    global first_build
    
    STARTUP_CMD = '/DSTARTUP' if first_build else ''
    COMPILE_CMD = f'cl /std:c++latest /O2 {STARTUP_CMD} main.cpp'

    result = subprocess.run(
        COMPILE_CMD,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        shell=True,
        env=msvc_env
    )
    
    first_build = False
```

In the first iteration of the main loop, the script will invoke the compiler like this:

```bash
cl /std:c++latest /O2 /DSTARTUP main.cpp
```

Subsequent runs will omit `/DSTARTUP`:

```bash
cl /std:c++latest /O2 main.cpp
```
# Final

![](https://habrastorage.org/webt/pi/eb/pc/piebpckpqs8juxfsyfiffrcs1to.gif)

The frames are jittery due to rough screen recording, but I couldn’t resist including the scenario with the massive spaceship at the end.

As a bonus, here’s how I peer straight into the soul of the exe file as it’s relentlessly altered by the compiler. I observe, but I do not run it!

![](https://habrastorage.org/webt/ub/2b/2x/ub2b2xmwbd0y4khzh9agr8uzahe.gif)

Far3 doesn’t deliver such good FPS, but just the ability to see these "guts" is satisfying in itself. The [Hex Editor](https://marketplace.visualstudio.com/items?itemName=ms-vscode.hexeditor) extension for VS Code displays changes in the binary file faster, almost in real-time, but it lacks those fun emojis for the byte `01`.

# What Was That?

I’m asking myself the same question. However, let’s retrospectively look at what we’ve done and what we’ve mastered:

- Learned some nuances of `constexpr`
- Figured out how to use MSVC without an IDE
- Dug into the guts of an exe file bare-handed and even found what we were looking for
- Played around with macros, hehe
- Started with C++ and ended with Python
- Explored the intricacies of `os.system` and `subprocess.run`
- For some reason, I showed you a shader
- Achieved compile-time randomness
- Wrote a "game"
- Didn’t run the binary but just stood nearby!
- And had fun in the process

Abnormal programming makes life more enjoyable. Just don’t bring this to production.

---
<small>© Nikolai Shalakin. Originally published by <a href="https://habr.com/ru/articles/860150/">habr.com</a>, used under CC BY 3.0. Translated by the author.</small>