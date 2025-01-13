---
tags:
  - article
  - gamedev
  - multithread
title: Multithreading in games
url-title: multithreading_in_games
description: Modern games are rich in content, gameplay mechanics, and interactivity. A lot happens on the screen all at once—the world feels alive, responsive, and even without active player involvement, life continues to simmer, with multiple events unfolding simultaneously. Let’s dive into the details of how this diversity of in-game events is implemented and find out what role multithreading plays in all this, and how many cores a typical game needs.
keywords:
  - gamedev
  - multithreading
  - cpu
  - gpu
  - game engine
  - game loop
image: https://habrastorage.org/r/w1560/getpro/habr/upload_files/df0/17e/1a7/df017e1a78cf6edff3a94fae12a975a2.png
---

Modern games are rich in content, gameplay mechanics, and interactivity. A lot happens on the screen all at once—the world feels alive, responsive, and even without active player involvement, life continues to simmer, with multiple events unfolding simultaneously.

Let’s dive into the details of how this diversity of in-game events is implemented and find out what role multithreading plays in all this, and how many cores a typical game needs.

# Gameplay

If you want to understand how 99% of game engines handle any game at the highest level of abstraction, here’s the simplest and most understandable code:

```cpp
while(true)
{
    // calculate dt
    double dt = ...

    // game tick
    handleInput();
    update(dt);
    render();
}
```

The most important thing from a gameplay perspective here is the `update()` function, which does something like this:

```cpp
void update(double dt)
{
    updateGameTime(dt);
    updateWeather(dt);
    updatePlayer(dt);
    updateMonsters(dt);
    updateProjectiles(dt);
    updateHud(dt);
    updateSkills(dt);
    ...
}
```

> Game developers, don’t kick me too hard for such a naive example—I’m just trying to explain things simply :)

So what happens is: every game tick, which usually lasts a few tens of milliseconds (that’s the dt), all game subsystems are simulated for this tiny interval into the future. The game time progresses by a couple of seconds; the sun shifts by a few tenths of a degree; the player moves a small distance on the level; some monster manages to take a bullet that has been flying towards it for several dozen ticks.

As you can see, a lot happens all at once. But wait—where is the multithreading in this code?

![](https://habrastorage.org/webt/bj/cm/ni/bjcmnico0j4k-nur2bfyfwoqudu.png)

Upon closer examination, it turns out that these events do _not_ happen simultaneously. Yes, a person won’t notice the switch, and it will feel like there’s parallel execution of many things, but no—the gameplay world is predominantly a single-threaded affair.

To be more precise, multithreading in gameplay code is not a requirement at all. Not only is it not necessary, but for a number of reasons, it can even be somewhat detrimental.

# Why There Are No Threads in Gameplay Code

## Global Game State

Forgive me, fellow developers, for saying this, but game code is a realm of singletons and global state. Game levels, time managers, skill trees, audio players, HUDs, player inventories, current game progression, quest trees, diaries—these vital game components are usually represented as a single instance.

What’s worse—these components are needed by everyone, from everywhere. What’s even worse—they are needed by everyone, from everywhere, simultaneously. To be precise, if gameplay tasks were executed in parallel across different threads, all your global objects would be needed by everyone, from everywhere, really simultaneously.

At some point, two parallel tasks will need the player’s inventory—now one thread competes with another for exclusive access to the inventory. One thread will get to the inventory first, leaving the other one to just stand by and wait to avoid causing a [data race](https://en.wikipedia.org/wiki/Race_condition). And this happens every time, all the time. Your threads will be idle, waiting for other threads to release unique game resources, and it will all devolve into a single-threaded execution, but in a particularly twisted form. You might even lose speed, as thread creation and context switching are not cheap operations.

Wikipedia, in its articles on singletons and global variables, directly points out how poorly they pair with multithreading:

>*...code using global variables will not be [thread-safe](https://en.wikipedia.org/wiki/Thread_safety)...*
>
>[Global variable](https://en.wikipedia.org/wiki/Global_variable) article

>*...In multithreaded programs, this can cause [race conditions](https://en.wikipedia.org/wiki/Race_condition)...*
>
>[Singleton pattern](https://en.wikipedia.org/wiki/Singleton_pattern) article

## Dependencies

Let’s imagine that game systems don’t have shared data that needs to be contested. Then, theoretically, we could run all systems in parallel across different threads:

```cpp
void update(double dt)
{
    static std::vector<std::thread> jobs;

    // Launch threads
    jobs.emplace_back(updateGameTime, dt);
    jobs.emplace_back(updateWeather, dt);
    jobs.emplace_back(updatePlayer, dt);
    jobs.emplace_back(updateMonsters, dt);
    jobs.emplace_back(updateProjectiles, dt);
    jobs.emplace_back(updateHud, dt);
    jobs.emplace_back(updateSkills, dt);

    // Wait for threads completion
    for (auto& job : jobs) {
        job.join();
    }
    jobs.clear();
}
```

But even without the need to share common data, gameplay systems tend to require data that another gameplay system should prepare/update. In other words, we encounter systems that depend on each other. For example, some sounds are played as a result of animations—classic case being footstep sounds. The weather system depends on the game time system. The player movement system depends on the system that processes raw input from the keyboard/mouse/controller. Ultimately, we have a picture where all systems are tightly interwoven with one another; the operation of one system depends on another, and the entire chain of systems should ideally be executed in a specific order.

Okay, so what happens if we disregard the execution order of systems that depend on each other? Let’s imagine a game about an ecosystem, animals, and their behavior. Animals should behave according to the time of day and weather conditions: during heavy rain, they should seek shelter; in the scorching heat of the day, their health should start to decrease until they find a water source. The weather changes every in-game hour.

Current game situation: it is 13:59 game time, it’s sweltering heat, and the animal is on the brink of death with very little health left. It’s time to simulate the next game tick, and we start the simulation of three game systems in parallel: game time, weather, and animal behavior. Since we are running the systems simultaneously, we don’t know in which order events will occur: will the weather calculation happen first, followed by the game time update—or the other way around? Now, it’s uncertain, and the order will be different every time, randomly.

In this particular tick, the threads executed in such a way that the weather was calculated first: it looked at the game time (which hadn’t changed yet!) and decided that, since the hour hadn’t passed, the weather should remain the same. Then, a moment later, the game time thread managed to update the time to 14:01, but for the final thread, which determines the fate of the animal, this no longer matters—since the heat persisted, the creature’s last bit of HP was drained, and it died.

However, if the time had changed first, followed by the weather, and then the animal behavior calculation, the weather might have changed to a breeze or rain, and the animal would have survived.

"But the maximum lag between systems here would be only one tick!" — you might say, and you’d be right—it’s not the biggest problem. The worse issue is that we’ve made the game’s behavior nondeterministic—i.e., the same conditions can lead to different outcomes each time. Under the same conditions, your animal might survive once and not the next time. And if you happen to encounter a tricky bug related to a specific order of system execution, good luck reproducing and debugging in this multithreaded mess.

## The Bottom Line

So, is there no multithreading in gameplay code? It seems that way. If you become a game logic programmer, you’ll deal with multithreading only in rare cases. Personally, I’ve explicitly created threads in gameplay code almost never in my six years of game development experience and have only seen colleagues do it a few times.

For the same reason, for example, Blueprints in Unreal Engine operate exclusively in the [main thread](https://forums.unrealengine.com/t/multi-threading-in-blueprints/403701).

But you know what?..

# I Lied to You

Yes, it’s not all that straightforward, and gameplay can indeed have threads. You just can’t forbid people from using them. Let’s start with the most obvious manifestations of threads in game logic.

## ECS

![This guy is eager to tell you how wrong you are and that ECS "actually" exists in game development](https://habrastorage.org/webt/e4/gj/ic/e4gjic0lmvrow-9_8ptyzlvb698.png)

So, ECS—everyone has written about it, and it might seem that in the gaming industry it’s the de facto standard. If you’re a serious game engine, you just can’t not use ECS by default. In reality, this isn’t entirely true, but let’s break it down step by step.

What is ECS? I won’t dive into the details, but I’ll try to briefly explain how it differs from the classic component-based approach. Typically, in Unreal Engine or Unity, your game entities are actors with components attached to them, containing logic and data:

![Two actors in a component-based approach](https://habrastorage.org/webt/_z/ev/dd/_zevddiwenmxaasffjpuvauxe5a.png)

This is processed by the engine in the `update()` function like so (apologies, but I’ll switch from C++ to pseudocode for clarity):


```py
func update(dt):
	for actor in scene.actors:
		for component in actor:
			component.update(dt);
```

In the ECS paradigm, entities are architecturally represented in a more sophisticated manner:

![Two actors in ECS approach](https://habrastorage.org/webt/1y/en/zo/1yenzoyp_nqhnk5hwwswl_fogwm.png)

 There are no actors—instead, there are entities. They are similar to actors in that an entity is associated with a set of components it references. However, unlike the components from the previous example, ECS components contain only data—no logic. Logic is handled by systems. The processing of all this looks something like this:

```py
func update(dt):
	for system in ecs.systems:
		for entity in ecs.getAllEntitiesFor(system):
			system.update(entity.getComponents(), dt);
```
For example, the `AIMovementSystem` will process _all_ entities in the game that have `AI` and `Position` components when it’s their turn to update.

— Where are the threads?

Yes, we don’t see them yet, but because systems (i.e., behavior) are separated from components (i.e., data), we have greater potential for parallel execution. ECS developers often allow for the parallelization of system simulation in two directions:

- Each system can be processed in parallel (external `for` loop)
- Each set of components can be processed in parallel (internal `for` loop)

— Why couldn’t we parallelize the two `for` loops in the pseudocode for the component-based approach in the same way?

That’s precisely the point. We could parallelize them in the same manner. But since, regardless of the approach—whether it’s EC or ECS—we still have global state and dependencies that we discussed at the beginning, parallelization ends up being very limited. ECS, however, has more explicit information about dependencies between systems and which systems require shared components, and which have no component intersections. If there’s no dependency of one system on another, and no component overlaps—there’s room for maneuver and parallelization, and ECS developers generally attempt to parallelize such cases across different threads.

However, if we create a rule that the movement calculation system must run after the input system, or that the audio system must run only after the animation system, the parallelization opportunities for the external `for` loop (iterating over systems) significantly diminish, or even disappear entirely. Additionally, we cannot run two systems in parallel if both require at least one shared component.

Parallelizing the internal `for` loop (iterating over entities within a system) is also challenging, as it’s possible only if the system isn’t tied to any unique game resources, which isn’t a very common situation.

— So why does ECS exist if it doesn’t provide the benefits we’re seeking?

It does offer benefits—but not where we might expect. Because multithreading isn’t the main killer feature of ECS, but rather a pleasant bonus. The primary advantage of ECS is evident in the diagram I provided earlier—notice how neatly and orderly the components are laid out in memory. They fit neatly into the cache, resulting in a streamlined, fast, cache-friendly approach that delivers significant CPU performance boosts.

> **Note:** Some implementations of ECS architecture might differ, and components in memory might be organized differently. For example, in Archetype-based ECS implementations, you can read more [here](https://github.com/SanderMertens/ecs-faq?tab=readme-ov-file#what-are-the-different-ways-to-implement-an-ecs).

### A Brief Off-Topic on ECS in Engines

Regarding ECS as the flagship technology in the industry—it’s certainly cutting-edge, but game engines generally offer ECS solutions as an optional feature, for cases where developers hit performance bottlenecks with large numbers of objects. Unity offers [DOTS](https://unity.com/dots), and Unreal has [Mass Entity](https://dev.epicgames.com/documentation/en-us/unreal-engine/mass-entity-in-unreal-engine/?application_version=5.0). The only engine I know that is built strictly and exclusively around the ECS approach is [Bevy](https://bevyengine.org/). There was also [Amethyst](https://github.com/amethyst/amethyst), but it folded a couple of years ago and recommended migrating to Bevy. Both engines are built in Rust. [Godot](https://godotengine.org/) has actually distanced itself from ECS and released a [article](https://godotengine.org/article/why-isnt-godot-ecs-based-game-engine/) explaining why it doesn’t and won’t use ECS.

## Heavy Computations

Moving forward in the search for multithreading in games, we'll dive into more specific algorithms suited to particular games and situations. This usually concerns tasks that involve heavy computation, are resource-intensive, and ideally, can be computed in the background. Additionally, there shouldn’t be significant dependencies on the global state of the game. The task is broken down into several independent subtasks that can be executed in parallel, and then the results are combined.

It's important to understand that we’ll be discussing specific cases, so there won't be general recommendations or best practices on how to effectively incorporate multithreading—this highly depends on the particular situation, and developers will need to adapt and synchronize with the rest of the gameplay code as they go. Various heuristics might come into play:

- **Want to read data from a global object but don't want threads constantly battling over shared data?** Try copying a slice of the data at the start of the threads. Often, this isn’t too costly and eliminates the burden of synchronization between threads.
- **Want threads to read and write to a global object without significant synchronization overhead or data races?** Welcome to the intriguing world of [lock-free data structures](https://en.wikipedia.org/wiki/Non-blocking_algorithm)—it’s complex and challenging but efficient.
- **If `C` depends on `B`, which depends on `A`, so you can’t run them in parallel?** It’s unfortunate, but see if you can parallelize `A`, `B`, and `C` individually, i.e., run `A1`, `A2`, and `A3` in parallel.
- And so on.

### AI Tasks in RTS and Turn-Based Strategies

In turn-based strategies, a significant part of the gameplay involves the AI opponents' turns. Often, calculating their moves can take _a lot_ of resources and time. In games like [Civilization](https://en.wikipedia.org/wiki/Civilization_(series)), the opponent’s turn can take several seconds, which is normal. Naturally, developers strive to minimize the time it takes for the computer's turn, and this is primarily achieved through parallelizing everything possible. Threads are heavily utilized here.

### Procedural Generation

World generation is another heavyweight task that can be handed off to multithreading. Again, it depends on the specific game and situation, but if you have a virtually endless world like [Minecraft](https://en.wikipedia.org/wiki/Minecraft), you can generate the next part of the world in the background as the player approaches the edge of existing biomes. This way, if the player suddenly ventures further into uncharted territory, there won’t be noticeable lag due to the _urgent_ need to generate content.

### Maintenance

In online games, and even in offline ones, maintenance procedures are occasionally performed—these are administrative tasks meant to repair/clean/optimize the game or game world. This could involve collecting and removing corpses, resetting NPC states, increasing farmable resources, optimizing terrain, buildings, and surroundings, recalculating navmeshes, or processing financial transactions—both in-game currency and monetization operations.

Various degrees of complex workarounds and hacks might also be involved to prevent inevitable crashes or excessive memory consumption due to leaks. Game objects that have entered an invalid state might be repaired (or _attempted_ to be repaired).

All these operations are best performed in a separate thread in the background to avoid taking up CPU time from the main thread handling the core game simulation.

# Game or Engine?

Now, belatedly, let's address the question—are we talking about the game or the game engine? We’ve raised this question in a timely manner because throughout this discussion, I've aimed to focus on _gameplay_ code, i.e., not delving into what the _engine_ does under the hood but sticking to the code written _for the game_.

However, it’s challenging to draw a clear line between the two. The executable file you run to play a game contains machine code for both the _engine_ and the _gameplay_ code written on that engine.

Why is the Boundary Blurred? In Unreal Engine, for example, you can create custom components for actors that are specific to your game. Yet, the engine provides an extensive set of general-purpose components that the engine developers have already created for you. The question arises: is the engine’s MovementComponent considered engine code, while your custom PonyAnnigilatorComponent is game code? It’s somewhat both and neither. The boundary is indeed blurred. The same applies to ECS: while you write your game-specific systems, the engine will almost certainly include foundational systems like Movement or TransformHierarchy.

Sometimes, game-specific features are even hardcoded into the engine. This isn’t uncommon; I’ve worked on a game where an open-source engine was forked, and a significant portion of the game code was written directly in the engine code.

Nevertheless, we can still identify parts that are distinctly engine code and parts that are strictly game code. Here's a monumental diagram illustrating the architecture of a typical game engine, as described by Jason Gregory in his book [Game Engine Architecture](https://www.gameenginebook.com/):

![](https://habrastorage.org/webt/nh/iz/hm/nhizhm6mzwr4idmjfoywkiszuy8.png)

Impressive, isn’t it? So, technically, only the very top level of abstraction—Game-Specific Subsystems—can be attributed to the game itself. The submerged part of the iceberg is the game engine, which everything relies on.

Also, on the diagram, you can spot one of the low-level building blocks that support the machinery of game systems—the "Threading Library," which provides convenient platform-independent thread management mechanisms. This building block is here for a reason, as game engine code, unlike gameplay code, tends to make extensive use of threads.

It's also worth explaining that in an engine, threads are generally created in advance in a fixed quantity, forming a Thread Pool. Initially, all created threads are simply asleep, waiting for someone to need multithreading. This is because creating and destroying threads is an expensive operation that requires non-trivial actions from the operating system; thus, having fewer threads is better.

On top of this thread pool, a Task or Job system is usually built, allowing you to abstract away from the thread pool and simply ask the system: "I want to run this piece of code in a separate thread." The system will then wake up one of the threads in the pool and make it work.

Let's walk through some typical places in the engine where threading can be applied.

## Audio

Audio rendering is easily offloaded to a constantly running separate thread, since the results of this system generally don't depend on other systems.

You simply send sounds that need to be played to this thread, and everything else will be handled in the background.

## Physics

This is not as straightforward as audio because physics needs to synchronize with game simulation and rendering. Nevertheless, offloading physics calculations to a separate thread is a common practice, as physical computations are some of the most resource-intensive, and there's a benefit to using a dedicated thread.

The physics engine operates in two main stages:

- Detects collisions between objects;
- Resolves each collision—calculates the new velocities and directions of the colliding objects. Each such resolution is handled by a solver.

For the second stage, you can go further and launch multiple threads for each solver so that they can be computed in parallel. Then, the engine will wait for all threads to complete, and the synchronization phase with the game simulation will follow.

## Database

The database is another typical candidate for running in a separate thread. Database queries can be heavy, and we definitely don't want them blocking the main thread. Similarly, the database itself is often a crucial resource, and it needs to operate quickly without interruptions. For online games, such as a hypothetical MMO, the main database is essentially equivalent to the "save file" in a single-player game. And this "save file" is massive, resource-hungry, and critical to the entire operation of the game. Therefore, separating the main game thread from the database thread is usually a mutually beneficial practice, ensuring that neither interferes with the other.

Interestingly, when I was working on an MMO, I found it fascinating that, from the perspective of gameplay code, reading from the database is more expensive than writing to it. When you write to the database, you send the data to the database thread, and then you continue with your work. However, when you try to read something from the database, you have to request the data, wait for the database thread to process the request, and then wait for the data to come back to the main thread—definitely not cheap.

## Server-Client

Returning to online games. If a typical single-player game has one single application that you usually run on your computer or console, the client-server approach radically changes the rules from a development perspective. Now there are multiple applications—a single (ideally) server and many clients connecting to the server from hundreds of players' machines around the world.

The game code is now "split" into two parts:

- Server — this is the original game, but it lacks rendering, graphical interface, and input;
- Client — this is the rendering, graphical interface, and input that the server lacks. In every other respect, the client is entirely dependent on the server, which authoritatively tells it what is actually happening in the game. Any client’s attempts to speculate about the game state are called "speculations" because, at best, the client can only predict or guess what’s happening.

So, the server, besides being the original game simulation, is also a _server_ by its very nature. That is, an application that accepts connections from clients and services them throughout the connection process. How exactly the server handles this connection and service is up to the implementation details of each server. But one of the simplest approaches is to create a thread for each individual connection. In real life, this is not the most practical approach since there won't be enough threads for everyone, but in the implementation of client-server interactions, multithreading can be a useful tool, especially if the server load is high.

## Logging

Logging has a situation somewhat similar to audio rendering—no one reads from this subsystem, only writes to it. You write to the log and forget about it. The logger, running in a separate thread, will handle everything in the background: adding the entry to the buffer, flushing it when needed, and physically writing a batch of data to disk, to a database, sending it over the network, or whatever else is necessary.

## Rendering

I won’t pretend to be even remotely competent in rendering, but from experience, there is almost always a dedicated render thread where the work of forming the next frame in the game and interacting with the GPU takes place. Rendering, like physics, needs to synchronize with the game simulation occurring in the main thread at some point.

## GPU

When we talk about multithreading, we’re in 99% of cases referring to CPU cores. But GPUs also have cores. Moreover, they are hundreds of times more numerous than CPU cores. On GPUs, the number of cores is counted in _thousands_. Graphics cards are literally synonymous with multithreading and parallelization.

Why do GPUs have so many cores? I’m not the biggest expert in rendering, so I’ll outline it broadly. GPUs execute shaders. Shader code is code that needs to be executed _simultaneously_ for every pixel to produce the final result. This is if we’re talking about pixel shaders. Shaders of other types perform different calculations, but one thing remains the same—a shader will be executed by the GPU _in parallel_ for each pixel/vertex/triangle.

This, by the way, defines rendering programmers as a special caste, because writing shader code is quite different from what you see in regular CPU development. It's no small feat to write _one_ piece of code that will be executed for each pixel and result in a coherent yet _different_ result for each pixel.

> **Note:** When I refer to "pixel" in the context of shader code, I’m using an imprecise term, as it’s not exactly the pixel on your monitor. What shaders operate on should be correctly termed as "fragments," and pixel shaders should be referred to as "fragment shaders."

It’s also worth mentioning compute shaders—shaders designed for arbitrary, non-graphical computations. These shaders are used to offload work that is typically done on the CPU to the GPU, achieving significant gains due to the GPU’s order-of-magnitude greater number of cores. Plus, consider mining as a typical non-graphical process, which GPUs handle much better than CPUs due to their vast number of cores.

## You Name It

Clearly, game engines make extensive use of threads; and there are many systems where multithreading is applied to varying degrees that we can't possibly cover all in a single article.

# Conclusions

So, what have we concluded, and what does this article give us? I think everyone will find something of their own in it, but here’s a summary from my side:

- Threads in games are not where they might seem;
- Multithreading does not always make the code faster. Sometimes it can even make things worse compared to a single-threaded version;
- Your games are likely to run faster on a processor with more cores. However, the increase in FPS will not be proportional to the increase in cores. Some games might perform at the same level as before;
- GPUs handle a lot and a significant portion of multithreading is managed by them;
- As a gameplay logic programmer, you may be surprised to discover that your work rarely goes beyond the main thread;
- As a game engine programmer, you may be surprised to discover that your work frequently extends beyond the main thread;
- Writing games is challenging even without threads;
- The executable file of a game is about 85% (a completely arbitrary number) comprised of game engine code rather than the game itself;
- The engine will, to a large extent (again, a completely arbitrary number), determine how intensively your final application will use multithreading;
- An MMO game server is likely to benefit more from additional CPU cores compared to a single-player PC game, due to the need to handle a large load from numerous clients.

---
<small>© Nikolai Shalakin. Translated by the author.</small>