---
tags:
  - article
  - cpp
title: C++ object lifetimes iceberg
url-title: cpp_object_lifetimes_iceberg
description: Questionable places seemed like separate, unrelated cases - am I using reinterpret_cast correctly, will the destructor be called, do I need std::launder, how legal are various low-level memory tricks? Only after I started making some tentative attempts to figure things out did I realize - all of this revolves around object lifetime - a vast topic that hardly anyone can explain properly - and if I cover this area thoroughly, I'll get the key to C++.
keywords:
  - c++
  - c++23
  - lifetime
  - provenance
image: https://habrastorage.org/webt/97/db/7e/97db7ea8c590872ab0bbc1463eac8518.png
date: 02.10.2026
---

![](https://habrastorage.org/webt/97/db/7e/97db7ea8c590872ab0bbc1463eac8518.png)

---

You need this article if you don't know enough to answer these questions:

- What's the difference between a `new expression` and `operator new`?
- What is `placement new`, what is its syntax, and does it allocate memory?
- When and why might we need to call a destructor manually?
- When should you use `std::launder`?
- Why can some types be copied with `memcpy` and then used immediately, while doing the same for other types results in UB?
- What can you actually cast with `reinterpret_cast`?
- Why is the C++ standard so confusing and inhumane?

---

The motivation for writing such long articles can be rather peculiar. I, for example, was sitting and writing a completely different article: [How to write your own `std::function`](https://habr.com/ru/articles/1088580/). And at some point I caught myself realizing that I wasn't completely sure I could honestly defend some parts of the code in front of the reader.

And sure, everything worked, and the compiler was giving me a working solution, but I was haunted by a feeling that has visited me more than once while writing C++ code: "I don't know whether my C++ is _canonical_." And internally, you kind of understand that everything is fine, but in reality, you've never even looked into the standard yourself to know for sure. At some point, I started doubting many of my own knowledge and practices, all the way to paranoia.

What's interesting is that all the questionable places seemed like separate, unrelated cases: am I using `reinterpret_cast` correctly, will the destructor be called, do I need `std::launder`, how legal are various low-level memory tricks? Only after I started making some tentative attempts to figure things out did I realize: all of this revolves around **object lifetime** - a vast topic that hardly anyone can explain properly - and if I cover this area thoroughly, **I'll get the key to C++**.

Getting that key is difficult - hence the difficult article. But you can do it.

# C

For a warm-up, let's start with the C language. In C, creating an object of type `T` means allocating enough memory through `malloc` and then interpreting it as a pointer to `T`. That's it - go ahead and use the object. Destruction works the same way: call `free`, and the object is gone. That's what we're talking about on the heap. With the stack, you don't even need these acrobatics.

The main idea I want to establish here is that, from the language's point of view, an object is ready for immediate use as soon as enough bytes have been allocated for it.

```c
struct Point { int x; int y; };

struct Point* p = malloc(sizeof(*p));

// that's it - we can use it!
p->x = 10;
```

`malloc` returns a `void*` - just raw bytes. You cast them to `Point*` yourself and immediately start using the object. And everything will be fine as long as you've allocated enough memory for the object.

Of course, your objects can have logic that makes it impossible to use the object without some prior manual initialization. For example, to establish the necessary invariants. But that's no longer a story about the language - it's about the business logic of your classes.

# C++: new and delete

Now C++. Here, objects are created _in two phases_: first, memory is allocated for the object, then the object's constructor is called. Destruction works similarly, but in reverse order: first the destructor is called, then the memory is released. The standard doesn't have clear terminology for naming the two-phase combinations as a whole, so I'll introduce my own terminology, which will be used throughout the article:

> Object creation = memory allocation + object construction  
> Object deletion = object destruction + memory deallocation

In English:

> Object creation = memory allocation + object construction  
> Object deletion = object destruction + memory deallocation

I consider this terminology useful because it immediately makes it clear at which point in time the constructor and destructor do their work.

The familiar `new` and `delete` are actually called `new expression` and `delete expression` - this is important because there are _other_ `new` and `delete` operations, and they perform _both_ phases of creation/destruction at once. In other words, they handle the system memory allocator for you and call the constructor/destructor themselves.

We use a `new expression` to create an object:

![](https://habrastorage.org/webt/6c/02/bd/6c02bd196ff5197c4ba434052d4ea5e2.png)

We use a `delete expression` to delete an object:

![](https://habrastorage.org/webt/af/6c/57/af6c5773c391f7203b1fdba3385b1034.png)

Since these are the most common ways to create an object on the heap, and they neatly abstract away the aforementioned "two-phase" process, many programmers, myself included, can go for years without realizing that this two-phase nature even exists. And yet it does, and it starts becoming explicit wherever allocators, in-place storage optimizations, `std::shared_ptr` control blocks, and so on live. This is where an unprepared programmer's mental model starts falling apart, leading to the classic "I've been learning C++ forever, and it's still bottomless."

# Manual object lifetime management

If you want to perform both phases of object creation yourself, you:

- Allocate memory for the object
- Construct the object at the address obtained from the first phase

![](https://habrastorage.org/webt/98/a2/b9/98a2b9fd29bfecc96d3e21d48c280fef.png)

In the diagram above, the memory was allocated through `operator new` - note that this is not a `new expression` - it's a different beast, related to `malloc`: it returns raw bytes. But you can also allocate memory for an object in other ways: use your own allocator, take a chunk of space from static storage, or even from the stack, as is done in SSO optimizations.

Now, how do we construct an object in memory that was allocated earlier? Essentially, we want to call the object's constructor, but do so at a specific, predetermined address. We can't do that with something simple like `Point p(10, 15);` - we need specialized tools here. As far as I can tell, before C++20 the only way to do this was and remains `placement new`. Starting with C++20, you can and should use [`std::construct_at`](https://en.cppreference.com/cpp/memory/construct_at) - this function shields you from the frankly ugly syntax of `placement new`, and also expresses the intent more explicitly; that is, `std::construct_at` is more convenient both for the person writing the code and for the person reading it. The function doesn't do anything special - it simply sweeps the `placement new` call under the rug.

---

For two-phase object destruction, you:

- Destroy the object. We want its destructor to run
- Release the memory

![](https://habrastorage.org/webt/06/4e/73/064e7351c740d909c5eec37d373348bd.png)

The object destruction phase. This is that rare case where the destructor is called manually. Starting with C++17, you can do the same thing through the [`std::destroy_at`](https://en.cppreference.com/cpp/memory/destroy_at) function, which forms a symmetrical pair with `std::construct_at` and has the same advantages. Under the hood, it's still just a manual destructor call.

And now we've reached the point where the memory is released. This is the reverse of allocation - your options include `operator delete` or, for example, returning the memory to your allocator. If the memory wasn't allocated from the heap, you probably don't need to do anything at all - that memory will take care of itself. The important point is that, in the overwhelming majority of cases, deallocation must happen through the same source from which the allocation came. In other words, if you obtained memory through `::operator new`, return it through `::operator delete`; if through `malloc`, return it through `free`; if you got it from your own allocator, return it to that same allocator.

It's worth noting that there are cases where releasing memory isn't completely symmetrical with obtaining it. For example, [this article about allocators](https://habr.com/ru/articles/876804/) describes a very simple and efficient Linear allocator that hands out memory on request but cannot free the memory of an individual object - it can only release all of its memory at once through a separate `reset` method. For example, throughout a game frame, we can use it to allocate memory for objects and then release the entire pool at the end of the frame. But this is, of course, an uncommon approach - normally, deallocation is symmetrical with allocation.

# How C++ objects differ from C objects

Let's look at object creation and destruction using an ordinary C++ class as an example:

```cpp
struct Foo
{
	const char* name;

	Foo(const char* name_) : name(name_) {
		std::cout << name << ": start\n";
	}

	~Foo() {
		std::cout << name << ": die\n";
	}
};
```

How does `Foo` differ from any C structure? In the context of our discussion, the fact that an object of this type:

- Cannot be default-constructed, meaning that some information must be provided to create it. `Foo` has no default constructor - only a constructor that takes a parameter. Moreover, the constructor performs some logic itself, meaning it _must be called_ for the program to work correctly
- Cannot be implicitly destroyed - the destructor must be called because it also contains some logic

In other words, we can no longer get away with the C approach, where allocating memory was enough for the object to be implicitly created:

```cpp
Foo* t = static_cast<Foo*>(malloc(sizeof(Foo))); // 1
t->name = "foo"; // 2
free(t);         // 3
```

- <sup>1</sup> I want it to work like C
- <sup>2</sup> UB - the object hasn't been constructed; no logging occurred
- <sup>3</sup> the object wasn't destroyed; no logging occurred

We can't do this, at least because `Foo` contains logic in its constructor and destructor. In the case of `Foo`, that's its only logic, since this is a classic example of an RAII class. The explicit stages of object construction and destruction are _mandatory_. Our test structure merely logs the stages of its lifetime to a stream, but classes can rely on much more serious logic in their constructors and destructors, and without that logic being executed, the program may simply stop functioning correctly:

```cpp
struct MutexGuard
{
    std::mutex& m;

    MutexGuard(std::mutex& m_) : m(m_) {
        m.lock();
    }

    ~MutexGuard() {
        m.unlock();
    }
};

struct Timer
{
    using Clock = std::chrono::steady_clock;

    std::ostream& s;
    Clock::time_point start;

    Timer(std::ostream& s_) : s(s_) {
        start = Clock::now();
    }

    ~Timer() {
        s << Clock::now() - start;
    }
};
```

Let's look at the correct ways to handle the lifetime of `Foo foo`. The simplest and most common scenario is creating an object on the stack:

```cpp
{
Foo foo("foo"); // 1
...
}               // 2
```

- <sup>1</sup> create the object: allocate memory on the stack + construct
- <sup>2</sup> delete the object: destroy it + release the space on the stack

It's impossible to make a mistake here and shoot yourself in the foot. Both the constructor and destructor will be called, so the class will be created and destroyed correctly. And notice that you will be forced to pass all the required parameters to the constructor, because the class has no default constructor, and attempting to write `Foo foo;` will result in a syntax error.

Now let's allocate on the heap using the standard `new` and `delete`:

```cpp
Foo* foo = new Foo("foo"); // 1

delete foo;                // 2
```

- <sup>1</sup> create the object: allocate memory on the heap + construct
- <sup>2</sup> delete the object: destroy + deallocate

This is exactly the same as what happens on the stack, except that the memory is now allocated on the heap, and object deletion is triggered explicitly through `delete` rather than automatically when leaving the scope.

Now let's try allocating memory and constructing the object ourselves. For example, imagine that `new/delete expression` doesn't suit us because we specifically want to allocate memory through `malloc/free`:

```cpp
Foo* t = static_cast<Foo*>(malloc(sizeof(Foo))); // 1
new (t) Foo("foo"); // 2

t->~Foo();          // 3
free(t);            // 4
```

- <sup>1</sup> allocate memory
- <sup>2</sup> construct the object
- <sup>3</sup> destroy the object
- <sup>4</sup> release the memory

This is an improved version of the "C-style" example, but one that works correctly in C++.

# Память vs объект

Now I want to show you some examples that will make it clear that it _may be completely unclear_ what is supposed to happen if you don't know for sure how things work. That object lifetime and the memory in which an object lives are very tricky and complex things in C++. It's perfectly fine if you don't see any logic or consistency in what's happening here - I'd even say that's normal.

First example:

```cpp
Foo* t = static_cast<Foo*>(malloc(sizeof(Foo)));
new (t) Foo("foo"); // ┓
                    // ┃ 1
t->~Foo();          // ┛
free(t);
```

The object's lifetime is marked as 1. Outside this range, the object doesn't exist - there is only memory allocated for it.

---

Now let's look at a more interesting example - declare a variable on the stack:

```cpp
double d = 15.0;
```

We've already established that this line simultaneously allocates 8 bytes for `d` and "breathes life" into that memory.

Now let's do this:

```cpp
double d = 15.0;
new (&d) int(4);
```

How legal do you think this code is, and what happened? In fact, it's perfectly legal. Let's look at the lifetimes of the `double` and `int` objects.

```cpp
{
double d = 15.0; // ┓
                 // ┃ 1
new (&d) int(4); // ┫
                 // ┃ 2
}                // ┛
```

- <sup>1</sup> lifetime of the `double` object
- <sup>2</sup> lifetime of the `int` object
- <sup>1 + 2</sup> the period for which 8 bytes were allocated on the stack

In total: two objects live in the same memory at different times.

> The example is valid only on platforms where `sizeof(double) >= sizeof(int)` and `alignof(double) % alignof(int) == 0`

Notice that the `int` object will most likely occupy fewer bytes than are available in the memory allocated for the `double`. But the important thing is that it fits.

---

Similar example:

```cpp
using Bytes = std::byte[sizeof(Point)];

...

alignas(Point) Bytes data;
Point* p = new (data) Point;

p->~Point();
```

In the previous example, we placed an `int` "inside" a `double`; now we're placing a `Point` inside an array of bytes - essentially, a similar operation. Let's look at the object lifetimes:

```cpp
{
alignas(Point) Bytes data;   //    ┓
Point* p = new (data) Point; // ┓  ┃
                             // ┃1 ┃2
p->~Point();                 // ┛  ┃
                             //    ┃
}                            //    ┛ 
```

- <sup>1</sup> lifetime of the `Point` object
- <sup>2</sup> lifetime of the `std::byte[]` object. This is also the period for which `sizeof(Point)` bytes are allocated on the stack, and all the action takes place in them

Now the "wrapper object" interestingly does not end its lifetime after placing the `Point` object inside it - this differs from what we saw in the previous example, although seemingly, what's the difference?

---

Another example:

```cpp
struct Point { int x, y; };
struct Line  { Point p1, p2; };

{
Line l; // ┓
...     // ┃ 1
}       // ┛
```

- <sup>1</sup> lifetime of _seven_ objects simultaneously: one `Line`, two `Point`s, and four `int`s. This is also the lifetime of one single piece of memory in which all these objects are located, partially overlapping one another

An unexpected perspective - even I, when creating the example, didn't expect to count a whole _seven_ objects. At the same time, this example is more or less intuitive to us, because it is natural for an aggregate object and the objects nested inside it to live simultaneously. Just like in the previous example, they share the same memory and live in it at the same time:

```
0x0  ┓i  ┓P  ┓
     ┃n  ┃o  ┃
     ┛t  ┃i  ┃
0x4  ┓i  ┃n  ┃
     ┃n  ┃t  ┃L
     ┛t  ┛   ┃i
0x8  ┓i  ┓P  ┃n
     ┃n  ┃o  ┃e
     ┛t  ┃i  ┃
0xC  ┓i  ┃n  ┃
     ┃n  ┃t  ┃
     ┛t  ┛   ┛
```

---

So, here's what we have:

- The lifetime of an object does not necessarily coincide with the lifetime of the allocated storage
- The same memory can contain several objects at the same time
- But there are cases where creating one object in memory destroys an object that was previously placed there
- An object does not necessarily occupy all of the allocated memory - it may occupy only part of it

Now, I think you can clearly see that the topic is _not at all simple_, and we haven't even really started - we merely took a quick look at the tip of a huge iceberg. What's more, I claim that a good understanding of object lifetimes in C++ is the key to understanding the language. A good chunk of the standard's convoluted rules revolves around object lifetimes. A good handful of UB is scattered around because of object lifetime rules.

And now we're finally going to start figuring this out, little by little...

# Before Diving In

To keep the assorted rules of the standard from driving you mad, it is very useful to know the answers to these questions in advance: why is it so complicated, why does it have to be so complicated, and what is all this complexity for?

There are two fundamentally conflicting forces in C++:

- compilers, which want to optimize aggressively
- programmers, who write low-level code

It would seem that they have similar goals: generating the most performant machine code possible. But they try to achieve this in different ways.

A compiler wants to interpret behavior outside an object's lifetime as impossible whenever it can - this gives it the right to eliminate "dead" accesses, reuse memory on the stack, and not re-check which object currently resides at a given address. A programmer, on the other hand, intentionally reuses memory for efficiency - placement-new over an old object, `union`, allocators, buffers - and therefore constantly ends up exactly where the compiler expects UB. Many of these tricks date back to C, and programmers generally see them as perfectly natural.

The standard sacrifices neither side. Instead, it tries to navigate between them. That's why there are so many rules: each exception is a separate compromise between a specific low-level pattern used by the industry and a specific optimization that the compiler isn't willing to give up. In the end, we have what we have.

From here on, I will be quoting the standard extensively. But it's worth understanding that the C++ standard is a living organism and changes all the time. At the time of writing, I relied on the material at [eel.is](http://eel.is/c++draft/), where the current working draft is published. The paragraphs I quote are current as of September 28, 2026, but their contents and wording will inevitably change over time. In particular, the paragraph numbers themselves will change, so I decided to show you paragraphs like this:

> **_Definition of scalar types_**
> 
> **\[basic.types.general\] p7**
> 
> Arithmetic types, enumeration types, pointer types, pointer-to-member types, `std​::​meta​::​​info`, `std​::​nullptr_t`, and cv-qualified versions of these types are collectively called scalar types. ...

By the way, I didn't choose this example by accident - we'll need the definition of scalar types more than once! So you might as well remember it right away :)

First comes a name I made up for the paragraph, which I will use whenever I need to refer to it again in the text. **\[basic.types.general\]** is the so-called _stable name_, intended to remain more or less unchanged. It's something like a chapter in a book consisting of many paragraphs. **p7** is the paragraph number, and that, on the contrary, is an extremely volatile entity. A paragraph is uniquely identified by the combination of stable name + paragraph number: **\[basic.types.general\] p7**. I will give this number once, when I first refer to the paragraph, and on subsequent references I will use my own shorthand name. This should make the article easier to maintain over time.

Sometimes I will refer to historical paragraphs from the past, from a specific version of the standard. In that case, I will refer to them like this: **C++17 \[expr.pseudo\] p1**. No made-up name.

It may seem strange and disconnected from real life that I am using the bleeding-edge version of the standard as a guide to action and presenting it as the correct reality. After all, many of us are stuck on much earlier versions of the standard. Game development, for example - including me, as a representative of the gamedev community - is universally [stuck on C++17](https://habr.com/ru/articles/894736/) and probably won't move beyond it anytime soon.

There is some rational basis for this, but it's the best I can do for you for several reasons:

- The object model had already become well established by C++17. The entire article revolves around this topic
- Many things enter the standard as DRs - defect reports. This happens when it becomes clear that the current or older wording of the standard has glaring holes that urgently need to be patched. Compilers apply DRs _retroactively_. In other words, your C++17 compiler in 2k26 will have every DR patch it has managed to incorporate. So relying on the literal wording of the 2017 standard is simply _more harmful_ than relying on a fresh draft that has incorporated all the defects. You simply can't know which paragraph is still valid and which one no longer applies. Old standards are more about history
- The article contains no recommendations that would cause UB or break something if followed with older standards (let me know if you find one - this is important)
- Over time, the article will become less and less cutting edge. Then we'll be able to see how the standard changes and how actively the article will need to be maintained

Let's begin.
# Automatically Created Objects

The standard has a concept called implicit-lifetime types. These are types whose lifetime _may_ begin automatically - without an explicit constructor call or placement new - _under certain circumstances_. The standard provides a tricky list of types that it considers to be such types. It's tricky because you have to assemble it from different parts of the standard:

> **_Definition of implicit-lifetime types_**
> 
> **\[class.prop\] p8**
> 
> A class S is an **implicit-lifetime class** if
> - it is an aggregate whose destructor is not user-provided or
> - it has at least one trivial eligible constructor and a trivial, non-deleted destructor.
> 
> **\[basic types.general\] p7**
> 
> Scalar types, implicit-lifetime class types, array types, and cv-qualified versions of these types are collectively called **implicit-lifetime types**.

So, the combined list of implicit-lifetime types is:

- Aggregate classes without a user-provided destructor
- Classes with a trivial destructor and at least one trivial constructor
- Scalar types
- Arrays

Starting with C++23, such types can be identified with the [`std::is_implicit_lifetime`](https://en.cppreference.com/cpp/types/is_implicit_lifetime) function. The standard has paragraphs describing the contexts in which implicit-lifetime types can be used:

> **_Implicit-lifetime functions_**
> 
> **\[intro.object\] p16, Note 6**
> 
> Some functions in the C++ standard library implicitly create objects (\[obj.lifetime\], \[c.malloc\], \[mem.res.public\], \[bit.cast\], \[cstring.syn\])
> 
> **\[intro.object\] p13**
> 
> ... For each operation that is specified as implicitly creating objects, that operation **implicitly creates and starts the lifetime** of zero or more objects **of implicit-lifetime types** in its specified region of storage if doing so would result in the program having defined behavior.  
> ...  
> \[Note 4: Such operations do not start the lifetimes of subobjects of such objects that are not themselves of implicit-lifetime types. — end note\]

The references mentioned here lead to the following functions/methods:

- `malloc`, `calloc`, `aligned_alloc`
- `::operator new`
- `std::pmr::memory_resource::allocate`
- `memcpy`, `memmove`
- `bit_cast`
- `start_lifetime_as`

These are precisely those _certain circumstances_ - i.e. it is always a call to some function that has special status in the eyes of the standard.

Let's look at some typical scenarios.

## Memory allocation

```cpp
struct Point { int x; int y; };

Point* p = static_cast<Point*>(malloc(sizeof(*p)));

// that's it - we're good to go!
p->x = 10;
```

WHOA! This is our C example from the beginning of the article. So it turns out this is actually allowed in C++ too, hooray! And looking at it from the other side, you realize that even to maintain compatibility with C, the C++ standard has to make exceptions to its own rules. After all, in the general case we have to _explicitly_ construct the object! Just not this time. Since `Point` is an implicit-lifetime type, the call to `malloc` will trigger the creation of a `Point` object in the memory pointed to by `Point* p`.

In fact, pretty much any library function that allocates memory can implicitly create an object.

## Deserializing data

You've received raw bytes over the network. You want to reconstruct the object you received.

You cannot do this:

```cpp
std::byte* b = /*got the raw bytes*/;
Point* obj = reinterpret_cast<Point*>(b);
obj->x = 15; // UB!
```

There has never been, and is not currently, a `Point` object in these bytes, in this memory. `reinterpret_cast` does not create an object there - it has a different purpose - we'll talk about this cast later. Therefore, interpreting the bytes as a `Point` is UB, and the compiler is entitled to punish you for it at runtime.

Now let's look at the ways we _can_ do it.

C++23 gives us the most logical and reasonable way:

```cpp
std::byte* b = /*got the raw bytes*/;
Point* obj = std::start_lifetime_as<Point>(b);
obj->x = 15; // OK
```

We simply breathed life into the memory and got the coveted pointer.

But not everyone can use C++23, so production code that's a little closer to what we have today may contain other techniques.

We can copy the bytes using `memcpy`:

```cpp
std::byte* b = /*got the raw bytes*/;
std::byte* obj = /*we have storage for the object*/;

std::memcpy(obj, b, sizeof(Point));
Point* p = reinterpret_cast<Point*>(obj);
p->x = 15; // OK
```

You might reasonably say: if we somehow allocated memory for `obj`, doesn't that mean the object could have been implicitly created at that stage already? Not necessarily - the memory doesn't have to be allocated with `new` or `malloc`, which can also implicitly create an object. Imagine that, suddenly, it's stack memory - some `std::byte[sizeof(Point)]`, or even static storage. I simply took a pointer to it. In that case, the `Point` object will be implicitly created specifically at the `std::memcpy` stage.

There is an even more curious option:

```cpp
std::byte* b = /*got the raw bytes*/;
std::memmove(b, b, sizeof(Point));
Point* obj = reinterpret_cast<Point*>(b);
obj->x = 15;
```

How about that? The compiler will probably optimize the self-copy away, but it will still be required to create the `Point` object.

> Note: when `memcpy` and `memmove` come up, people usually talk about trivially copyable types, but we'll talk about those too. For now, let's just limit ourselves to the fact that our `Point` happens to be both an implicit-lifetime type and a trivially copyable type.

## The Weirdness of Implicit Object Creation

There is one point worth noting. Look at these examples:

```cpp
void* raw = std::malloc(8); // 1
Point* p = static_cast<Point*>(raw);

...

std::byte buf[8];
std::memcpy(buf, p, 8); // 2
Point* p2 = reinterpret_cast<Point*>(buf);
```

- <sup>1</sup> and <sup>2</sup> are the lines where the `Point` object is implicitly created. Doesn't anything seem strange to you? Neither line contains even a hint of the type that is supposed to be implicitly created. Only at the cast stage do we explicitly reveal our intention and show our cards as to which type we'd like to get. But the cast creates nothing! The objects are created by `std::malloc` and `std::memcpy`.
    

The standard did not formulate its rule this way by accident:

> ... operation implicitly creates and starts the lifetime of zero or more objects of implicit-lifetime types in its specified region of storage **if doing so would result in the program having defined behavior**

Roughly speaking, the compiler is forced to analyze the surrounding context and retroactively determine the type of the object being created. So the chronology of events can shift around a little.

What type of object do you think will be implicitly created here?:

```cpp
struct A { int x; };
struct B { int x; };

alignas(A) std::byte storage[sizeof(A)];

std::memcpy(storage, data, sizeof(A));
B* p = reinterpret_cast<B*>(storage);
```

The answer is: `B`. Because it doesn't matter how diligently we pretended that the memory was intended for `A` if, in the end, we changed our minds and decided that it was `B` at the point of the cast.

## Aggregates

It's interesting to see aggregate classes among the implicit-lifetime types. The motivation is fairly obvious - you can materialize entire blocks of data from raw bytes:

```cpp
struct Header {
    uint32_t magic;
    uint16_t version;
    uint16_t flags;
};

...

std::byte* b = /*got the raw bytes*/;
Header* h = std::start_lifetime_as<Header>(b);
```

If you read the **_Implicit-lifetime functions_** paragraph carefully, you can see that all the subobjects - `magic`, `version`, `flags` - will also be implicitly created by this code: "zero or more objects of implicit-lifetime types in its specified region of storage".

However, there are significant pitfalls here. An aggregate without a user-provided destructor can also be a structure like this:

```cpp
struct S {
    int i;
    std::string str;
};
```

And this is where complications arise. The types `S` and `int` are implicit-lifetime types according to the **_Definition of implicit-lifetime types_**, but `std::string` is not. What happens in such cases is explicitly stated in the last note of the **_Implicit-lifetime functions_** paragraph: "Such operations do not start the lifetimes of subobjects of such objects that are not themselves of implicit-lifetime types.".

So what we get is this - the `S` object itself can be implicitly created; its nested `S::i` will also be implicitly created; but `S::str` will remain an empty shell with no object inside.

```cpp
std::byte* b = /*got the raw bytes*/;
S* s = std::start_lifetime_as<S>(b);
s->i = 3;       // 1
s->str.clear(); // 2
```

- <sup>1</sup> Everything is fine - the `s->i` object was created
- <sup>2</sup> UB - there is no `s->str` object

What do we do? I know only one option:

```cpp
S* s = std::start_lifetime_as<S>(b);
new (&s->str) std::string;
```

And now our aggregate is fully populated with living inhabitants.

## These Tricks Aren't for Everyone!

Don't forget that all of the techniques above apply only to implicit-lifetime types! And there actually aren't all that many of those. In the general case, this does not work.

## Chapter Takeaways

- If `std::is_implicit_lifetime_v<T> == true`, then an object of type `T` will be created when calling `malloc`, `::operator new`, `memcpy`, or `std::start_lifetime_as`. An explicit constructor call is not required
- If `std::is_implicit_lifetime_v<T> == false`, the magic stops working. This includes `std::start_lifetime_as`
- Be careful with aggregates. Implicit recursive creation happens only for members that are themselves implicit-lifetime types. It is very easy to end up with an object full of "holes": some variables are alive, some are dead and require additional manual construction

# Trivially Copyable Types

We've already seen what `memcpy` is capable of. As you can see, the mere fact that it is used can breathe life into bytes that had no life in them before.

There is, however, a nuance: to legally use `memcpy` or `std::bit_cast` to copy an object, the object must be a trivially copyable type. Such types can be identified with [`std::is_trivially_copyable`](https://en.cppreference.com/cpp/types/is_trivially_copyable).

The standard describes such types as:

> **_Definition of trivially copyable_**
> 
> **\[class.prop\] p1**
> 
> A trivially copyable class is a class:
> - that has at least one eligible copy constructor, move constructor, copy assignment operator, or move assignment operator,
> - where each eligible copy constructor, move constructor, copy assignment operator, and move assignment operator is trivial, and
> - that has a trivial, non-deleted destructor.
>     

Despite the concise and concentrated description, it's easy to get confused here, so I'll rephrase it in the way that's clearer to me - a trivially copyable type:

- Has a trivial destructor
- Among its copy/move constructors and copy/move assignment operators, there must be at least one _non-deleted_ function;
- All existing non-deleted copy/move functions must be trivial.

Such a type has hit the jackpot of trivial members - this is the strictest trait when it comes to triviality. And because of that, it is the closest thing to "C-like types" in terms of what you can get away with doing to the bit representation of objects of that type. The most important permission these types get is the ability to copy their objects bitwise without violating the integrity of the object. In other words, _instead of calling the copy constructor, you can copy the object bitwise_.

Note that a trivially copyable type is not the same thing as an implicit-lifetime type from the previous chapter. The former allows you to legally use `memcpy` to copy an object, while the latter allows you to implicitly create an object in the buffer that `memcpy` copies into (with the former giving you permission to do so). These properties overlap very heavily, but they are still not identical and don't even have a parent-child relationship, because types can be:

- Neither trivially copyable nor implicit-lifetime
    
    ```cpp
    struct X {
        ~X { std::cout << "hi!"; }
    };
    // cannot be copied bitwise, cannot be implicitly created
    ```
    
- Trivially copyable and implicit-lifetime
    
    ```cpp
    struct X {
        int i;
    };
    // everything is allowed
    ```
    
- Trivially copyable, but not implicit-lifetime
    
    ```cpp
    struct X {
        X() : x(15) { }
        int x;
    };
    // such an object can be copied bitwise,
    // but this will not automatically create an object in a byte buffer
    ```
    
- Not trivially copyable, but implicit-lifetime
    
    ```cpp
    struct X {
        X() = default;
        X(const X& o) { counter = o.counter + 1; };
        int counter;
    };
    // copying implies side effects - the object cannot be copied bitwise,
    // but it can still be implicitly brought to life
    ```
    

Scalar types and simple structures recursively composed of scalar types are almost always both implicit-lifetime and trivially copyable, which makes these traits easy to confuse.

## Chapter Takeaways

- Trivially copyable types can be copied with `memcpy` instead of calling the copy constructor
- trivially copyable != implicit-lifetime, so being trivially copyable does not always guarantee automatic object creation in the buffer you're copying into with `memcpy`

# Pointer provenance

Now let's approach the question of object lifetimes from a completely different angle. Let's ask ourselves - what is a pointer? Or, what information does it carry?

The first thing we associate with the concept of a pointer is its address. Simply because a pointer is inseparably connected to memory - literally the _place_ where data is stored, and a pointer is our knowledge of that place.

The second thing we associate with a pointer is its type. In the notation `T*`, we have not only the asterisk but also the mention of `T`. And that `T` is a direct instruction for how to interpret the data located at that address. An `int*` and a `float*` pointing to the same address will interpret the data at that address differently. And as the following chapters will show, there are cases where pointers can validly point to the same address using different types, and this "will work" without causing UB.

As far back as C++03, the combination of "address + type" was a complete description of a pointer as an entity. The standard put it like this:

> **C++03 \[basic.compound\] p3**
> 
> if an object of type `T` is located at address `A`, a pointer of type `T*` whose value is address `A` points to that object.

In C++11 and C++14, these words remained in the standard, but at the same time a new, third factor that indirectly affected pointers began to emerge - _the object and its lifetime_. In these versions of the standard, however, this concept existed in parallel with the "address + type" combination and did not really claim to directly affect the identity of a pointer.

Then proposal [P0137R1](https://open-std.org/jtc1/sc22/wg21/docs/papers/2016/p0137r1.html) came along and entered the C++17 standard. The paper substantially rewrote the object model of the language. Objects and their lifetimes began to play a key role in pointer semantics - in addition to the address and type, a pointer now has _pointer provenance_. This is metadata that the compiler keeps track of for each pointer, primarily so that it can use this additional information to make assumptions about the live (or not-so-live) object that lies behind the pointer. Based on this information, the compiler can perform so-called pointer optimizations: make assumptions about whether specific pointers can or cannot alias; track the object a pointer currently points to - this is the aspect that matters most to us. So it turns out that a pointer is now: "address + type + object behind the pointer". You can cast a pointer to a pointer of another type, but the information about the object remains unchanged - you can't escape it.

The most interesting part is that the concept of pointer provenance never actually made it into the standard. The standard describes intricate rules for object lifetimes and for how pointers can and cannot interact with those objects. The combination of these rules, painstakingly assembled piece by piece, outlines the need for a compiler to track pointer provenance and implicitly gives rise to the concept of pointer provenance, which exists in compilers and even frequently appears in proposals for the standard. In other words, even people who are as close to the standard as you can get use the term pointer provenance, because it is a convenient concept encompassing any additional metadata associated with a pointer. I think that at some point it will officially become part of the standard's terminology.

We're talking about pointers here, of course, but it is important to understand that provenance applies _not only_ to pointers, but also to entities that are implicitly pointers at the level where the compiler operates on the addresses of objects in memory. These are:

- Pointers
- References
- Variable names - on the stack, static, or thread-local

A pointer can be associated with a live object, in which case dereferencing it gives you trouble-free access to that object. A pointer _can_ exist without a live object behind it, and that by itself is not a violation. However, you can only use such a pointer with serious restrictions: you can perform pointer arithmetic on it, cast it to whatever you want, copy it, pass it around, take its address; but as soon as you try to access the object (which doesn't exist), you enter forbidden territory.

And once you understand this, the problem with the bit tricks beloved by low-level programming enthusiasts immediately becomes apparent:

```cpp
float f = 529.4;                    // 1
int* p = reinterpret_cast<int*>(&f);// 2
int bytes = *p;                     // 3
```

- <sup>1</sup> Behind the name `f` there is a live `float` object. Accordingly, the pointer `&f` has "noble" provenance - it points to a live `float` object
- <sup>2</sup> Casting the pointer changes its type, but it cannot erase its provenance - the pointer originally comes from a `float` object. What's more, we **do not have a live** **`int`** **object at all**. We never created one; the cast never creates objects either, and even for implicit-lifetime types this does not happen through a cast. So even if we somehow forgot about the `float` provenance, we still couldn't associate the pointer with an `int` object, because there is no such object and never has been. But the cast itself is not UB yet - this is allowed
- <sup>3</sup> UB. An attempt to access an object through the wrong type. Such access is not permitted by the type-accessibility rules

And yes, all these tricks have been practiced for decades, and compilers allow them in most cases. But they have every right to introduce a subtle, hard-to-find bug into such a program at any moment, because at some particular point the compiler may find a nice optimization opportunity precisely where your hack happens to be. That's how it goes.

---

Here's an interesting thing that follows from provenance. If you have:

- A `T*` pointer with address `0x1234`
- An object of type `T` living at address `0x1234`

this _does not mean_ that your pointer is associated with that object. In other words, the compiler, with the standard's blessing, can consider that not to be the case and speculate on it however it sees fit.

This is strange and counterintuitive, and it gets in the way of understanding some important concepts on which the language standard relies. And it also completely overturns what the C++03 standard guaranteed, but, you know, we don't live in 2003 anymore.

To properly internalize the concept introduced in C++17, we need to prepare the ground. I'll now describe my personal mental model of how pointers are connected to objects in memory. It's a kind of visualization that helps make this mechanism easier to understand.

Imagine that memory is not a one-dimensional sequence of addresses, but a two-dimensional matrix, where the Y axis represents different memory addresses, while the X axis represents some space into which objects can be placed. Alternatively, instead of the X axis, you could imagine layers for the same memory addresses - both approaches work equally well as a mental experiment, but a two-dimensional matrix is easier to draw. Let's execute this code:

```cpp
T* t1 = new T;
```

Graphically, memory will look like this:

![](https://habrastorage.org/webt/3d/7e/3d/3d7e3d22656442fa68841c2a14885099.png)

The object is located at address `0x0A`, the pointer is associated with the object and points directly to it. Now let's destroy the object:

```cpp
t1->~T();
```

![](https://habrastorage.org/webt/1d/6a/07/1d6a074ef11d06fcfea7b4100629b9bd.png)

The object is gone, but the pointer still exists. It still has the same address `0x0A`, but now it points to nowhere. Let's create a new object at address `0x0A`:

```cpp
T* t2 = new (t1) T;
```

![](https://habrastorage.org/webt/69/de/7f/69de7f4eab89f9ecd0a3c3f8344ed577.png)

Look at the interesting picture we get. A new object has appeared at address `0x0A`. And it would seem that `t1` has the same address, so we should be able to dereference it and use the new object. But no - the object was not created quite where we expected it to be - it ended up "in a new layer" at the same address, while `t1` is looking past it. And the arrow from `t1` will not move itself to the new object! As a result, the compiler may consider `t1` to point to an invalid object. Counterintuitive, isn't it?

## Chapter Takeaways

- Starting with C++17, "address + type" is not sufficient to fully identify a pointer
- Pointers have provenance - information maintained by the compiler about which object the pointer originated from
- If you try to dereference a pointer whose provenance is not associated with a live object, you get UB
- Two pointers with the same address can theoretically point to different objects. Even if the pointers have the same type

# Transparently Replaceable Objects and `std::launder`

Actually, when I said "the arrow from `t1` will not move itself to the new object", I was frankly lying to you. Because in the general case, of course it won't move, but the very same C++17 standard introduced the concept of transparently replaceable objects:

> **_Definition of transparently replaceable_**
> 
> **\[basic.life\] p9**
> 
> An object o1 is **transparently replaceable** by an object o2 if either
> 
> - o1 and o2 are complete objects for which:
>     - o1 is not const,
>     - the storage that o2 occupies exactly overlays the storage that o1 occupied, and
>     - o1 and o2 are of the same type (ignoring the top-level cv-qualifiers), or
> - o1 and o2 are corresponding direct subobjects for which:
>     - the complete object of o1 is not const or
>     - o1 is a mutable member subobject or a subobject thereof.

The application of this concept:

> **_Effect of transparent replacement_**
> 
> **\[basic.life\] p10**
> 
> After the lifetime of an object has ended and before the storage which the object occupied is reused or released, if a new object is created at the storage location which the original object occupied and the original object was transparently replaceable by the new object, a pointer that pointed to the original object, a reference that referred to the original object, or the name of the original object **will automatically refer to the new object** and, once the lifetime of the new object has started, can be used to manipulate the new object.
> 
> Note: If these conditions are not met, a pointer to the new object can be obtained from a pointer that represents the address of its storage by calling `std​::​launder`.

In other words, if two objects are transparently replaceable, then when one is recreated in place of the other, the little arrow _moves automatically_ from one object to the other. And notice that in my example above:

```cpp
T* t1 = new T;
t1->~T();
T* t2 = new (t1) T;
```

`t1` and `t2` are indeed pointers to transparently replaceable objects, because they have the same type, occupy exactly the same storage, and the object behind `t1` is non-const. In other words, my deception is obvious: first I gave you the basic rule without mentioning the big fat exception, and now I'm introducing that exception retroactively. All for the sake of a smooth learning curve.

The correct picture should be this:

![](https://habrastorage.org/webt/74/d8/e4/74d8e47bc4600fc66aeb2306e255bb51.png)

Also notice the note at the end of the **_Effect of transparent replacement_** paragraph - if it so happens that your objects are not transparently replaceable, the situation can be fixed by calling `std::launder`.

You know, I couldn't understand `std::launder` for a very long time. But with the concept of memory layers, everything falls into place: `std::launder` _simply adjusts the arrow_. Here's how it does it:

> **_Definition of std::launder_**
> 
> **\[ptr.launder\] p2-p3**
> 
> _Preconditions_: p represents the address _A_ of a byte in memory. An **object** _**X**_ whose type is similar to T is located **at the address** _**A**_, and is either within its lifetime or is an array element subobject whose containing array object is within its lifetime.  
> All bytes of storage that would be reachable through the result are reachable through p.  
> _Returns_: A value of type T* that **points to** _**X**_.

More simply: if somewhere at the pointer's address there is a live object of a type similar to `T`, `std::launder` will give you a new pointer with its arrow moved to that object. In terms of our model, you can think of this as "fixing the provenance": you get a pointer associated with the live object located at the same address. If there is no suitable object at that address, using `std::launder` is not permitted. If there is an object and the original pointer already points to it, the result will point to the same object.

As you can probably tell, in normal language terms the function does nothing - it is more of a hint to the compiler than an ordinary function. The most concise description of the function's purpose is the human-readable name of paragraph **\[ptr.launder\]**: "Pointer optimization barrier". And indeed - fixing the pointer provenance of a "fishy" pointer simply takes away the compiler's ability to speculate about its lack of an associated object.

Most often, modern `std::launder` appears where you want to obtain a pointer to a valid object while initially holding a pointer of a different type that is located at the same address - a specific case we'll discuss in another chapter. If we're talking about recreating objects of the same type at the same address, then in 90% of cases the objects will be transparently replaceable because their types are identical, and there is never any need to call `std::launder`. However, you can contort things and construct a synthetic example where an object of the same type is placed in memory but the conditions for transparent replacement are not met:

```cpp
struct Wrapper { T t; };

static_assert(sizeof(Wrapper) == sizeof(T));
static_assert(alignof(Wrapper) <= alignof(T));

...

T* t1 = new T;
```

There is a live `T` object behind `t1`

![](https://habrastorage.org/webt/3d/7e/3d/3d7e3d22656442fa68841c2a14885099.png)

```cpp
t1->~T();
```

The object is gone, and `t1` is an orphan

![](https://habrastorage.org/webt/1d/6a/07/1d6a074ef11d06fcfea7b4100629b9bd.png)

```cpp
Wrapper* w = new (t1) Wrapper;
```

By creating a `Wrapper` object at the address of `t1`, we have effectively also placed a new object of type `T` at that same address, because `*w` and `w->t` have zero offset and therefore both reside at the address held by `t1`. But `T* t1` is still an orphan, because the old object behind `t1` and the new `w->t` are not transparently replaceable - neither is a complete object, and they have no object-subobject relationship, so they do not satisfy the **_Definition of transparently replaceable_** in any way.

![](https://habrastorage.org/webt/fd/85/0c/fd850c112eb3e6814939a7c0309d7b05.png)

```cpp
T* t2 = std::launder(t1);
```

We cannot use `t1` normally, so we create a new pointer `t2` through `std::launder`, with provenance pointing to the `w->t` object

![](https://habrastorage.org/webt/c9/87/48/c987489585f35429a73665ad90c068b3.png)

## Chapter Takeaways

- Transparently replaceable objects can "pass on" their provenance when one such object is recreated in place of another. A pointer to the old object will automatically start pointing to the new object
- If you create a new object of the same type inside the storage of the old object, you will almost always get automatic redirection of old pointers to the new object. Only the constness of the old object or placing the new object somewhere other than exactly the same storage occupied by the old object can prevent this
- Non-transparently-replaceable objects of the same type can be "fixed" by calling `std::launder`

# Char and type-accessibility

There are two types:

```cpp
struct T { int x; };
struct U { int x; };
```

Now, knowing about pointer provenance, we understand why an object of type `T` cannot be used by interpreting it as type `U` - if you had an object of type `T`, and there has never been an object of type `U`, no knowledge that they have the same layout, etc. will save you from UB, because the compiler knows better.

```cpp
T t;
U u = *reinterpret_cast<U*>(&t); // UB
```

However, by surrounding itself with all these UBs, the standard would have deprived itself of the ability to access objects byte-by-byte - after all, to inspect an object, you need to cast it to a one-byte type through which you can look inside the object:

```cpp
T t;
char* bytes = reintepret_cast<char*>(&t);
std::cout << bytes[1];
```

But there are no `char` objects there where we're trying to look through them!

So the standard gave the types `char`, `unsigned char`, and `std::byte` special status and introduced the concept of type-accessible types:

> **_Definition of type-accessible_**
> 
> **\[basic.lval\] p11**
> 
> An object of dynamic type Tobj is **type-accessible** through a glvalue of type Tref if Tref is similar to:
> - Tobj,
> - a type that is the signed or unsigned type corresponding to Tobj, or
> - a char, unsigned char, or std​::​byte type.
> 
> If a program attempts to access the stored value of an object through a glvalue through which it **is not type-accessible, the behavior is undefined**

What can this be useful for:
- Point inspection. Look at a single byte, check byte order, print a dump
- Legalizing `memcpy`. More precisely - explaining why `memcpy` does not violate strict aliasing

For example, checking the endianness of the machine on which the code is running:

```cpp
bool little_endian() {
    int i = 1;
    return *reinterpret_cast<unsigned char*>(&i) == 1;
}
```

The standard even allows you to rewrite an object's bytes through a `char*`. The standard merely specifies that if modifying the object representation results in a bit pattern that is not valid for the given type, attempting to read the value of such an object may result in UB:

> **_Bit consistency rule_**
> 
> **\[conv.lval\] p3.3**
> 
> Otherwise, if the bits in the value representation of the object to which the glvalue refers are not valid for the object's type, the behavior is undefined.

## Chapter takeaways

- Cast any pointer to an object to `char*`, `unsigned char*`, or `std::byte*` and inspect the object's byte representation to your heart's content

# Provides Storage

I've already shown you examples like:

```cpp
double d = 15.0;
new (&d) long long(4);
```

where creating a `long long` in the memory occupied by a `double` ends the lifetime of the `double` object. Such destruction is perfectly normal, and works in the general case:

> **_Condition for the end of an object's lifetime_**
> 
> **\[basic.life\] p2**
> 
> ...  
> The **lifetime** of an object _o_ of type T **ends** when:
> - if T is a non-class type, the object is destroyed, or
> - if T is a class type, the destructor call starts, or
> - **the storage** which the object occupies **is released**, **or is reused** by an object that is not nested within _o  
>     ...
>     

The third point is specifically about reusing memory occupied by an object.

But there are cases where this behavior gets in the way: for example, when you create an object inside a byte array to implement SBO or type erasure. The standard has addressed this case separately as well, creating yet another exception to the rules through the definition of provides storage:

> **_Definition of provides storage_**
> 
> **\[intro.object\] p3**  
> If a complete object is created in storage associated with another object e of type “array of N unsigned char” or of type “array of N std​::​byte”, that array **provides storage** for the created object if
> - the lifetime of e has begun and not ended, and
> - the storage for the new object fits entirely within e, and
> - there is no array object that satisfies these constraints nested within e.
>     

Objects of type `unsigned char[]` or `std::byte[]` _do not die_ when objects are created in their memory, because the standard explicitly designated them as storage types. Remember the example?:

```cpp
alignas(Point) std::byte[sizeof(Point)] data;

Point* p = new (data) Point;
p->~Point();
```

The `std::byte[]` object does not die even though a `Point` object was created in its memory.

Notice that objects of type `char[]` were not given the same powers, even though `char` is perfectly suitable for type-accessibility.

```cpp
alignas(T) unsigned char buf1[sizeof(T)];  // provides storage
alignas(T) std::byte     buf2[sizeof(T)];  // provides storage
alignas(T) char          buf3[sizeof(T)];  // does NOT provide storage
```

---

The standard made sure that the storage object does not die when other objects are placed inside it. But why? You might think - let it die, and we'll just keep placing our variables into this dead buffer. After all, if we allocate memory with `malloc` on the heap, that's exactly what happens - we're simply working with a chunk of memory that contains nothing, and that's perfectly fine.

```cpp
alignas(T) std::byte[sizeof(T)] buf;

T* t = new (buf) T;
```

vs

```cpp
std::byte* buf = static_cast<std::byte*>::operator new(sizeof(T), std::align_val_t(alignof(T))));

T* t = new (buf) T;
```

Functionally, these are the same thing. In both cases, you want a buffer into which you will place an object. Except that when implementing SBO (small buffer optimization), you want to put it on the stack - that's the whole point of the optimization. And you choose `std::byte[]`.

But there is an important point about `std::byte[]` - _it is an ordinary variable_, you have simply decided to use it in a way that is not quite typical for the language. In reality, I could use it for its intended purpose, as an array: `buf[3] = 3;`. But I can do that only if there is a live object behind `buf`. In the case of a buffer dynamically allocated as raw memory, I cannot do that at all (except for implicit-lifetime cases, but _that's different_).

Let's continue the code:

```cpp
alignas(T) std::byte[sizeof(T)] buf;

T* t = new (buf) T; // 1
t->~T();            // 2
t = new (buf) T;    // 3
```

Without the provides-storage exception, we would have this picture:
- <sup>1</sup> `buf` is alive
- <sup>2</sup> `buf` is dead
- <sup>3</sup> `buf` is dead

But in reality, `buf` is always alive. And that means we can always return to it and use it as an array, which makes more sense if we keep in mind that `buf` is not just a byte buffer, but also an ordinary variable.

Interestingly, you can formally implement SBO with `char[]` - or even `uint8_t[]` or `bool[]` - and not run into a single instance of UB, but as soon as you try to copy the buffer with `memcpy` or read it as bytes, you immediately get UB, because the array object dies as soon as you first place anything into it and never comes back to life.

And when working with a provides-storage buffer, `std::launder` suddenly shows up again, because sometimes we need to jump from the `std::byte[]` object to the target object `T`:

```cpp
template<typename T>
class Buffer {
public:
    void reset() {
        new (buf) T;                  // 1
    }
    
    T& get() {
        return *std::launder(         // 3
            reinterpret_cast<T*>(buf) // 2
        );
    }
private:
    alignas(T) std::byte[sizeof(T)] buf;
};

void f() {
    Buffer<T> buf;
    buf.reset();
    T& t = buf.get();
}
```

- <sup>1</sup> You place an object of type `T` inside `buf`. In fact, placement new gives you a pointer with good provenance, associated with the `T` object, but the interface of your class has nowhere to put or use this returned pointer, so we don't use it
- <sup>2</sup> The cast gives you a `T*` with bad provenance - it still points to the `std::byte[]`
- <sup>3</sup> `std::launder` gives you a corrected pointer - it now points to the `T` object

In the diagram, `t₁` is the pointer after the cast; `t₂` is the pointer after `std::launder`:

![](https://habrastorage.org/webt/a3/73/a6/a373a6597535d7308df1807b25d21509.png)

I should note that there is currently a [proposal P3006R1](https://www.open-std.org/jtc1/sc22/wg21/docs/papers/2024/p3006r1.html) aimed at eliminating the need for `std::launder` with provides-storage buffers. If this happens, `std::launder` will become a function with vanishingly few use cases, because in most situations everything will work without it anyway.

## Chapter takeaways

- For ordinary types, placing other objects inside their storage means they are immediately destroyed (and their destructor will not be called!)
- `unsigned char[]` and `std::byte[]` are provides-storage types. When objects of other types are placed inside their storage, the provides-storage objects are not destroyed, but live alongside them
- Use these types for SBO optimization
- `char[]` is _not_ a provides-storage type
- Performing `reinterpret_cast<T*>(buf)` is not enough to obtain a valid pointer. Its provenance will still refer to the buffer variable itself. To fix the pointer, you will need `std::launder`

# Pointer-interconvertibility + reinterpret_cast

I always thought that `reinterpret_cast` was a cast of last resort that could cast absolutely anything to absolutely anything if the other casts couldn't handle it. That was, of course, rather naive.

Over time, I learned that the powers of `reinterpret_cast` are far from omnipotent. Quite the opposite - there is a narrow set of scenarios where you can use it without subsequently getting UB.

In this chapter, I want to focus specifically on casting _pointers_. The standard explicitly specifies what `reinterpret_cast` of pointers means:

> **_reinterpret_cast for pointers_**
> 
> **\[expr.reinterpret.cast\] p7**
> 
> ... When a prvalue v of object pointer type is converted to the object pointer type “pointer to cv T”, the result is `static_cast<cv T*>(static_cast<cv void*>(v))`.

So it all boils down to a `static_cast` to a pointer of another type through `void*`. And the standard says the following about such a cast:

> ***static_cast for void***
> 
> **\[expr.static.cast\] p12**
> 
> ... If the original pointer value represents the address A of a byte in memory and A does not satisfy the alignment requirement of T, then the resulting pointer value is unspecified.  
> Otherwise, if the original pointer value points to an object _a_, and there is an object _b_ of type similar to T that is **pointer-interconvertible** with _a_, the result is a pointer to **_b_**.  
> Otherwise, the pointer value **is unchanged by the conversion**.

This brings us to a key concept: pointer-interconvertible objects. Notice how cleverly the standard shifts from the concept of a "pointer" to the concept of an "object" to define pointer-interconvertibility in terms of objects:

> **_Definition of pointer-interconvertible_**
> 
> **\[basic.compound\] p7**
> 
> Two objects a and b are pointer-interconvertible if
> - they are the same object, or
> - one is a union object and the other is a non-static data member of that object, or
> - one is a standard-layout class object and the other is the first non-static data member of that object or any base class subobject of that object, or
> - there exists an object c such that a and c are pointer-interconvertible, and c and b are pointer-interconvertible.
> 
> If two objects are pointer-interconvertible, then they have the same address, and it is possible to obtain a pointer to one from a pointer to the other via a **reinterpret_cast**.  
> Note: An array object and its first element are not pointer-interconvertible, even though they have the same address. — end note

As a result, we get a fairly narrow set of scenarios where a pointer to one object can be converted into a pointer _to another object_ via `reinterpret_cast`. To _another object_, specifically! **static_cast for void*** is not saying "Otherwise, the pointer value **is unchanged by the conversion**" for no reason. In other words, if the objects are not pointer-interconvertible, the pointer you get back will retain the provenance of the original object. And you most likely won't be able to use such a pointer, because the pointer type and the type of the object it points to _don't match_.

Here are some illustrative examples of pointer-interconvertible objects:

```cpp
union T {
    Point p;
    int i;
};

T t;

int& i = *reinterpret_cast<int*>(&t);   // 1
i = 15;

*reinterpret_cast<Point*>(&t) = {3, 2}; // 2
```

- <sup>1</sup> Objects `t` and `t.i` are pointer-interconvertible
- <sup>2</sup> Objects `t` and `t.p` are pointer-interconvertible

```cpp
struct Point {
    int x;
    int y;
};

Point p;

int& x = *reinterpret_cast<int*>(&p); // 1
x = 15;
```

- <sup>1</sup> Objects `p` and `p.x` are pointer-interconvertible because `x` is the first member of a standard-layout struct; this does not work for `y`

```cpp
struct Entity { };
struct Player : Entity { int health; };

Player* p = new Player{200};

Entity* e = reinterpret_cast<Entity*>(p); // 1
int* h = reinterpret_cast<int*>(p); // 2
int* h2 = reinterpret_cast<int*>(e); // 3
```

- <sup>1</sup> Objects `Player` and `Entity` are pointer-interconvertible because `Entity` is a base class subobject of `Player`
- <sup>2</sup> Objects `Player` and `int` are pointer-interconvertible because `health` is the first member of a standard-layout struct
- <sup>3</sup> Objects `Entity` and `int` are transitively pointer-interconvertible

---

In addition to pointer-interconvertible objects, don't forget about type-accessible objects: any pointer to an object can safely be cast via `reinterpret_cast` to `char*`, `unsigned char*`, or `std::byte*` and used to inspect the raw bytes.

Beyond these cases, the territory of valid `reinterpret_cast` gets downright exotic: pointer round-trips. This is when we cast a pointer into some complete nonsense and then cast it back to our original type. The standard guarantees that such a pointer returns from its casting journey safe and sound:

> **_Pointer round-trip_**
> 
> **\[expr.reinterpret.cast\], p7, Note 7**
> 
> Converting a prvalue of type "pointer to T1" to the type "pointer to T2" (where T1 and T2 are object types and where the alignment requirements of T2 are no stricter than those of T1) and back to its original type yields the original pointer value.

```cpp
Point* p1 = new Point(12, -2);
Chair* p2 = reinterpret_cast<Chair*>(p1);
Point* p3 = reinterpret_cast<Point*>(p2);
```

`p3` will be fully equivalent to `p1`, and you can use it as usual.

Another kind of round-trip scenario is converting a pointer value to an integer and back:

> **_Pointer-integral round-trip_**
> 
> **\[expr.reinterpret.cast\] p5**
> 
> A value of integral type or enumeration type can be explicitly converted to a pointer. If the value is one that can be produced by converting one or more pointer values to an integral type, the result is an unspecified choice among all such values that would result in the program having defined behavior. If no such value exists, the behavior is undefined.

```cpp
T* p = new T;
uintptr_t addr = reinterpret_cast<uintptr_t>(p);
T* q = reinterpret_cast<T*>(addr);
```

`p` is equivalent to `q`. However, this is only the case when there is a single such pointer with the specific address `addr`. Otherwise, converting back to a pointer will give you _any_ of the pointers that exist at that address: an _unspecified choice_, as the standard calls it.

## What `reinterpret_cast` cannot Do

**_Definition of pointer-interconvertible_** has a note at the end that explicitly says you cannot `reinterpret_cast` an array to its first element - this is not a pointer-interconvertible case. But you don't need to! The semantics of pointer and array conversions let you avoid the cast altogether:

```cpp
int a[10];
int* pGood = a;                         // 1
int* pBad = reinterpret_cast<int*>(&a); // 2
```

- <sup>1</sup> This is fine
- <sup>2</sup> You get an `int*` with provenance associated with the `int[]` object. Dereferencing it is UB

Another case where `reinterpret_cast` is helpless is casting from derived classes to base classes and back. `reinterpret_cast` generally cannot handle this task:

```cpp
struct Base { int i; };
struct Derived : Base { float f; };

Derived* d = new Derived;

Base* b1 = static_cast<Base*>(d);             // 1
Derived* d1 = static_cast<Derived*>(b1);      // 2

Base* b2 = reinterpret_cast<Base*>(d);        // 3
Derived* d2 = reinterpret_cast<Derived*>(b1); // 4
```

- <sup>1</sup> OK
- <sup>2</sup> Potentially OK
- <sup>3</sup> You get a bad pointer - its provenance is broken (it points to the `Base` object, but has type `Derived*`) with no way to fix it using `std::launder` (the types are different)
- <sup>4</sup> Similar to <sup>3</sup>, but in the opposite direction

However, you may remember that the third point in **_Definition of pointer-interconvertible_** described a case involving inheritance. But this only works for standard-layout classes, and for a class hierarchy to remain standard-layout, specific conditions must be met - in particular, only one class in the hierarchy may have non-static data members. That's a fairly narrow case that you shouldn't rely on in normal development.

In any case, it is worth saying that `reinterpret_cast` is simply not the tool we use to "walk" class hierarchies. That's what `static_cast` and `dynamic_cast` are for. In particular, they understand multiple inheritance and can even adjust the resulting address. `reinterpret_cast` simply cannot do that.

## Chapter takeaways

- A `reinterpret_cast` of a pointer without UB means casting to `char*`, `unsigned char*`, or `std::byte*`; casting between a `union` and its non-static members; or between a standard-layout class and its first non-static member
- Taking a `T*` pointer through a chain of `reinterpret_cast` conversions is safe if we eventually arrive back at `T*`
- Taking a `T*` pointer from a pointer to an integer and back through `reinterpret_cast` is safe if there was only one pointer with that address
- `reinterpret_cast` cannot steal `static_cast`'s lunch, especially when class hierarchies are involved

# Destructor Nuances

A destructor is a function called during the destruction of an object. Despite its important role in an object's lifetime, to my surprise, the relationship between the destructor and the object's lifetime is described rather imperfectly in the current working draft of the standard (C++26).

While studying the standard, I encountered quite a few logical gaps and omissions that leave room for ambiguous interpretations. Moreover, comparing it with previous editions shows that the wording describing this relationship has been actively changing and continues to be refined. I would say this is the least worked-out part of the standard I've encountered while writing this article. Most of it is located in **\[basic.life\]**, where the major cutting-edge changes concerning object lifetimes are happening.

Therefore, as of the date of writing this article - September 26, 2026 - this part of the standard should be divided into two rough categories. There are established rules that you can confidently rely on, and there is a rougher part whose interpretations have changed frequently and will likely continue to change in the near future.

For the latter, I will formulate more practical warnings - what you should avoid doing so that you stay in the safe zone even where the standard itself does not yet provide sufficiently reliable and unambiguous rules.

## Immutable Rules

The first immutable rule is fairly obvious: calling a destructor on a dead object is UB:

> **_Prohibition of repeated destruction_**
> 
> **\[class.dtor\] p18**
> 
> Once a destructor is invoked for an object, the object's lifetime ends; the **behavior is undefined** if the **destructor is invoked for an object whose lifetime has ended**.
> 
> \[Example 3: If the destructor for an object with automatic storage duration is explicitly invoked, and the block is subsequently left in a manner that would ordinarily invoke implicit destruction of the object, the behavior is undefined. — end example\]

Example 3 in the standard shows one way of getting into such a UB situation. And this particular situation is made possible by the second immutable rule - the rule concerning implicit destructor calls:

> **_Implicit destructor calls_**
> 
> **\[class.dtor\] p14**
> 
> A destructor is invoked implicitly
> - for a constructed object with **static** storage duration **at program termination**,
> - for a constructed object with **thread** storage duration **at thread exit**,
> - for a constructed object with **automatic** storage duration when the **block** in which an object is created **exits**,
> - for a constructed **temporary** object when its **lifetime ends**.

The most familiar of these calls is, of course, the implicit destructor call when a variable leaves its scope; the **automatic storage** scenario:

```cpp
{
std::vector<int> v(100);
} // 1
```

- <sup>1</sup> Implicit call to `~vector<int>()`
    
Such implicit destructor calls are planned by the compiler in advance, and there is no way to cancel them: the call will happen no matter what.

In principle, these two rules alone - the combination of **_Implicit destructor calls_** + **_Prohibition of repeated destruction_** - are enough to live quite comfortably, because from them we can derive situations where nothing good can possibly come of it, or perhaps something good can happen, but that's not exactly certain (this is a little nod toward the rougher part of the standard, where interpretations can take us pretty much anywhere):

- An explicit repeated destructor call takes you straight to UB, no questions asked
    
    ```cpp
    Point p;
    p.~Point(); // 1
    p.~Point(); // 2
    ```
    
    - <sup>1</sup> Destruction of the object
    - <sup>2</sup> Attempt to destroy a dead object - UB
- An implicit repeated destructor call leads to the same result
    
    ```cpp
    {
    Point p;
    p.~Point(); // 1
    }           // 2
    ```
    
    - <sup>1</sup> Destruction of the object
    - <sup>2</sup> The implicit destructor call scheduled by the compiler - same UB

It is also worth noting that at the same moments when an implicit destructor call is scheduled, another part of the standard describes the release of storage occupied by an `automatic`, `static`, or `thread_local` variable. These rules are spread throughout **\[basic.stc.auto\]**, but the corresponding points in time coincide with the moments when implicit destructor calls are scheduled. Moreover, the standard explicitly specifies that for an object with a destructor, storage is released **after** the destructor has executed. Thus, the expected sequence is preserved: first the object's lifetime ends, then the memory it occupies is released.

As a bonus, here's something a little more borderline, but still with some degree of stability. We already mentioned the **_Condition for the end of an object's lifetime_** paragraph in the chapter about provides-storage types. I want to show it again, but with different aspects emphasized:

> **_Condition for the end of an object's lifetime_**
> 
> **\[basic.life\] p2**
> 
> ...  
> The **lifetime** of an object _o_ of type T **ends** when:
> - if T is a non-class type, the object is destroyed, or
> - **if T is a class type, the destructor call starts**, or
> - the storage which the object occupies is released, or is reused by an object that is not nested within _o  
>     ...

Let me say right away that the paragraph itself is not exactly a model of stability and has a tendency to be rewritten, but the part I've highlighted is practically rock-solid, while the unhighlighted part creates an important "background". Here's what we can squeeze out of this paragraph:

First conclusion: calling the destructor causes the object's death. This is the official connection between the destructor and the object's lifetime.

Second conclusion: **a destructor call is not necessarily what causes an object's death** - it is merely one of the possible scenarios. Put differently: the destructor is **not always called when an object dies**, even if the object has one. And this is already interesting, because the destructor contains part of the logic that the program relies on. But as you can see, if you simply `free` the object's memory or, for example, create another object in its storage, we get destruction of the object without calling its destructor. I won't boldly claim whether this is UB or not, because on the one hand, such a scenario invalidates the program's logic whenever the destructor contains actual code; on the other hand, at the moment the standard does not treat this behavior as UB _as such_, although that can easily change.

Third conclusion: the phrase "if T is a class type" rather emphatically reminds us that destructors exist only _for class types_. So what about non-class types? And here we find something interesting...

## Pseudo-destructor

A destructor is a concept that exists only for classes. The standard says this not only in the **_Condition for the end of an object's lifetime_** paragraph. Here's a more appropriate paragraph:

> **_Types with (pseudo-)destructors_**
> 
> **\[expr.prim.id.dtor\] p1**
> 
> An id-expression that denotes the destructor of a type T names the **destructor** of T **if T is a class** 
> **type**, **otherwise** the id-expression is said to name a **pseudo-destructor**.

Interesting: for classes, destructors; for non-class types, pseudo-destructors. The next paragraph provides an important clarification:

> **_Scalars and pseudo-destructors_**
> 
> **\[expr.prim.id.dtor\] p2**
> 
> If the id-expression names a pseudo-destructor, T **shall be a scalar type**...

So pseudo-destructors exist only for scalar types.

This concept - destructors belonging to class types and pseudo-destructors belonging to scalar types - leaves a narrow group of types without even a hint of any (pseudo-)destructor:

- References
- Function types (`int()`)
- `void`
- And, surprisingly, arrays. An array can have a (pseudo-)destructor through its elements, unless, of course, those elements belong to the types from the current list

Those that have a pseudo-destructor can explicitly call it:

> **_Using pseudo-destructors_**
> 
> **\[class.dtor\] p19, Note 10**
> 
> The notation for explicit call of a destructor **can be used for any scalar type name**. Allowing this makes it possible to write code _without having to know if a destructor exists for a given type_. For example:
> 
> ```cpp
> typedef int I;
> I* p;
> p->I::~I();
> ```

The `typedef` in this example is necessary because `~int` is a syntax error (!).

Notice the words "without having to know if a destructor exists for a given type". This is referring to template code. With pseudo-destructors, the code will work without syntax errors even when `~T()` is called with `T = int`. And that's convenient.

Starting with C++20, pseudo-destructors were given semantic meaning: they now _end the lifetime_ of a scalar object, just as calling a regular destructor does for class objects. Back in C++17, a pseudo-destructor was literally a no-op and did nothing - it merely allowed such a construct to exist without upsetting the compiler - simply a placeholder for making template code compilable:

```cpp
// C++17
using I = int;
int i = 14;
i.I::~I();
std::cout << i; // OK
```

C++17 had the **\[expr.pseudo\]** paragraph, which explicitly specified this:

> **_Pseudo-destructors in C++17_**
> 
> **C++17 \[expr.pseudo\] p1**
> 
> The use of a pseudo-destructor-name after a dot . or arrow -> operator represents the destructor for the non-class type denoted by type-name or decltype-specifier. The result shall only be used as the operand for the function call operator (), and the result of such a call has type void. **The only effect is the evaluation of the postfix-expression** before the dot or arrow.

In the case of `i.I::~I();`, the postfix-expression is simply `i`, so the pseudo-destructor itself does absolutely nothing in C++17.

In C++20, the object-lifetime rules kick in: touch the (pseudo-)destructor - destroy the object. The **\[expr.pseudo\]** paragraph no longer exists in the standard, but modern **\[expr.call\]** specifies the new semantic behavior for pseudo-destructors:

> **_Pseudo-destructors in C++20_**
> 
> **C++20 \[expr.call\] p4**
> 
> ... If the postfix-expression names **a pseudo-destructor** ..., the function call **destroys the object** of scalar type denoted by the object expression of the class member access.

```cpp
// C++20
using I = int;
int i = 14;
i.I::~I();      // object is destroyed
std::cout << i; // UB
```

Touching a destroyed object is UB.

It is important that the standard watches its terminology very closely. If the standard says "destructor", it always means a real class destructor and nothing else. Pseudo-destructors are always called pseudo-destructors; the standard does not generalize these concepts.

In particular, paragraphs such as **_Implicit destructor calls_** do _not_ apply to pseudo-destructors. In other words, you can only call a pseudo-destructor manually - the compiler does not secretly generate these calls for you. Destruction of a scalar object when leaving scope is caused exclusively by releasing the storage occupied by the object.

## Trivial destructor

There is a category of types called trivially destructible. These are types with a trivial destructor:

> **_Definition of trivial destructor_**
> 
> **\[class.dtor\] p8**
> 
> **A destructor** for a class X **is trivial** if it is **not user-provided** and if
> - the destructor is not virtual,
> - all of the direct base classes of X have trivial destructors, and
> - either X is a union or for all of the non-variant non-static data members of X that are of class type (or array thereof), each such class has a trivial destructor.  
>     Otherwise, the destructor is non-trivial.
>     

The key/main point here is _not user-provided_. Put simply, if you don't explicitly declare a destructor, it will be trivial. And, surprisingly, pseudo-destructors join this club too - they are trivial as well, so all scalar types are trivially destructible. Trivially destructible types can be identified with [`std::is_trivially_destructible`](https://en.cppreference.com/cpp/types/is_trivially_destructible).

The main feature of a trivial destructor is that it contains no logic or side effects. At the point where it is called, the compiler will generate a no-op. And theoretically, you can speculate based on that. For example, deliberately destroying an object without calling its destructor, "because there's nothing there anyway"; or assuming that the implicit destructor call when a variable leaves scope is no longer a concern, and therefore you can do whatever you want within that scope. I certainly wouldn't speculate that way - because the standard is sitting in a gray area here, and tomorrow that speculation may become UB.

## What Not to Do

I won't cite contradictory or insufficiently settled paragraphs of the standard, because the article would become obsolete within a few years, if not months. I'll only explain how to protect yourself and write code that is unlikely to be reclassified from valid to UB-producing after a few revisions of the standard.

### Don't Rely on a Trivial Destructor

You should not speculate that "calling a trivial destructor" is equivalent to "not calling a destructor", although the temptation to think so is certainly strong. At present, the standard makes no distinction between the compiler generating a call to an ordinary destructor and a trivial destructor - the call happens in either case.

Yes, it may become a no-op in the final assembly, but don't forget that calling a destructor also means ending the object's lifetime and all the consequences associated with that.

In other words, a trivial destructor is not exempt from UB after an attempt to destroy an object twice.

The only types you can treat somewhat more freely here are scalar types. They don't have a destructor - only a pseudo-destructor. Remember that a pseudo-destructor is not called implicitly. Accordingly, you cannot get into the trap of implicitly destroying a scalar object twice. And types with neither destructors nor pseudo-destructors are completely exempt from this problem.

### Don't Manually Destroy an Object on the Stack

This actually applies to `static` and `thread_local` variables as well. Simply don't call the destructor of such variables manually, and you will protect yourself from a whole host of problems.

Why might you need to explicitly call the destructor of a stack variable in real code? For example, to implement SBO. But there is already a well-trodden path for implementing SBO: use provides-storage arrays - they already have the standard's forgiveness and give you good protection against UB:

- Provides-storage buffers are not destroyed when other objects are placed inside them, but live until the end of the scope
- Provides-storage buffers, being arrays, _do not have a (pseudo-)destructor_, so nothing is called for them when the scope ends

In other words, with stack-allocated `std::byte[]` and `unsigned char[]`, you are completely safe.

With ordinary types, manually calling the destructor is safe only if you allocated the object on the heap - for such an allocation, no implicit destructor call is scheduled, so you can completely control the situation: call the destructor manually, perform placement new, deallocate the memory.

## Destructor and Object Lifetime

I want to draw attention to one important and slightly strange point. The standard associates calling the destructor with the end of an object's lifetime and tries to make them go hand in hand, almost identical in time. However, there is a fundamental problem that makes their absolute temporal coincidence simply impossible in the general case.

The thing is, an object's lifetime is a runtime concept, as the standard explicitly states:

> **_Runtime nature of object lifetime_**
> 
> **\[basic.life\] p2**
> 
> The lifetime of an object or reference **is a runtime property** of the object or reference.  
> ...

A destructor call, on the other hand, is a function call generated by the compiler at the program compilation stage. In other words, these are concepts from different worlds that the standard is doing everything it can to bring together and align in time.

And it is very easy to get a mismatch - in fact, we've already seen examples where this is happening in full force:

### The Object Dies, but the Destructor Never Runs

```cpp
// birth
void* p = ::operator new(sizeof(std::vector<int>));
auto* v = new (p) std::vector<int>(100);

// death
::operator delete(p); // 1
```

- <sup>1</sup> The **_Condition for the end of an object's lifetime_** paragraph showed us that an object can be killed simply by releasing its storage - the destructor is not called. This results in a leak of `sizeof(int) * 100` bytes, _no UB_ under the current wording of the standard, and a perfectly completed lifetime of the vector. There you have it.

### The Destructor Is Called, but the Object Is Already Dead

We've already seen this:

```cpp
{
std::string s("qwertyuiopasdfg");
s.~string(); // 1
...
}            // 2
```

- <sup>1</sup> First destruction of the object
- <sup>2</sup> Double destruction of the object

### The Destructor Is Called, but a Different Object Already Occupies the Storage

```cpp
{
    T t;
    new (&t) T; // 1
}               // 2
```

- <sup>1</sup> Reuse of the storage allocated for `t`. The destructor for the old object did not run
- <sup>2</sup> Implicit destructor call for the object - alive, but not the original one

It must be said that this is a very slippery topic - whether this is legal, and whether point 2 results in UB. The main problem here is the standard's lack of detail on the subject. I want to examine this story in more detail because it is illustrative and demonstrates the current state of affairs rather vividly.

Let's reread our fundamental paragraph on implicit destructor calls:

> **_Implicit destructor calls_**
> 
> **\[class.dtor\] p14**
> 
> A destructor is invoked implicitly
> - for **a constructed object** with static storage duration at program termination,
> - for **a constructed object** with thread storage duration at thread exit,
> - for **a constructed object** with automatic storage duration when the block in which an object is created exits,
> - for **a constructed temporary object** when its lifetime ends.
>     

"For a constructed object" - that's all we've got. Some interpret this in favor of the originally constructed object. In other words, we constructed an object at the beginning of the scope, and a destructor call was scheduled for it. Under this interpretation, when the time comes to call the destructor, the only correct option is to call it for the original live object.

Another interpretation is that "constructed object" means any live, constructed object. The current, rather rough paragraphs in **\[basic.life\]** support this interpretation, but they are just as open to broad interpretations due to their wording.

One of the most interesting things I stumbled across during my research was [a Stack Overflow post](https://stackoverflow.com/questions/52153673/why-isnt-it-undefined-behaviour-to-destroy-an-object-that-was-overwritten-by-pl). Yes, I ended up there in 2026, because I wanted to double-check the convincingly dubious theories produced by AI chats and read what actual people had to say about it. One of the answers mentioned that the author had contacted the Core team of the standardization committee about this question:

_\[class.dtor\]p12 isn't very accurate. I asked Core about it and_ [_Mike Miller (a very senior member) said_](http://lists.isocpp.org/core/2018/09/4948.php)_:_

> _I wouldn't say that it's a contradiction \[\[class.dtor\]p12 vs \[basic.life\]p9\], but clarification is certainly needed._ **_The destructor description was written slightly naively_**_, without taking into consideration that the original object occupying a bit of automatic storage might have been replaced by a different object occupying that same bit of automatic storage,_ **_but the intent was_** _that if a constructor was invoked on that bit of automatic storage to create an object therein - i.e., if control flowed through that declaration - then_ **_the destructor will be invoked for the object presumed to occupy that bit of automatic storage when the block is exited - even it it's not the "same" object that was created by the constructor invocation_**_._

Incidentally, you can see that since then (2018), the paragraph numbers have shifted somewhat - which is exactly why I don't want to overuse them in the article.

As we can see, the theory that "constructed object" means any live, constructed object seems to be correct. But I still urge you: **don't manually destroy an object on the stack**, don't create situations like this, DON'T PROVOKE IT - this area is murky, unstable, and requires personal explanations from committee members.

And besides, everything starts falling apart anyway if you take one step to the side. Look closely:

```cpp
{
std::vector<double> v(10);
new (&v) std::vector<int>; // 1

...
}                          // 2
```

- <sup>1</sup> Reuse of the storage allocated for `v`
- <sup>2</sup> UB

Can you guess where the UB comes from? _We changed the type_. From `std::vector<double>` to `std::vector<int>`. And everything falls apart - after all, the implicit destructor call was scheduled at compile time for the type `std::vector<double>`, and when reaching line 2 you will be attempting to call the destructor of `std::vector<double>` for an object of type `std::vector<int>`.

## Chapter takeaways

- Calling a destructor twice is UB
- A destructor is implicitly called at the end of the scope for an automatic variable, at the end of the program for a static variable, and at thread exit for a `thread_local` variable
- Destructors exist only for classes
- Scalars have pseudo-destructors
- Pseudo-destructors are not called implicitly
- Trivial destructors contain no logic/code in their body. Pseudo-destructors also have the properties of triviality, even though they are not destructors in the normal sense
- The standard still has room to grow in its description of the relationship between destructors and the end of an object's lifetime. At present, there are many omissions, and some paragraphs in **\[basic.life\]** have a tendency to be rewritten from one version to another
- It makes sense to rely only on time-tested, rock-solid rules about destructors and avoid wandering into territory where you get "Schrödinger's UB" - today the standard has no UB for you; tomorrow it does
- Don't speculate about trivial destructors - they are empty, but they are still called and they still destroy the object
- Don't manually destroy variables on the stack, static variables, or `thread_local` variables. The exception is provides-storage types. For ordinary types, it is safe to manually destroy an object if you allocated it on the heap

# The End

This article was primarily written for myself. If it clarified something for someone else as well, all the better. If you found a glaring error - write/call me immediately. If you found a minor issue - write to me, but there's no need to rush.