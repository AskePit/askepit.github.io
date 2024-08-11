This is a story about how to never quite finish a project, yet gain a ton of experience and have no regrets.

So, we had one programmer, one artist, an absolute lack of understanding of the workflow, an unfamiliar game engine, and a desire to create something. If you're curious about the mixup of Voronoi diagrams, a special case of Minkowski distance, polygon transformations, procedural generation, and noise—all wrapped up in a beautifully stylized package—this is the right place for you to read.

Caution: A plenty of images ahead!

# How It All Began

I am a C++ developer in a small game development studio. I have a friend, Ilya. He's an artist, illustrator, and designer with his cozy graphic design studio.

At some point, Ilya knocked on my door and mentioned having a pool of artworks, sketches, and concepts that could be put to good use in a 2D indie game, and if I were interested, we could collaborate in our free time to create something interesting.

I thought it was not a bad idea and accepted the proposal.

# Artistic Style

We decided that the essence of the game and its lore would be extracted from the visual content we chose as the basis for the game. After digging into Ilya's concepts, we selected this art style and game world:

![Concept Art](https://habrastorage.org/webt/lv/ld/be/lvldbedobqesqnq_noyjqildnco.png)

More about the concept can be found in [this retrospective article](https://www.ilyaboyko.com/work/rift-in-the-empire-2) by Ilya.

We decided to start with a small prototype level, just to see how it turns out. The requirements for the level were minimal:

- Flat level, side view, the main character moves from left to right.
- Several background layers creating a [parallax effect](https://en.wikipedia.org/wiki/Parallax).
- Basic movement of the main character: walking, running, jumping, idle animation.
- Several platforms to jump onto.

Tasks were set, the goal was clear, but we still hadn't chosen a game engine.

# In Search of a Game Engine

For the project, I wanted to choose a simple 2D game engine that could handle complex tasks if needed. I wanted to be able to achieve the desired result without much hassle. This required the engine to have a simple scripting language which I could use for an easy gameplay features implementation without much difficulty. The presence of an editor was a strict requirement.

On the other hand, I wanted the engine, if I liked it, to be usable for future projects. The next project's requirements and the need for any serious computations were unknown. Therefore, the engine needed to allow writing part of the functionality in a mature compiled language like C++ or Rust if necessary.

Engines considered and rejected:

- [Unreal Engine](https://www.unrealengine.com/en-US). I'm familiar with Unreal, but it felt like crushing a fly with a steam-roller for our tasks. Also, UE4 is massive in size, and UE5 size is over ~~9000!~~ a hundred gigabytes. I really didn't want to resort to it, although it was my backup option.
- [Unity](https://unity.com/). Can't say much. It's the most popular choice for 2D game development. But somehow, my heart wasn't in writing in C#. Also, for some entirely subjective reason, I had a skeptical attitude towards the engine.
- [Bevy](https://bevyengine.org/). A very young engine where you need to write the game entirely in Rust—that was appealing. But fatal flaws overshadowed everything: no editor, the engine brutally enforces the ECS approach, and the game's architecture must literally bend to fit this paradigm. So, you won't migrate to another engine at all—you just throw away all the code and start from scratch.

By process of elimination, the dark horse of the game engine world was chosen—Godot. Yes, the same one that many Unity developers rushed to port to, angered by Unity's new pricing policy. I, however, started Godot exploration a year and a half before these events, so I wasn’t affected by that sudden hype. I even experienced a mini-migration from version 3 to 4, which happened to be almost seamless for me.

I can say right away that I haven't been disappointed with the choice, and the engine has never let me down. What can I say about Godot over time:

- It has its own scripting language, [GDScript](https://docs.godotengine.org/en/stable/tutorials/scripting/gdscript/gdscript_basics.html), similar to Python. It's simple and convenient.
- As an alternative, you can code in C++ or C#. If desired, Godot has bindings for other languages, such as [Rust](https://github.com/godot-rust/gdext). Going ahead—in the end, C++ came in handy and useful for the project.
- Godot is a simplicity itself. You literally take it and do it. No long documentation readings, no fuss. After the first basic [tutorial](https://docs.godotengine.org/en/stable/getting_started/first_2d_game/index.html), you just pick it up—and create the stuff.

Can I say something bad about Godot? Its logo is just awful.

![Godot Logo](https://habrastorage.org/webt/u-/ot/9z/u-ot9zns-1gkrhuucdnklw2mabg.png)

# Prototype Level

Since it has already been mentioned that development in Godot poses no difficulties, it's no surprise that a prototype level was implemented in a short time. It looked like this:

![Prototype Level](https://habrastorage.org/webt/l2/li/rk/l2lirk2ijrstjsg3z7mnzf_wvma.jpeg)

The entire level is quite long in size, so it’s difficult to show it in one picture, but here's a screenshot from the engine for you to assess:

![Level Screenshot](https://habrastorage.org/webt/m2/l2/2t/m2l22t0vfwzmkhqpk_nulo7vyn8.png)

The character could move through the level. There were platforms with collisions, swiftly moving parallax with five or six layers, and clouds drifted across the sky. All in all, it took me a couple of days—definitely less time than Ilya needed to draw all the content for the level.

In general, we realized that we could more or less continue working in this vein. We started discussing where to go next and fleshing out the essence of the game. It was a long, agonizing process because neither of us was a game designer, and extracting gameplay mechanics, story, hero motivation, lore, etc., was a struggle.

Eventually, during one of our meetings, Ilya uttered game-changing words: "Listen, I've been thinking, a side-scrolling platformer is somewhat dull—not much room for imagination and all. Let's create some randomly generated world with biomes, like in my favorite [Don't Starve](https://store.steampowered.com/app/219740/Dont_Starve/)."

This is where I’ve got a butt-squeezing tense because I quite understood how challenging it could be. I expressed all my concerns about the unpredictability of randomness to Ilya, the difficulty of dealing with it, and how the project would become significantly more complex. But Ilya replied, "Let's give it a try." I thought, why not, and agreed. And so, we began experiments.

# How on Earth do I Generate Biomes?

My exploration into how to generate random maps and biomes began with the fantastic article [Polygonal Map Generation for Games](http://www-cs-students.stanford.edu/~amitp/game-programming/polygon-map-generation/) by Amit Patel, written in 2010, which has probably become a living classic. I've seen various people refer to it multiple times when facing a similar task. In fact, it’s not just an article; it's a whole conglomerate of articles by one author, gradually revealing all aspects of his work on this topic. The article is essentially about how to generate islands with biomes, rivers, roads, and make it look convincing and realistic. For example, here's a completely randomly generated and procedurally drawn island:

![Randomly Generated Island](https://habrastorage.org/webt/rt/0a/i7/rt0ai74mxs89l87vxh5hx9vxhs8.jpeg)

It was an excellent read; I still remember every bit of that article. I even made notes and summaries of it in my Obsidian, that's how much this work impressed me:

![Obsidian Notes](https://habrastorage.org/webt/_m/kx/en/_mkxent-4r0zivo99usbbucgr70.png)

The article is so comprehensive that for our project, only the most basic ideas were sufficient, just the initial steps of the algorithm:

- Generating random points on a 2D plane
- Constructing a Voronoi map based on these points
- Assigning a biome type to each cell of the Voronoi map

Everything else was too specialized, aiming to generate an image entirely procedurally without the need for an artist. What we needed was a simple biome stylization, where the artist would draw each biome’s textures, and we would simply apply them to the Voronoi map polygons. So, the article served mainly as an inspiring, motivational guide, giving a rough direction to follow, rather than a step-by-step guide of success.

Additionally, I read about how Don't Starve developers generated their game’s world—I found an [article](https://dontstarve.fandom.com/wiki/World_Generation) on the fandom-wiki for the game. It also mentioned that the starting point for their generation was a Voronoi map.

# Voronoi Diagram

I had heard about the concept of the Voronoi diagram, knowing that it divides a 2D space into regions. My knowledge ended there, so I went to [Wikipedia](https://en.wikipedia.org/wiki/Voronoi_diagram) to learn more. In short, the diagram looks like this:

![Voronoi Diagram](https://habrastorage.org/webt/3-/uw/ig/3-uwig5opzdhzbhtizrih5trr3o.png)

This is a 2D space divided into regions, and each region has a site inside it. The unique property of this diagram is that if you point to any location on this map, the region you end up in will be the one with the closest site to you among all the sites on the map. In other words, if you imagine the Voronoi diagram as a giant park and the site as public toilets, being in the red polygon means you’d better run to the toilet that belongs to that polygon—other WCs are guaranteed to be farther away. If you find yourself on the boundary of polygons, toss a coin and run to any of the toilets in the neighboring regions—distances to both toilets along the boundary are the same. If you are at the corner of a region, it's more challenging—you are equidistant to three or even four toilets at once.

Well, you get the idea. The Voronoi diagram is often used in cartography and other applied algorithms where finding the nearest object on a plane is required. In games, it can be used as a universal algorithm for generating random polygons on a game map. All you need is to generate random points on the plane and build a map based on them. That was my plan, but I still needed to understand how to implement the Voronoi diagram algorithm.

While reading the Wikipedia page my attention was captured by a picture:


![Manhattan Distance](https://habrastorage.org/webt/tt/1h/pw/tt1hpwbh7m124h_hfwaaibkhjkm.png)

This got me seriously interested—look at the image on the right under the caption "Manhattan distance"—I literally understood at that moment that this is exactly what we need for our game. Look at these concepts, and you'll see it too:

![Concepts](https://habrastorage.org/webt/ur/g9/op/urg9opfdkwrforaurzo6gsiewzk.jpeg)

Clear, straight-diagonal lines for biome boundaries—perfectly suited to our stylized art. It's like taking a regular Voronoi map and stylizing it precisely to Ilya's art. In short, I understood that I wanted the division of the game map into biomes to have that and only that shape.

# Distances

But how is such a variation of the diagram built, and what is this "Manhattan distance" thing? I went to Wikipedia again to find the answers. In short, the [Manhattan distance](https://en.wikipedia.org/wiki/Taxicab_geometry) is an alternative way to calculate the distance between two points.

How do we usually calculate the distance from point A to point B? We draw a straight line between the points and measure its length. This length is the distance between A and B. This is the *Euclidean distance*, and its formula is well-known:

$$
\rho(x,y) = \sqrt{(x_2-x_1)^2+(y_2-y_1)^2}
$$

But what if point A is you, and B is a public toilet in a city with square blocks? If you draw a straight line between A and B on the map, the line will go through buildings. Even if you're in a hurry, you won't break through all the buildings in your way. Google Maps or a navigator will give you a route of straight segments with some turns—left and right.

Look at these three paths from one point to another:

![Three Manhattan Distances of Equal Length](https://habrastorage.org/webt/27/xl/lq/27xllqm4er9pzb9drjkug1sofyg.jpeg)

All three paths are the *shortest* paths from one point to another by Manhattan metric. And there are even more of these shortest paths. All these shortest paths have the same length. In the case of the points in the image, it's 12 units. This is the Manhattan distance. It is achieved by a large number of options but has a specific value that can be calculated by the formula:

$$
\rho(x,y) = |x_2-x_1|+|y_2-y_1|
$$

Manhattan distance is also called taxicab distance or L1 distance. It got the Manhattan name because the street layout of Manhattan has a pronounced block structure. Also, it's called taxicab distance because a taxi in Manhattan can only move along the streets, not through buildings, obviously. Also, Manhattan distances are how a rook moves on a chessboard.

So, I figured out that depending on the metric we use to measure the distance, the Voronoi diagram would look different. And it turns out there are an infinite number of metrics. That is, there are an infinite number of ways to calculate distance? In general, yes, there's even a general formula called the [Minkowski distance](https://en.wikipedia.org/wiki/Minkowski_distance):

$$
\rho_p(x,y) = (|x_2-x_1|^p+|y_2-y_1|^p)^{1/p}
$$

where $p$ is the so-called *order*.

Now, follow my hands: if you substitute $p=1$ into the formula, you get the Manhattan distance formula; and if you substitute $p=2$, you get

$$
\rho_p(x,y) = (|x_2-x_1|^2+|y_2-y_1|^2)^{0.5}
$$

which is essentially

$$
\rho(x,y) = \sqrt{(x_2-x_1)^2+(y_2-y_1)^2}
$$

i.e., Euclidean distance.

Thus, the Manhattan distance is the Minkowski distance of the first order, and Euclidean distance is the Minkowski distance of the second order. We can increase the order to infinity. Literally—to $\infty$. With $p=\infty$, the formula degenerates into the so-called [Chebyshev distance](https://en.wikipedia.org/wiki/Chebyshev_distance):

$$
\rho_p(x,y) = \lim_{p \to \infty}(|x_2-x_1|^p+|y_2-y_1|^p)^{1/p} = \max(|x_2-x_1|, |y_2-y_1|)
$$

However, as a non-mathematician, I don't quite understand how $lim_{p \to \infty}$ turns this formula into $max$. If someone in the comments can explain this to me in a straightforward way, I would be very grateful.

There is a high probability that I will want to use different metrics, so now I have a universal function for this in my arsenal:

```cpp
double distance(Point a, Point b, SpaceMetric metric = SpaceMetric::Euqlid)
{
	switch (metric)
	{
	default:
	case SpaceMetric::Euqlid:
		return sqrt(pow(b.x - a.x, 2) + pow(b.y - a.y, 2));
	case SpaceMetric::Manhattan:
		return abs(b.x - a.x) + abs(b.y - a.y);
	case SpaceMetric::Chebyshev:
		return std::max(abs(b.x - a.x), abs(b.y - a.y));
	}
}
```

Or, if you know the metric at compile time, and it won't change at runtime, it's even better to make it like this:

```cpp
template<SpaceMetric METRIC = SpaceMetric::Euqlid>
double distance_t(Point a, Point b)
{
	if constexpr (METRIC == SpaceMetric::Manhattan)
	{
		return abs(b.x - a.x) + abs(b.y - a.y);
	}
	else if constexpr (METRIC == SpaceMetric::Chebyshev)
	{
		return std::max(abs(b.x - a.x), abs(b.y - a.y));
	}
	else // SpaceMetric::Euqlid
	{
		return sqrt(pow(b.x - a.x, 2) + pow(b.y - a.y, 2));
	}
}
```
#### Bonus

In the [Wikipedia article](https://en.wikipedia.org/wiki/Minkowski_distance) on the Minkowski distance, there's an interesting thought experiment:

![Chessboard Distances](https://habrastorage.org/webt/bi/rz/h6/birzh6jdwojf_832e3heysczpcg.png)

It shows how the distance between two points differs for an ant, a king, and a rook on a chessboard. The ant moves with Euclidean distances, and its distance will be equal to the classical hypotenuse formula for legs of lengths 4 and 3; i.e., the ant will cover the distance in 5 units. The king moves with Chebyshev metric, so he can cheat—his diagonal moves are equal to horizontal and vertical ones, so he will reach the finish in 4 steps. The rook moves with our beloved Manhattan metric and closes the top three, reaching the finish in 7 steps.
# Naive Implementation

First of all, there is the simplest and most primitive algorithm for building a Voronoi diagram with *any* metric. It involves iterating over **every** pixel in your 2D space and comparing the distance from that pixel to **every** point (or toilets, if you will) in that space. When we find the point closest to the pixel, we assume that the pixel belongs to the polygon with this point, and we color that pixel accordingly.

This approach can be used to easily generate a Voronoi diagram with taxicab distances (i.e., using Manhattan distances). So, to quickly assess the Voronoi map in action, I [implemented](https://github.com/AskePit/VoronoiTestGodot/tree/main) this algorithm directly in GDScript in Godot to interactively explore maps with different metrics. Disregarding all the details, the pure algorithm code looks like this:

```python
for y in range(SIZE):
    for x in range(SIZE):
        var p := Vector2(x, y)
        var min_dist := 9999999.0
        var belonged_site := -1
        
        for site_idx in sites.size():
            var site := sites[site_idx]
            var dist := distance(site, p)
            if dist < min_dist:
                min_dist = dist
                belonged_site = site_idx
        
        var c := sites_colors[belonged_site]
        draw_point(p, c)
```

Below are Voronoi maps for the same set of ten points but built using different metrics.

![Euclidean. Classic Voronoi map](https://habrastorage.org/webt/rz/mh/bk/rzmhbk-btlyfx1ytgpv1ajfvrw0.jpeg)

![Manhattan. Looks as cool as I imagined](https://habrastorage.org/webt/fj/oi/qw/fjoiqwbpphzagpemacn2rpgtnnu.jpeg)

![Chebyshev](https://habrastorage.org/webt/hd/3_/dn/hd3_dn6hhrtaab8msy5eqh9rwag.jpeg)

The Chebyshev map looks similar to the Manhattan map, but there is a tendency towards greater diagonalization of the regions. In my opinion, these are biomes with too specific shapes for our game.

![Map with Minkowski order p=1.5](https://habrastorage.org/webt/bu/xz/6u/buxz6uboovbx6cijlzd0vuu2vh8.jpeg)

In fact, this is an averaging of Euclidean and Manhattan maps. The boundaries cease to consist of straight lines and turn into curves. Such a Voronoi map could be useful, especially if you need stylization with soft rounded contours. Moreover, you can experiment with $p$ to achieve the level of curvature that suits you.

But be cautious! You may end up with something like this:

![p=0.5](https://habrastorage.org/webt/3_/ve/rm/3_vermamrq0ysoreez1gnqv4m8m.jpeg)

So, if we go to a very small order of $p$, space begins to distort significantly, and the map starts to take on a surrealistic weird appearance.

All in all, with such a primitive algorithm, I was able to play around with different types of Voronoi maps much as I wanted. And I’ve just become even more convinced in my desire to use the version with taxicab distances. But maybe we could use the algorithm we just used for our game implementation? Nope. It is not viable and has a number of fatal drawbacks, and it out of our consideration for several reasons:

- **The necessity of discrete space.** The algorithm assumes that our space consists of a finite number of coordinates or pixels. However, this is not always the case. An adequate algorithm should operate with polygons and output, in the end, a list of polygons describing the Voronoi map—thus, we get the boundaries of the regions, and we can then manipulate them as we see fit.
- **Can only fill regions with a solid color.** The algorithm does not draw the boundaries of the Voronoi regions, but just fills the regions with color. As a result, you cannot apply a texture to your regions or procedurally enhance them in any way—only a solid color fill without borders.
- **Speed.** The algorithm has terrible performance: its complexity is $O(n^2)$. And it is necessary to iterate over all existing coordinates in space, which greatly worsens the situation. For example, building a map of size 640x640 takes an average of 3.3 seconds, and 1024x1024—7-8 seconds on a PC designed for professional game development. This is horribly slow for such a primitive colorful picture.

There is another similar but more efficient algorithm called the [Jump Flooding Algorithm](https://en.wikipedia.org/wiki/Jump_flooding_algorithm), but we will not consider it either, as it also colors the map in parts, not building polygons.

# In Search of the Right Algorithm

And then I thought: alright, we just need to take and implement one of the *efficient* Voronoi diagram algorithms—which have a sweet $O(n \log n)$ complexity and yield the set of polygon coordinates as a result. The only trick is to use a Taxicab distance instead of Euclidean one every time we need to calculate the distance, and we a done!

Soon it turned out that this was a very naive plan because any of the algorithms was complex enough and not easy to modify in a desired manner. It wasn't possible to simply take and embed a differently measured distance from point to point. Or sometimes it was possible, but that was not nearly enough.

For example, the algorithm for building a Voronoi map through [Delaunay triangulation](https://en.wikipedia.org/wiki/Delaunay_triangulation) requires drawing circles and then connecting their centers. We connect the centers of the circles—voila, we get the Voronoi diagram. The question is: where are the distances there? Well, um, they are probably somewhere there, but not in such an explicit form as I assumed.

Another example: [Fortune's Algorithm](https://en.wikipedia.org/wiki/Fortune%27s_algorithm) builds the boundaries of the Voronoi polygons with help of parabolas. Parabolas, Carl! Where is the application of the distance function? It is applied there, but for indirect things. My easy-peazy plan will not work here again.

At this point, I felt a bit down because I'm not a good mathematician, and I even don't digest these sweaty algorithms of analytical geometry very well. Not to mention modifying them for a fundamentally different type of distance.

So, I decided to look at ready-made libraries and went to dig GitHub for a solution. Most of them were predictably adapted for regular Euclidean Voronoi maps without the ability to use alternative metrics and build a non-standard Voronoi map. Among them were good high-performance libraries, but I couldn't use them anyway. Maybe I was searching poorly or in a wrong place— I don't know. In the end, I came across the only one project implementing the Manhattan metric Voronoi map but it had a specific algorithm written in JavaScript. And with JavaScript, I had little to do in the paradigm of a Godot project. Such is the sadness.

The more I searched, the more desperate I became. I obsessively roamed through GitHub. I googled some scientific articles, but I just couldn't understand them well. Out of desperation, I went to YouTube in the hope of finding some lecture or popular science video about the Voronoi diagram with the Manhattan metric. I filtered out so much content that ultimately didn't help me, and I was already bewildered.

And then, quite unexpectedly, amid all the variety of dubious YouTube content, I stumbled upon a gem: a [video](https://www.youtube.com/watch?v=L_joQb12QSE) that thoroughly describes the mathematics behind the Voronoi diagram and [Fortune's Algorithm](https://en.wikipedia.org/wiki/Fortune%27s_algorithm) in particular. This video is so amazing that I recommend it to anyone interested in this topic—watch it from the beginning to the end. It clearly explains the nature of the algorithm, with an unexpected transition to 3D space to later return to 2D space and apply what was learned in 3D. It sounds like a cool plot twist. Even now, in the process of writing the article, I realized why I didn't find this video immediately: when I started searching for it the second time, for this article, I spent probably half a day to locate it again. The problem with the video is its title, "How Parabolas Can Help Describe Nature and Business | Fortune's Algorithm [#some2](https://www.youtube.com/hashtag/some2)". Not a word about the Voronoi diagram, only a mention of Fortune's Algorithm at the very end. The author of the video, [Alexa Joy](https://www.youtube.com/@alexajoy8836), has an interesting situation with his channel—only 3 videos and 180 subscribers. The other two videos are not of such scale, which makes it even more surprising that he presented such a good material.

So, in addition to the fact that the video itself turned out to be very fascinating, its [third and final part](https://youtu.be/L_joQb12QSE?t=1316) talks about the Manhattan distance and its application to the Fortune's Algorithm. But first, let's look at the visualization of how this algorithm works with the Euclidean metric:

![Fortune's Algorithm in action](https://habrastorage.org/webt/0h/xb/dk/0hxbdkiccrbi3xbqwqvjrkv7dee.gif)

Following the horizontal line going down, parabolas are drawn in a clever manner, and the intersections of these parabolas outline the boundaries of the Voronoi regions. I won't dive now into the intricacies of the algorithm itself—it seems quite puzzling to me. What interests us is how the author of the video explained in an accessible way that the same parabolas can be used to draw the Voronoi diagram in the Manhattan metric. With only important modification—the parabola will not be Euclidean but represented in Manhattan space.

How is this possible? Let's take a step back. How can we describe what a circle is? Well, it's a curve where all points have the same *distance* to a special point—the center. I am, of course, hinting at the term "distance" in this definition. What if we try to build a shape with the same properties, but where distances are measured in Manhattan space? Wikipedia has an illustrative image of such a figure:

![Circle in taxicab space](https://habrastorage.org/webt/y2/hv/5e/y2hv5efsdpx-5knmsxvtpuhwriy.png)

As you can see, it all depends on the size of the grid, or "city blocks". But if we imagine that the grid is infinitely fine, such a "circle" takes on the outlines of a diamond! Yes, that is a circle in taxicab space. Accordingly, in taxicab geometry, you can get other shapes. For example, a parabola becomes this weird thing:

![Parabola in taxicab space](https://habrastorage.org/webt/o2/c8/ys/o2c8ys5-stpgjg9ksjhnsvzj4_u.jpeg)

$L$ here is not part of the parabola; it is its [directrix](https://en.wikipedia.org/wiki/Directrix). The main property of a parabola is the equality of the *distance* from each point on the curve to the focus $P$ and the *distance* to the directrix $L$. Try taking any point *on the parabola* and measuring its Manhattan distance (remember, it's like how a chess rook moves) first to the focus, then to the horizontal line. It will always be the same. Therefore, this figure is a taxicab space parabola.

Now, let's look at the vivid animation from the video about Fortune's Algorithm, which builds the Voronoi diagram with taxicab parabolas:

![](https://habrastorage.org/webt/n5/0v/u-/n50vu-zsmem-9e5wkxm_a_8rv6s.gif)

Cool! All that remained is to understand how to incorporate this concept into the classical Fortune's Algorithm. But since even the [pseudocode](https://en.wikipedia.org/wiki/Fortune%27s_algorithm#Pseudocode) of the algorithm looks scary, not to mention its actual implementations in code, the task was complex and puzzling.

I tried downloading various libraries implementing the classical Fortune's Algorithm and modifying them according to my new vision. But I did it quite clumsily, I would even say blindly, as I constantly crashed into the jaw-breaking mathematics and the impossibility of understanding how to reorient it on taxicab rails.

To give you a better understanding, why it was so difficult, I'll say that the drifting parabolas in the Fortune's algorithm are just an idea, a concept. The final algorithm itself reworked and modified this concept so much that only some abstract steps remained, which effectively lead to the same result as you see in the gifs I showed above. So, it's not so easy to even find a parabola inside real algorithm's implementation.

You can see my struggles in one of the drafts where I tried to manage non-Euclidean parabolas:

![Difficult](https://habrastorage.org/webt/35/vg/br/35vgbr69pnkrelrkdnzuejzd060.jpeg)

Yes, I spent a lot of time on this.

# The Found Solution

As you understand, in the end, I somehow managed to create the Voronoi diagram I needed. But how I did it will totally disappoint you.

I did not manage to modify the Fortune's Algorithm. Yes, at some point, I abandoned this idea because a lot of time had passed, the game needed to be developed, and I had nothing to show to Ilya. I needed to take action instead of stagnating with something I poorly understood.

So yes, you can just throw away the entire previous chapter. Why did I even make you read it only to disappoint you at the end? Well, there is a reason:

- You experienced my journey and my pain.
- You might have learned as much interesting stuff as I did during this fascinating dive into a dead end.

So, what did I do? As I mentioned earlier, I stumbled upon an [implementation](https://github.com/JDragovich/manhattan-voronoi) of the Voronoi diagram in taxicab space, written in JavaScript. I looked at it for a long time, admired it, ran the project, saw that the code worked. The author even has a [demo page](http://voronoi.joe-dragovich.co.uk.s3-website.eu-west-2.amazonaws.com/) showing the result of his library.

Moreover, the algorithm's code in fact was in one file and consisted of only 800 lines. So, I decided to simply rewrite this code in C++. I had this thought when I first encountered the project, but back then it seemed unworthy. Now I didn't care anymore :) Many thanks to [Joe Dragovich](https://github.com/JDragovich) for his project.

For those who is interested, the algorithm implemented by the project's author is a [smart algorithm](https://www.researchgate.net/publication/220431260_Two-Dimensional_Voronoi_Diagrams_in_the_L) by [D. T. Lee](https://www.semanticscholar.org/author/D.-T.-Lee/1410164694) and [Chak-Kuen Wong](https://www.semanticscholar.org/author/Chak-Kuen-Wong/1723116), which allows you to build a Voronoi map for any metric, including the Chebyshev metric $p=\infty$. The repository's author implemented a special case for taxicab space ($p=1$), simply because, as he said, "This creates cells that have kinked edges and strange protrusions. In short, they just look cool!" My thoughts exactly.

By the way, I tried to read the PDF with the original text of the scientific paper about this algorithm from 1980 and managed to understand almost everything, including all definitions, lemmas, and theorems, until the moment when the description of the algorithm itself began. It became somewhat incomprehensible, which I couldn't grasp. It's a pity, but just a little—because I had a ready implementation of the algorithm that I started rewriting in C++.

Adapting the code to C++ was also an interesting experience from the perspective of the differences between the two languages. The project's author wrote the code in a functional style using `map`, `reduce`, `filter`, `forEach`, and similar constructs. It was interesting to see how such constructions look in modern C++ compared to JavaScript. Also, I had a freedom to use the latest C++ standard available (unlike almost all C++ programmers on their work projects), and I could enjoy the charms of C++20 and its [`std::ranges`](https://en.cppreference.com/w/cpp/ranges) library. Well, enjoy may not be the right word—soon it became clear that ranges in C++ are still raw, and they will remain in such condition for a long time. For example, you cannot replace such JS code:

```javascript
data
.map(...)
.filter(...)
.sort(...)
.filter(...)
```

with a C++ equivalent like:

```cpp
data
| std::views::transform(...)
| std::views::filter(...)
| std::views::sort(...)
| std::views::filter(...)
```

because there is no `std::views::sort` adapter, only [`std::ranges::sort`](https://en.cppreference.com/w/cpp/algorithm/ranges/sort), which does not support piping `|`. Ranges also do not support [`accumulate`](https://en.cppreference.com/w/cpp/algorithm/accumulate) and [`reduce`](https://en.cppreference.com/w/cpp/algorithm/reduce), and transforming a `view` back into a container through `|` is only available in [C++23](https://en.cppreference.com/w/cpp/ranges/to).

Here's another kekw—compare this two code snippets:

JS code:
```javascript
// combine all the merge arrays
let mergeArray = [initialBisector, ...upStrokeArray, ...downStrokeArray];
```

C++ code:
```cpp
// combine all the merge arrays
std::vector<BisectorRef> mergeArray;
mergeArray.reserve(1 + upStrokeArray.size() + downStrokeArray.size());
mergeArray.emplace_back(std::move(initialBisector));
mergeArray.insert(
	mergeArray.end(),
	std::make_move_iterator(upStrokeArray.begin()),
	std::make_move_iterator(upStrokeArray.end())
);
mergeArray.insert(
	mergeArray.end(),
	std::make_move_iterator(downStrokeArray.begin()),
	std::make_move_iterator(downStrokeArray.end())
);
```

Yes, in C++23, [`std::vector::append_range`](https://en.cppreference.com/w/cpp/container/vector/append_range) has arrived, and the code could look nicer with it, but even a C++ enthusiast with untied hands in 2022 could not afford it. You can suggest more readable and shorter variants of this code in the comments, I would appreciate that. The main condition for the suggested code is that there shouldn't be copying anywhere, and there should be minimal memory allocations.

Well, in the meantime, I, once again, come to the sad conclusion that C++, my main working programming language, still cannot be called user-friendly and enjoyable to use. The latest released standards are taking it in a strange direction.

# Integrating Code into Godot

So, the C++ code was written and tested, functioning similarly to the original JavaScript. Now the question is: how to integrate this code into the game engine?

As I mentioned earlier, Godot provides the opportunity to write code in different languages, including C++. This can be done using a technology called [GDNative](https://docs.godotengine.org/en/3.5/tutorials/scripting/gdnative/index.html) in Godot 3 and [GDExtension](https://docs.godotengine.org/en/stable/tutorials/scripting/gdextension/index.html) in Godot 4. The basic principle of operation is the same for both:

- Write C++ classes or functions using [C++ bindings](https://github.com/godotengine/godot-cpp) for the Godot engine.
- Compile to obtain a DLL library.
- When the game or game editor is launched, the DLL library is loaded by the engine.
- Classes and functions written in C++ become available to the scene tree and GDScript.
- Use the interface of these classes and functions in GDScript, and they'll execute fast, performant native code hidden under the hood.

Integrating C++ code didn't pose any particular issues, and the Godot documentation provides good examples of the entire process, so we can just move on further.

# Map Generation

Now one of the key moments comes into scene. Now I had the ability to generate a Voronoi map in taxicab space. The process worked roughly as follows:

- In Godot, I generated a certain number of random points.
- The points and parameters of the 2D canvas were passed to the native code.
- The native code provided me with ready-made polygons for the canvas.
- I just had to draw the polygons on the screen.

Here's what I got in the end:

![Voronoi Map](https://habrastorage.org/webt/3a/a9/q_/3aa9q_npaurtx7-dcyzatiwi4pk.jpeg)

Adding more points generates more polygons:

![More Polygons](https://habrastorage.org/webt/-9/jy/0p/-9jy0prcbqgpanh5nhjtpq9ryq0.jpeg)

You can imagine that this is a huge world map divided into multiple biomes. By the way, I got an idea of how to implement stylized roads running across the entire map: generate another Voronoi map with a small number of regions and overlay it on the main level map. Here's how it could look:

![Overlayed Voronoi Map](https://habrastorage.org/webt/-l/mq/qy/-lmqqyu9dxp0g1xk5il9r-nlstk.jpeg)

We overlaid a green Voronoi map with three regions on top of the main biome Voronoi map. You can imagine that the entire map is walkable, and the green lines represent the main well-trodden paths, that provide speed bonuses or lead us to key points of interest on the map.

At this point, everything still looks schematic and not much like a game map. It's time to clean up unnecessary elements and add various decorations. It's worth noting that during these modifications, the Voronoi map will lose its properties, but for our purposes, it doesn't matter. The Voronoi map was only needed for the initial generation of our beautiful polygons. After that, we are free to do whatever we want with these polygons.

What bothers us in the current version of the map:

- The map is rectangular. Instead we want an island with irregular edges.
- We want to differentiate the biomes, at least with colors, and preferably with textures.

The simplest way to turn a square map into an island is to remove all the outer biomes that formed the perimeter of the map. Then the remaining biomes will form the silhouette of the island with irregular edges. Let's stick to this method for now. Each biome will be colored with a random color, resulting in the following picture:

![Colored Biomes](https://habrastorage.org/webt/2n/fj/k3/2nfjk3zo9jhpe6lumahnodjs8j8.jpeg)

It looks like an island indeed. However, the roads are broken. Even if we ignore the fact that the roads are now floating in the air (we can algorithmically deal with this), we encounter logistical and common-sense problems. Look, for example, at the khaki-colored peninsula in the upper right corner of the map. Do you see that small piece of the road, unconnected to other paths on the map (imagine that we have already eliminated road sections hanging in the air), starting at the edge and immediately ends? This is the reveal of the unstable nature of *random*.

We decided to temporarily set aside the road issue with Ilya and focus exclusively on the biomes and refining them to a more complete state. But for the future, I prepared a completely different road generation algorithm that would take information about points of interest/attraction on the map and build a sophisticated road graph in such a way that points of interest either sit on the road or the road passes directly through them. However, this, in turn, requires generating points of interest on the map, which is a different story... As you can see, one thing leads to another, and it can turn into an endless narrative. This is precisely why we've decided to finish with the biomes first and not to spread ourselves thin.

# Creating Game Biomes

Our plan for the game world was ambitious:

- We needed to create 4 different types of maps: forest, dungeons, infernal rift, and mountainous terrain.
- Each map would be divided into biomes, with 3-4 variations of biomes on each map.
- Each biome would have its own set of items and props. For example, a forest biome on a forest map should have many trees and mushrooms; while on a rocky biome, you might randomly find a sword stuck in the ground.

Ilya drew concepts showing how each map should ideally look:

![Concepts](https://habrastorage.org/webt/eb/ft/cn/ebftcn1_3foiqlfty42koryfrzg.png)

Here's a closer look at the forest map so you can see the details:

![Forest Map](https://habrastorage.org/webt/6q/bt/ea/6qbteacoo6f8jusxbimjcdy49ck.jpeg)

This was the reference I had to aim for. While generating everything randomly, it would be impossible to achieve an exact match in terms of the harmony of composition and artistic subtleties, but I could try to get close to this image.

I was provided with textures for each biome type, as well as some items to scatter on the map. I was blessed and given the green light, so I started transforming schematic polygons into beautiful biomes.

While waiting for the necessary artistic assets, I managed to integrate the game's polygonal level with our character, whom I simply transferred from our side-scrolling prototype level. I removed gravity and jumping, taught the character to move not only left and right but also up and down, and the character started to cheerfully walk over the polygons.

Then, instead of a solid color fill, I applied textures from Ilya onto the polygons, and the image started to take on a more game-like appearance:

![Textured Biomes](https://habrastorage.org/webt/zs/65/85/zs6585ltoa1qongul1azct-fsbw.jpeg)

The lifeless polygons immediately felt like earth with grass and soil—a magical transformation.

Notice the rough borders of the biomes. I wrote a shader that draws a blobby thing and applied it to the lines of the polygons. In Godot, you can apply a shader to any visible object on the scene—it's very convenient.

In addition to textures, I had items for different maps that needed to be randomly scattered throughout the world. Ilya's instructions were like, "*Well, on the grassy biome, we need to generate trees and mushrooms, and on the rocky one, you might randomly encounter a sword stuck in the ground.*" Okay, let's scatter them around; it sounds simple and harmless, doesn't it? I implemented a primitive algorithm that generated some quantity of something in random places within each polygon, depending on the biome type. This is what the forest biome looked like:

![Forest Biome](https://habrastorage.org/webt/jk/yn/af/jkynafomlz-wdjcifxzrkupg3wa.png)

Hmm, okay, a bit too many swords and stone heads, but overall, it's fine, and the picture looks lively. However, if lots of trees and mushrooms look good, things were sadder on other levels. Here, for example, is the dungeon map at that time:

![Dungeon Map](https://habrastorage.org/webt/fb/cx/qe/fbcxqe8cktwgitmtisoigtqzzww.jpeg)

When Ilya saw this, he was like:

![Ilya's Reaction](https://habrastorage.org/webt/w7/dd/1b/w7dd1bxy3ebuutf40gda_dhsiki.jpeg)

Well, I personally did nothing; it's just *random*. Even when Ilya was strongly urging me to abruptly change course towards a generated map with biomes, I was already wary of such problems at that time and even tried to warn Ilya. Because it could turn out that a significant part of development would go towards dealing with overly random randomness that's hard to control. But to understand how cool random is, you need to see it with your own eyes and feel all the inconveniences on your own skin.

We will win the random, but later. For now, we decided to dive deeper into the visual details of the biomes.

# Perfecting the Visuals of Biomes

Ilya gave me an intermediate instruction—achieve a map that looks like this:

![Desired Map](https://habrastorage.org/webt/hn/q7/gd/hnq7gdjuun2eatfly6cxmy17ws8.png)

The list of requirements included:

- The borders between biomes should look as if covered with colorful grass strands.
- The island's perimeter should have a special border.
- The island should have a "thickness" in the form of a stylized downward slope.
- Adjacent biomes should not be identical—there shouldn't be two grassy biomes neighboring each other with a strange useless border. You can refer back to the dreadful screenshot of the dungeon map I showed earlier to see how two tile-like biomes neighbor each other—it looks wrong and unnatural.
- The random placement of objects on the map should be "normal" and visually pleasing.
- I'll jump ahead and mention another problem that surfaced during the process, requiring a solution: sometimes, the Voronoi diagram generated polygons with extremely short edges, meaning two neighboring points of a polygon were so close that the distance between them approached just a few pixels. This resulted in unpleasant visual artifacts, which I'll show later. I'll just say for now that these points needed to be somehow fixed—either by removing one of the points or by somehow turning two points into one.

In general, there was quite a list. Individually, those tasks introduced small visual changes to the biomes, but together, they made a significant difference between a set of flat polygons with stretched textures and a harmoniously perceived map with biomes.

Let's go through each of these tasks.

## Borders Between Biomes

Ilya provided me with an image of a grass strand:

![Grass Strand](https://habrastorage.org/webt/gl/wl/c8/glwlc8joqcfsaso-f0qrawqrm4k.png)

and asked me to make sure all biome junctions were covered with it. Each strand should have a slightly different color and a random rotation. This wasn't difficult—I just needed to write a new shader and perform the mentioned manipulations with the strand. When applying the shader to the border, the shader tiles its execution along the entire length of the line, resulting in the following picture:

![Biome Borders](https://habrastorage.org/webt/lj/lr/vn/ljlrvnlijdcxjywdiu6x5nyz3-a.png)

Dealing with biome junctions is an extensive topic, where various solutions of different complexity can be used. However, we won't dive into that topic.

## Island Perimeter

Or, to be more precise, the perimeters of *islands*, since how we de-squared the world map has its consequences. As a reminder, we get an island-like silhouette by removing edge and corner biomes. Meanwhile, the generated Voronoi diagram may have such a tricky configuration of biomes that when we remove unnecessary polygons, we get not one island but two or more. For example:

![Main Island and Smaller Island](https://habrastorage.org/webt/09/lv/wr/09lvwrxmvrk4jc-6gqp9rnhaloo.png)

We didn't decide what to do with these detached islands in the future, so they remained in the game.

The algorithm for finding islands is straightforward: we iterate through all biome polygons and try to merge them with neighbors. We keep merging until we're left with a set of large polygons that have no neighbors, and there's nothing left to merge them with. These are our final islands. We just need to outline their perimeters with a stylized stripe, and the task is done.

## Thickness Slice

This one turned out to be quite straightforward, mainly because of my laziness. Look at how it looks in theory:

![Thickness Slice](https://habrastorage.org/webt/u4/-h/3h/u4-h3hw2jzopzkjcqjc1tn1gl1y.png)

The bold lines represent the world map, the solid thin lines represent the visible thickness slice, and the dashed thin lines represent the invisible thickness slice. The slice consists of quadrilaterals constructed as follows:

- From two neighboring points on the map perimeter, we draw vertical segments downward with a constant height $h$.
- We connect these vertical segments with two more segments to form a quadrilateral.

Of course, we only want to draw the visible parts of the slice, and we don't want to draw the invisible parts. L — logic. I wanted to come up with an algorithm that would calculate the intersection of the map polygon with the slice polygons to determine whether a specific segment of the slice needed to be drawn or if it was invisible. However, during the enumeration of different map forms, I quickly encountered difficult cases:

![Ambiguous Case](https://habrastorage.org/webt/ev/x1/2a/evx12ajgy0sbibertahpxk2tank.png)

Here, look at how the red segment of the slice should be *partially* drawn because it is half-hidden behind the map and half-visible. I really didn't want to calculate all this tedious stuff, so I decided to go for the dumb and easy solution: I draw *all* slice primitives within the engine, but by placing them on a z-layer behind the map, so more than a half of the slice polygons are simply hiding from our eyes. But they still *exist* and probably consume some negligible game resources.

Here's how the result turned out when looking at the map from a zoomed-out view:

![Map with Thickness](https://habrastorage.org/webt/co/7x/zc/co7xzcgtqdgvmysbffa1gs5gzmo.png)

The world map now resembles a carved board, which both I and Ilya quite liked.

## Point Manipulations

I've already mentioned the issue with points being too close on the map. They caused unpleasant things, as illustrated below:

![Close Points](https://habrastorage.org/webt/34/ff/cy/34ffcyv36wpvp-kudxj9jqwlp7g.jpeg)

While these points might not be critical within the map, they noticeably affect the thickness slice.

What can we do about this? We need to move or remove undesired points from the polygons. While this may sound harmless at first glance, careful consideration reveals that actually it's a gateway to the hell of tricky algorithms.

Expressing further thought won't be easy, so let's periodically look at these esoteric diagrams:

![Esoteric Diagrams](https://habrastorage.org/webt/5n/gj/tj/5ngjtjxsnkgneqevdidbidzf2ru.png)

So, diagram $a$ shows a map with five polygons. It's not necessarily a Voronoi map, or more likely, it's *not* a Voronoi map, but that doesn't matter—we can forget about the Voronoi map for the rest of the article. Now we are dealing purely with polygons which:

- Are neighbors. They "stick" together, forming a seamless space filled with biomes.
- **Cannot** have gaps between neighboring polygons; otherwise, it's not a map but rather a mess. You can look at diagram $d$ to understand what I mean: the dark area represents the forbidden gap in space. Well, if we want, we can later create these holes in the map intentionally, but not for now—at this stage, gaping holes in space should not be present.

Now, let's imagine that we want to move one of the points on the map, as shown in $b$. Remember that in our memory, the map is represented as a collection of independent polygons. Some polygons share edges—completely or partially, some polygons share points. However, each polygon is described in isolation and is self-sufficient. In diagram $c$, we slightly spread out all polygons in space to clearly see all their edges.

Also, in diagram $c$, it becomes apparent that we can't just take and move one point of a specific polygon and consider the task done. Otherwise, we inevitably end up with diagram $d$, where the map is broken. The point was moved for the polygon 1, but the same point was shared with the polygon 2, and it also needed to be moved. So, if we carefully keep track of common points and move them all together, will the problem be solved? *No.* This is clearly seen with polygon 5. While it technically does not have the same point, the point we want to move lies *on one of the edges* of polygon 5. Therefore, polygon 5 implicitly contains this point.

And that's a problem. How do we move a point that *doesn't exist* on a polygon? It needs to be created, and then everything needs to be moved together. The task becomes quite tough. Moreover, this is just one specific task with points on the map. What if we need to delete points or edges of polygons on the map or smartly move the boundaries of one biome? All these tasks will go through the same pain and all that dances around damned points.

After much thinking, I came up with idea: what if we deviate from the concept of a polygons set and turn the entire map into a graph? So that there is a unified space with points and edges, as in diagram $e$, and there is no polygon neighbors anymore. The idea sounded good for the task with points, but bad for everything else: polygons were much more suitable for drawing the map. Besides, the map in Godot was drawn as a set of polygons onto which a texture was applied.

It became clear that it's more profitable to have *both representations* of the map simultaneously: as a set of polygons and as a graph. In C++, I created a class that represents the given map as a graph and allows some manipulations with it. And then, when all desired manipulations are performed, it enables creating a new fresh polygonal representation of the map for a further use in an engine.

This way, I was able to obtain diagram $e$ and move points as I desired. For example, turning diagram $e$ into diagram $f$. Let's take a closer look at $f$: the diagram has colored points. Red points are redundant. Removing them from the graph won't change anything. So, we remove them—redundant information is not needed. Green points, on the other hand, are kinda strange—they are needed by polygons 1, 2, 3, and 4 but are redundant for the polygon 5. Therefore, when converting the graph back into polygons, we should remove them, but only from polygon 5. But they are needed in the graph representation, so they stay there untouched. Finally, when we convert the graph back to polygons, we arrive at the final result in diagram $h$.

The point is moved, there are no gaps, everything is in place. Moreover, we can always turn the map back into a graph, modify it somehow, and then reassemble the map into new modified polygons. So the approach turned out to be flexible and good, and our problem—close points—disappeared as an issue after I easily eliminated them in the graph representation of the map:

![Final Result](https://habrastorage.org/webt/zm/wi/n9/zmwin95p7bh_lpl8zsmifgawi4i.jpeg)

## Biomes Coloring

We had to merge adjacent polygons if they belonged to the same biome type. In principle, the procedure is not complicated: you remove the neighboring border of two polygons and merge them into one large polygon.

However, I didn't want to merge anything unnecessarily because it comes with risks. Initially, I randomly assigned each polygon a certain biome type. Often, the *unpredictable randomness* clustered large areas of the same biome together, and after merging, you could observe how vast areas of the map became homogeneous behemoth biomes:

![Random Biomes](https://habrastorage.org/webt/z9/ex/kn/z9exkn8afxedg-qoyfjz1ueat1o.png)

It killed the fun, broke the map's ecosystem, and spoiled its aesthetics and appearance. It was necessary to distribute biome types to polygons in a more neat way.

Essentially, it all boiled down to the problem of [map coloring](https://en.wikipedia.org/wiki/Four_color_theorem). However, the four-color theorem makes it clear that, in general, you can't color a map with *three* colors in such a way that neighbors are unique. It requires at least four colors or more. Thus, our maps with 3-5 types of biomes had no opportunity for a foolproof and sensible coloring. All that was left was to try and color the map with as much diversity among neighbors as it really possible within circumstances.

I asked for help from ChatGPT for an appropriate algorithm. It suggested a simple and straightforward solution based on a heuristic like:

- Color ourselves.
- Color uncolored neighbors, trying not to repeat biomes.
- If, at some point, we get stuck and neighbors are duplicated, we can try to roll back one step and assign a different color to the previous polygon, then attempt to recolor all its neighbors.
- If desired, the number of rollbacks can be increased if you can afford to store more temporary information.
- Repeat until finished.

ChatGPT has provided me with code, which seemed to work, which is generally not guaranteed with ChatGPT—it was quite the little win. Of course, sometimes the map ended up with identical neighbors. In that case, we simply had to merge them, but these were isolated cases that did not harm the overall appearance of the generated map.

## Normal Random

Here is where the real "fun" begins because the concept of "normal random" is vague and subject to discussion. I wanted more precise formulations from Ilya—something expressed in exact numbers. However, it wasn't simple because while we might have a rough mental image of how trees should be placed on the edge of a forest, translating that into numerical parameters isn't straightforward.

We settled on creating tables for each map that described the distribution of items in each biome. For example, here's a table for a forest map:
![[Screenshot 2024-04-24 124126.png]]

Yes, it's in layman's terms, vague, without formulas or an abundance of numbers, but it was a starting point. With this information, I found it easier to come up with ways to generate various items according to my preferences and understanding.

I won't force you to scrutinize the table seriously and understand every detail. For our further discussion, it's enough to know that the distribution of items on the map is divided into two fundamentally different approaches:

- **Individual items generation.** A certain quantity of items should be generated for the entire biome (sometimes even for the entire map), sometimes within an acceptable range, and sometimes with specific individual conditions. For example, generating one sword stuck in the ground for the entire map with a 50% chance of appearing in either the stone or earth biome.
- **Item clusters generation.** This concerns the density of item distribution on a biome and the nature of this distribution.

While the first type of generation is straightforward—you just take and generate items according to the rules dictated by the item—generating the second type of items was unclear for me. I had to thinking hard again.

We will consider cluster generation using forest as an example, as it is the most illustrative example. If we master the generation of forests, groves, and clearings with different characteristics, we essentially master cluster generation thoroughly, as a realistically (to the extent possible in a stylized 2D game) generated forest is, in my opinion, the most visually demanding stuff.

The first thing that comes to mind for anyone who has ever developed games is [Perlin noise](https://en.wikipedia.org/wiki/Perlin_noise). It is used to generate various random 2D elements that look natural and smooth: clouds, special effects, patterns, and even entire maps and islands. While Perlin noise was not useful for the main map generation, as we saw, due to our fundamentally different approach with Voronoi, Manhattan, and the like, it is quite useful for generating forests.

Perlin noise looks like a blurry ink blot in shades of gray:

![Perlin Noise](https://habrastorage.org/webt/m4/1o/2j/m41o2j-nrqz9dc_-gud40ks-4eq.png)

Perlin noise is an infinite canvas in 2D space. The image above shows only a small part of it. This infinite image is sufficient to cover the entire map if necessary. The nature of the noise can look entirely different if generated with different parameters.

Let's say that absolutely black on this image is 0.0, and absolutely white is 1.0. Other pixels of the image lie in the range (0.0; 1.0). A typical way to work with these numbers is to turn this noise image into binary black-and-white, introducing a threshold and turning each pixel of Perlin noise into 0.0 where the noise value is below the threshold, and into 1.0 where the value is above or equal to the threshold. The image below shows binary versions of the previously shown Perlin noise with different threshold values:

![Applying Different Thresholds to Perlin Noise](https://habrastorage.org/webt/fj/un/yi/fjunyiwjb5eoyhr9evwgh4c9bzg.png)

Now, imagine that where it's white, there should be a forest trees. At a threshold of 0.75, this would resemble rare clusters of tree groupings, while at 0.25, it would become an impassable forest with some rare clear spots.

Sounds good, but there's a problem. In areas where it's white, where there should be a forest, how frequently should trees be planted? Definitely not with a density of one pixel, right? That would be absurd. I assure you in that, as a person who decided to perform a quick experiment and scatter trees based on the noise with a density of 10 pixels (not even 1!), just for fun. Just wait for ten damned minutes on a powerful PC with 60 GB of RAM occupied by the game process, and one biome with hyper-dense planting is ready to use:

![OMG](https://habrastorage.org/webt/vl/b_/c_/vlb_c_iy0wg0exfpufyc5-ak3ka.png)

Ugly, slow, expensive, and meaningless. What to do then? There is a feeling that the noise doesn't provide all the information on how to carry out scattering. The capabilities of Perlin noise end here. The density of planting needs to be adjusted and calculated with additional solution.

I needed a way to do what some game engines allow artists to do—[paint objects onto terrain](https://docs.unrealengine.com/4.27/en-US/BuildingWorlds/Foliage/). You create a brushstroke, and objects are scattered on the terrain with a specified density. In my case I didn't need a brush, but I needed the principle itself.

I went back to ChatGPT for advice, and it told me that if I needed to place objects seemingly randomly but with uniform density, with each object spaced approximately equally from others, then the Bridson algorithm would suit me. This algorithm is a variation of the well-known Poisson disk sampling algorithm. You can read about both algorithms in [this excellent article](https://sighack.com/post/poisson-disk-sampling-bridsons-algorithm).

In the end, I achieved a symbiosis of a Perlin noise, which determined the geometry and planting pattern, and the Bridson algorithm, which regulated the density of this planting.

You can play with the settings of this mechanism endlessly; it is very flexible and produces completely different results.

![Forest with medium density, forming an arch path](https://habrastorage.org/webt/4c/7s/6g/4c7s6gnght2bp8rdui0szcoz8-i.png)

![Small dense clusters](https://habrastorage.org/webt/h3/2w/mh/h32wmhk-vz9gsp_cejci2k2cjnm.jpeg)

![Hyper-dense clusters](https://habrastorage.org/webt/vq/u4/8u/vqu48uox1ylzxqxcjlduol9ov-4.jpeg)

![Evenly sparse forest](https://habrastorage.org/webt/e6/y1/yh/e6y1yhxngazdujrgt1htm5jl1qg.jpeg)

And here's how we configured the distribution of trees and spikes on the mountain map—rare clusters of trees in bunches:

![Scattering on a mountain map](https://habrastorage.org/webt/bb/86/ji/bb86jiktlrdf75nj5nmk3gvtvwc.png)

# What Happened Next

We had many plans ahead: map modifications, additional features. However, we decided to take a break and dig into other mechanics: inventory, crafting systems, and more.

After some time, we realized that we took on too much and found it challenging and uninteresting. We were stuck in this project, and it began to feel like a second job, demanding a lot of time and providing minimal enjoyment. Therefore, we decided not to continue. Instead, we started working on another game, but that's a different story.

That's how the article unexpectedly ends, unfortunately. Maybe the day will come, and we will return back to the project with fresh strengths and ideas.

# Algorithms Recap

Let's retrospect through all the steps to obtain our map with biomes. If you are reading this article because you are working on something similar and came here for ideas, this section will help you gather all the information dumped on you in the article.

On the Godot side:
- Set global map parameters: desired size, approximate number of biomes, types of biomes to be present on the map.
- Generate random points across the entire expected map area.

Then, with the points in hand, we dive into C++ code, where we perform computationally expensive calculations for generating map polygons.

In C++:
- Based on points, create the Voronoi map.
- Obtain a list of polygons from the Voronoi map.
- Create a graph from the points for intermediate optimizations.
- Remove points that are too close on the graph.
- Transform the graph back into polygons.
- Calculate neighbors for each polygon.
- Assign a biome type to each polygon, trying to minimize the neighbouring of identical biomes.
- Merge polygons with identical biomes that are neighbors.

The resulting set of polygons is returned to GDScript, where we handle their visual representation.

Back to Godot:
- Render each polygon, texture it according to its biome type.
- Render polygon borders with a shader featuring grass.
- Identify all islands on the map.
- For islands, find their perimeter and draw each perimeter with a thick line.
- Render a thickness slice for each island.
- Generate collision for each island so the character cannot go beyond its boundaries.
- Populate each biome with foliage according to your density tables. Here, I must mention that for the points distribution using the Bridson algorithm, we again dive into C++ code to calculate the distribution.

As a bonus and a tribute to the project, let's return to my drafts as an evidence of my hard work:

![It's hard 2](https://habrastorage.org/webt/j9/aq/9s/j9aq9s1na_gj-a3g0ikzvmnxypc.jpeg)

# Performance

What about performance?—you may ask. Actually, it's very, very good. Here's a gif at the original playback speed:

![](https://habrastorage.org/webt/fz/5p/d7/fz5pd72yqsbfyudflhum4ylzscg.gif)

The generated world has average dimensions of 20,000 by 20,000 pixels, and it is generated from scratch in an instant with a single button press. In the gif, I just repeatedly press the spacebar—faster and faster. If I wrote all the code in GDScript, I assure you the results would be much, much worse.

# Conclusions

Why was this article written at all?

I think our experience could be helpful to someone—to those who just want to start making a game, those who have already begun it and are looking info towards random map generation or something alike. In the end, to those who want to know what tasks a programmer might face, what difficulties might arise, and how to solve or avoid them.

To some extent, the article was needed for myself as well—to refresh, structure, and rethink the experience, code, and algorithms gained during development, which will undoubtedly be useful to me in the future.

Once again, it emphasizes a well-known truth—even the simplest indie game is hard. A game with random generation is hard squared. Making games is not always fun. But in the process of their development, you gain experience that you can't get anywhere else. Even if the project fades or fails, your experience remains with you, and in the future, you can apply it to projects that lie ahead. Or write a retrospective article, as I did.