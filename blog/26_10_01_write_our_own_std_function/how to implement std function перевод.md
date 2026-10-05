---
tags:
  - article
  - cpp
title: How to implement std::function
url-title: how_to_implement_std_function
description: Why std::function? Because, surprisingly enough, an implementation of std::function touches on a large number of advanced techniques and language subtleties, and all of them are quite interesting for a curious C++ programmer.
keywords:
  - c++
  - function
image: https://habrastorage.org/webt/af/61/b6/af61b6d5ba81eced46acd5141b11ebda.jpg
date: 01.10.2026
---

![](https://habrastorage.org/webt/af/61/b6/af61b6d5ba81eced46acd5141b11ebda.jpg)

# Introduction

In this article, I want to dive into (and take the reader along with me into) the depths of C++, using the implementation of our own [`std::function`](https://en.cppreference.com/cpp/utility/functional/function) as an example. We’ll descend gradually and step by step, increasing the complexity as we go. I’ll try to explain everything as simply and clearly as possible, so that the barrier to entry is low and as many readers as possible can comfortably absorb the material.

Why `std::function`? Because, surprisingly enough, an implementation of `std::function` touches on a large number of advanced techniques and language subtleties, and all of them are quite interesting for a curious C++ programmer.

Recently, a Habr article by @dalerank, [C++101](https://habr.com/ru/articles/1044450/), was published with a huge list of established C++ idioms used in real-world production code. I think it complements this article perfectly, because as the narrative develops, we’ll see many of these idioms put into practice - in a concentrated form, inside one particular, reasonably compact class. And if you want to take a deeper look at any particular pattern, you can jump over to Sergey’s article for a more detailed introduction to the technique in question.

# Naive implementation

What is `std::function` at its core? It’s a wrapper around any object that can be _called_, whether it’s a lambda, a functor, or a function pointer. The key word here is "any". The wrapper should abstract us away from the concrete type of the object. This is where the first trick from the world of C++ comes to our rescue:

> In C++, you can always hide a concrete type **behind a template**. For example, we could wrap our object like this:

```cpp
template<typename F>
class Function
{
public:
    Function(F f)
        : m_f(std::move(f))
    {}

private:
    F m_f;
};
```

You can wrap _literally_ _anything_ this way. The other question is how we can actually use such a wrapper afterward. As soon as we need to call our object, we realize that we don't have the expressive power to describe the method we need:

```cpp
??? operator()(???... args) {
    return m_f(std::forward<???>(args)...);
}
```

And guess what? - we can add _even more_ template arguments to achieve exactly what we had in mind:

```cpp
template<typename F, typename Ret, typename ...Args>
class Function
{
public:
    Function(F f)
        : m_f(std::move(f))
    {}

    Ret operator()(Args... args) {
        return m_f(std::forward<Args>(args)...);
    }

private:
    F m_f;
};
```

And just like that, right at the very beginning of the article, we already have a more or less working solution. Yes, this code actually works:

```cpp
auto discriminant = [](float a, float b, float c) {
    return b * b - 4 * a * c;
};
Function<decltype(discriminant), float, float, float, float> f = discriminant;

auto res = f(1, 2, 3);
```

But as you can see, this implementation has a serious problem with how the template arguments are specified - we have to break out `decltype` and express the type of the first argument in terms of the argument itself, which is, firstly, cumbersome and, secondly, not always possible.

Now remember how conveniently the type of the same kind of object is expressed with `std::function`:

```cpp
Function<float(float, float, float)> f;
```

Two differences immediately stand out:

- The type of the wrapped object - that very first argument - isn't used at all
- Somehow, magical parentheses have appeared in the argument list, allowing us to describe the arguments in the natural "signature" syntax used by functions

We'd like to achieve the same thing.

# Type erasure

Let's get rid of `typename F` from the class declaration. In general, we don't have to get rid of `typename F` entirely - we can try moving it to a more secluded place. A good candidate for hiding `typename F` is the constructor, because calling such a constructor will allow `F` to be deduced automatically, which is exactly what we need:

```cpp
template<typename Ret, typename ...Args>
class Function
{
public:
    template <typename F>
    Function(F&& f)
        : m_f(f)
    {}

...

private:
    ??? m_f;
};
```

As we can see, sweeping the template argument under the constructor narrows its "scope" - now it is, _suddenly_, visible only inside the constructor, and outside of it the class has no idea that `F` even exists. How we're supposed to declare `m_f` now is anyone's guess. By taking its template parameter away, we've also taken away its ability to tell the compiler what its type is at compile time.

The type of `m_f` still needs to be abstract and generic - after all, that's the whole point of wrapping an object. But we've hit a dead end with templates - we need some other mechanism. And C++ has one:

> If **static polymorphism** - that is, templates - is no longer up to the task, there's a good chance you need **dynamic polymorphism** - that is, a **polymorphic base class** with virtual functions

How do we switch from a template type to a dynamic runtime type? With templates, it was simple - the compiler took the programmer at their word that everything the code did with type `F` was allowed. And if the code successfully compiled with a particular substituted type, then everything was fine.

With dynamic types, we don't have that luxury, so we'll have to describe manually what the type can do. In our case, pretty much the only thing we require from the object is the ability to call it through some kind of `call`, so I envision the base class looking roughly like this:

```cpp
struct FuncInterface
{
    virtual Ret call(Args... args) const = 0;
    virtual ~FuncInterface() {}
};
```

A perceptive reader might ask - what are `Ret` and `Args`? I plan to make `FuncInterface` a nested class inside our `Function`, so the full picture will look like this:

```cpp
template <typename Ret, typename... Args>
class Function
{
...
private:
    struct FuncInterface
    {
        virtual Ret call(Args... args) const = 0;
        virtual ~FuncInterface() {}
    };
...
    std::unique_ptr<FuncInterface> m_f;
};
```

So `Ret` and `Args` remain template arguments. And notice that we've now managed to resolve the type of `m_f` - it's a polymorphic runtime class allocated on the heap. Quite a symbiosis of templates and virtual functions. But this is only the beginning!

Watch closely: we have our `FuncInterface` base class. But who is going to derive from it? And how do we create an instance of such an object? Let's start feeling our way around, beginning with the constructor:

```cpp
template <typename Ret, typename... Args>
class Function
{
public:
    template <typename F>
    Function(F&& f) {
        m_f = std::make_unique<FuncImpl<F>>(std::forward<F>(f));
    }
...
};
```

See `FuncImpl<F>`? Obviously, this thing needs to inherit from `FuncInterface` for our plan to work. It also needs to be a template class so that it knows about `F`. _Quite a symbiosis of templates and virtual functions_. Phew.

Let's try to describe what we have in mind:

```cpp
template <typename Ret, typename... Args>
class Function
{
public:
    template <typename F>
    Function(F&& f) {
        m_f = std::make_unique<FuncImpl<F>>(std::forward<F>(f));
    }

private:
    struct FuncInterface
    {
        virtual Ret call(Args... args) const = 0;
        virtual ~FuncInterface() {}
    };

    template <typename F>
    struct FuncImpl final : public FuncInterface
    {
        F m_f;

        FuncImpl(F f)
            : m_f(std::move(f))
        {}

        Ret call(Args... args) const override {
            return m_f(std::forward<Args>(args)...);
        }
    };

    std::unique_ptr<FuncInterface> m_f;
};
```

Now, to call the functor, all we need to do is call the `call` method on the internal wrapper:

```cpp
template <typename Ret, typename... Args>
class Function
{
public:
...
    Ret operator()(Args... args) {
        return m_f->call(std::forward<Args>(args)...);
    }
...
};
```

And it works. We have just implemented an idiom called **Type Erasure**, which is used in virtually every canonical implementation of `std::function` and `std::any` - that is, whenever we need to erase and anonymize a concrete type.

Let's take another look at the resulting code to understand what's actually going on, because it's quite non-trivial from the perspective of typical C++ and may cause a headache for anyone seeing it for the first time.

The main idea is that, in our quest to hide type `F`, we first moved it into the constructor, and then passed the baton further - to the inner class `FuncImpl<F>`, where it eventually settled. Inside this class, we can still work with `F` as a template parameter. But to keep it from leaking outside, we derived `FuncImpl<F>` from `FuncInterface` and used that boundary to provide a clever conversion from templates to virtual functions. We expose the virtual interface to the outside world and pretend that the template doesn't exist at all, when in reality it has simply been cleverly hidden away. **Quite a symbiosis of templates and virtual functions.**

The funniest thing about this idiom is that, in practice, all the code we've written is just boilerplate for fighting the very nature of C++ - its type system. On top of that, this approach has significant overhead - we know that virtual functions come with the cost of indirect calls and a virtual table. Worse, we now have a heap allocation. And all of this is solely to fight the language's type system. In other words, this is one of those moments when **you pay for something you never planned to use** - you were simply forced to.

---

But we still have a long way to go, and we'll try to mitigate these problems. For now, though, I'll allow myself a couple of small pedantic fixes to the code.

First: a template type passed to the constructor should ideally be stripped of all the unnecessary baggage. This can include references, cv-qualifiers, indirection - pretty much anything. So it's good practice to clean up the type using `std::decay`:

```cpp
template <typename F>
Function(F&& f) {
    using Fn = std::decay_t<F>;
    m_f = std::make_unique<FuncImpl<Fn>>(std::forward<F>(f));
}
```

Second: let's immediately lay the groundwork for the desired const-correctness behavior. We want both our `Function::operator()` and `FuncImpl::call()` to be const _always_, even if the object inside changes its state when called. Why? Because the mutability of the wrapped object is none of `Function`'s concern. It's simpler and cleaner to make `Function` const always. This is, among other things, how `std::function` behaves.

On top of that, the constructor for `FuncImpl` should be improved and turned into a forwarding constructor, so that it can accept the object without unnecessary copies or moves. Let's implement both changes at once:

```cpp
template <typename F>
struct FuncImpl final : public FuncInterface
{
    mutable F m_f;

    template<typename U>
    FuncImpl(U&& f)
        : m_f(std::forward<U>(f))
    {}

    ...
};
```

To implement this, we added `mutable` to `m_f` and made the constructor a template.

Third: we'd like to return to the problem of function-signature notation. For now, we still have one difference from `std::function`:

```cpp
Function<float, float, float, float> f = discriminant;

...

std::function<float(float, float, float)> f = discriminant;
```

There is a solution to this, and I can't offer anything more useful than simply memorizing it:

```cpp
template<typename>
class Function;

template<typename Ret, typename ...Args>
class Function<Ret(Args...)>
{
    ...
}
```

"What is going on here?" was my first thought when I saw this. Here's what happens. First, we declare an empty primary template for `Function<>`. Nobody will ever use it. `class Function<Ret(Args...)>`, on the other hand, is a _partial specialization_ of the template for a function type. The language thoughtfully provides a way to write a type as `Ret(Args...)`. This is an interesting notation because, technically speaking, it is _one argument_, but a composite one containing `Ret` and `Args`. This will be the only specialization for `Function`, and from now on we are forced to use it:

```cpp
Function<float(float, float, float)> f = discriminant;
```

And that's exactly what we wanted.
# In-place storage

`std::function` is often used when a function needs to accept arbitrary logic as a parameter. Back in the days of ancient C++, a plain function pointer could be used for this - the canonical callback. But in the modern world, we often want to pass a lambda that captures variables, with some context. And there is practically no alternative to `std::function` for this kind of parameter.

Now imagine that such a function with a `std::function` parameter becomes part of hot code, meaning it gets called an enormous number of times. This is where we inevitably run into the main problem Type Erasure has given us - heap allocations. They are always expensive, and under load - they are **very** expensive.

> It's not only allocations that can be expensive, but, surprisingly enough, _deallocations_ as well.

The standard `std::function` solved this problem with its most important optimization:

> **Small Object Optimization**. Also known by the abbreviations SOO, SSO, and SBO. From now on, though, I'll call it **In-place storage**, simply because I like the name better. And we'll be adding it to our `Function`.
> 
> The idea behind the optimization is elegant: if the object we're responsible for is small enough, we don't need to allocate space for it on the heap - we can place it directly inside ourselves. All we need to do is reserve some space for it, and the size of that space depends on what you are more willing to sacrifice - a little extra memory or a few allocations.

Without this optimization, our `Function` currently has the size of `sizeof std::unique_ptr<>`, which is 8 bytes. Usually, the object is expanded to 16 or 24 bytes - depending on how much memory you're willing to sacrifice. We'll settle on the exact size as the story unfolds.

---

The first thing standing in the way of implementing this optimization is `std::unique_ptr<>`, whose interface severely limits our ability to construct and destroy objects, so we'll regress to a good old raw pointer.

```cpp
// was
std::unique_ptr<FuncInterface> m_f;

// became
FuncInterface* m_f;
```

Now let's introduce some constants describing our in-place storage:

```cpp
static constexpr size_t INPLACE_SIZE = 8;
static constexpr size_t INPLACE_ALIGNMENT = alignof(std::max_align_t);
```

As you can see, for now I've decided to use in-place storage only for objects up to 8 bytes. And that's small. **Really** small. But soon we'll see that putting ourselves under these rather harsh constraints will actually work in our favor. As for alignment, we've tried to make it as democratic as possible, so that _almost_ anything can fit into our storage.

Now we're all set to give our pointer a bit of a split personality:

```cpp
union {
	FuncInterface* m_heap;
	alignas(INPLACE_ALIGNMENT) std::byte m_inplace[INPLACE_SIZE];
};

bool m_isInplace = false;
```

The old-school `union` ~~is better than two shiny new~~ `~~std::variant~~`~~s~~ is the canonical solution for SSO optimization. Note that `m_inplace` is simply a byte array aligned to `INPLACE_ALIGNMENT`. It's ready to host any object that meets our criteria. No SMS and no allocations. It makes sense to put these straightforward criteria into a separate `constexpr` function:

```cpp
template<typename F>
static constexpr bool DoesFitInplace() {
	return sizeof(F) <= INPLACE_SIZE && alignof(F) <= INPLACE_ALIGNMENT;
}
```

This method will determine the object's fate as early as the creation of `Function`: if the object's type allows it to fit inside our storage, it will live in `m_inplace`; otherwise, it will be honestly allocated in `m_heap`. And `Function`'s code will account for this duality everywhere:

```cpp
template<typename Ret, typename ...Args>
class Function<Ret(Args...)>
{
public:
    template <typename F>
    Function(F&& f) {
        using Fn = std::decay_t<F>;
        using WrapperT = FuncImpl<Fn>;

        if constexpr (DoesFitInplace<WrapperT>()) {
            new (m_inplace) WrapperT(std::forward<F>(f));
            m_isInplace = true;
        } else {
            m_heap = new WrapperT(std::forward<F>(f));
            m_isInplace = false;
        }
    }

    ~Function() {
        FuncInterface* ptr = getPtr_();
        if (m_isInplace) {
            ptr->~FuncInterface();
        } else {
            delete ptr;
        }
    }

    Ret operator()(Args... args) const {
        return getPtr_()->call(std::forward<Args>(args)...);
    }

private:
    struct FuncInterface
    {
        virtual Ret call(Args... args) const = 0;
        virtual ~FuncInterface() {}
    };

    template <typename F>
    struct FuncImpl final : public FuncInterface
    {
        F m_f;

        FuncImpl(F f)
            : m_f(std::move(f))
        {}

        Ret call(Args... args) const override {
            return m_f(std::forward<Args>(args)...);
        }
    };

    static constexpr size_t INPLACE_SIZE = 8;
    static constexpr size_t INPLACE_ALIGNMENT = alignof(std::max_align_t);

    template<typename F>
    static constexpr bool DoesFitInplace() {
        return sizeof(F) <= INPLACE_SIZE && alignof(F) <= INPLACE_ALIGNMENT;
    }

    const FuncInterface* getPtr_() const {
        if (m_isInplace) {
            return std::launder(reinterpret_cast<const FuncInterface*>(m_inplace));
        } else {
            return m_heap;
        }
    }

    FuncInterface* getPtr_() {
        return const_cast<FuncInterface*>(
            std::as_const(*this).getPtr_()
        );
    }

    union {
        FuncInterface* m_heap;
        alignas(INPLACE_ALIGNMENT) std::byte m_inplace[INPLACE_SIZE];
    };
    
    bool m_isInplace = false;
};
```

As you can see, we even managed to hide the heap/in-place duality behind the `_getPtr()` method. Explicit access to `m_isInplace` is now limited to the constructor and destructor.

> The resulting constructor, destructor, and `_getPtr()` are excellent real-world examples for brushing up on some genuinely advanced language nuances, such as:
> 
> - What is the difference between an expression `new` and `operator new`
> - What is placement `new`, what does its syntax look like, and does it allocate memory
> - When and why we might need to call a destructor manually
> - What `std::launder` is for, and why we need it specifically in our case
> 
> If you're shaky on these topics, I'll send you over to my article about [object lifetimes in C++](https://habr.com/ru/articles/1070000/) for the answers. Just make sure you come back alive ;) In the **Provides Storage** chapter, you'll find an example involving `std::launder` that is similar to our `getPtr_()`.

## In-place problem

After adding in-place storage to `Function`, I wanted to enjoy the fruits of my labor and see with my own eyes how small functors would be placed in the buffer instead of being allocated on the heap. I added a simple `std::cout` to the constructor:

```cpp
template<typename F>
Function(F f)
{
	...
	
	if constexpr (DoesFitInplace<WrapperT>()) {
		std::cout << "inplace!\n";
		...
	} else {
		...
	}
}
```

and ran the `Function` tests on a bunch of different objects. Know what I got? Nothing. Not a single enthusiastic "inplace!" in the console. That was strange, because a lambda like

```cpp
auto lambda = []() { std::cout << "YEAH"; };
```

takes up practically no space - my, admittedly rather modest, 8 bytes of in-place storage should have been enough.

So I started printing the sizes of the original object and the wrapper storing it:

```cpp
template<typename F>
Function(F f)
{
	using Fn = std::decay_t<F>;
	using WrapperT = FuncImpl<Fn>;

	std::cout << "callable size: " << sizeof(Fn) << "\n"
			  << " wrapper size: " << sizeof(WrapperT) << "\n";

	if constexpr (DoesFitInplace<WrapperT>()) {
		std::cout << "inplace!\n";
		...
	} else {
		...
	}
}
```

And this is what I saw:

```cpp
callable size: 1
 wrapper size: 16
 
callable size: 8
 wrapper size: 16
 
callable size: 64
 wrapper size: 72
 
callable size: 48
 wrapper size: 56

callable size: 4
 wrapper size: 16

callable size: 16
 wrapper size: 24
```

FFFUUU!!1

My lambda could have been as small as 1 byte and still wouldn't fit into the buffer, because the wrapper was always _at least 16 bytes_ in size!

I immediately understood the problem: `FuncImpl<Fn>` carries an 8-byte pointer to the virtual table, which by itself is enough to consume the entire buffer. The memory layout of such a wrapper would look roughly like this:

```
00 xxxxxxxx  vtable
08 x.......  lambda
```

The x's are occupied bytes, while the dots are padding for 8-byte alignment.

Wasted. For now, let's just quietly harbor a grudge, increase the in-place storage size to 16 bytes

```cpp
static constexpr size_t INPLACE_SIZE = 16;
```

and move on. But first, let's make sure it actually works:

```cpp
callable size: 1
 wrapper size: 16
inplace!

callable size: 8
 wrapper size: 16
inplace!

callable size: 64
 wrapper size: 72
 
callable size: 48
 wrapper size: 56
 
callable size: 4
 wrapper size: 16
inplace!

callable size: 16
 wrapper size: 24
```

It works.
# Copy/move

Let's add copy/move semantics support to `Function`.

First, let's prepare the ground. First of all,

> A move constructor should be `noexcept` - that's the baseline. Even `std::vector` doesn't always use move semantics if its elements can throw during a move

When the object is stored on the heap, everything will be fine - we'll simply move a couple of pointers around. But if our object lives in in-place storage, moving it means calling the move constructor of the stored object, and theoretically that can throw. The least troublesome approach is to make sure that objects placed in in-place storage are nothrow-move-constructible:

```cpp
template <typename F>
static constexpr bool DoesFitInplace() {
	return sizeof(F) <= INPLACE_SIZE
		&& alignof(F) <= INPLACE_ALIGNMENT
		&& std::is_nothrow_move_constructible_v<F>;
}
```

Second, we're about to add some new constructors to the class, while our current, so far only constructor

```cpp
template <typename F> Function(F&& f);
```

is implemented in such a way that it can swallow pretty much anything you throw at it, leaving the other constructors out in the cold. We need to somehow narrow its scope. Let's assume that copy and move constructors only work with the type `Function<...>`. This means we can use some clever SFINAE to isolate our all-you-can-eat constructor from this type and let it accept everything else:

```cpp
template <typename F, typename = std::enable_if_t<!std::is_same_v<std::decay_t<F>, Function>>>
Function(F&& f) {
```

---

Let's move on to implementing the constructors and assignment operators.

> Usually, the [copy-and-swap](https://nitinsharmacs.github.io/notes/tech/c++/copy-and-swap-idiom) idiom is a convenient way to implement exception-safe copy/move semantics. But it looks elegant and works efficiently only when `std::swap` can be implemented easily for the class.

With in-place storage, we're ruling ourselves out of that option - once you imagine moving data from in-place storage to the heap and back again, you'll simply stop wanting to do it :)

So we'll take a different approach: if we carefully perform the copy or move steps in the right order, we can achieve strong exception safety even without the copy-and-swap idiom. Our goal is to implement a destructor, copy and move constructors, and copy and move assignment operators. They are almost always implemented in a rather repetitive way on top of a few helper functions: `destroy_`, `copyFrom_`, `moveFrom_`:

```cpp
public:
    ~Function() noexcept {
        destroy_();
    }

    Function(const Function& other) {
        copyFrom_(other);
    }

    Function(Function&& other) noexcept {
        moveFrom_(std::move(other));
    }

    Function& operator=(const Function& other) {
        if (this == &other)
            return *this;

        Function tmp(other);
        destroy_();
        moveFrom_(std::move(tmp));

        return *this;
    }

    Function& operator=(Function &&other) noexcept {
        if (this == &other)
            return *this;

        destroy_();
        moveFrom_(std::move(other));

        return *this;
    }
```

The copy assignment operator achieves strong exception safety thanks to the local copy `tmp`. If an exception occurs while copying into `tmp`, the original object remains untouched. Our move assignment operator cannot throw because we took care of that in advance.

Now for the helper functions. All of them will have the heap/in-place duality. However, as soon as we start implementing them, we realize we're missing something:

```cpp	
private:
    void destroy_() noexcept {
        FuncInterface* ptr = getPtr_();
        if (m_isInplace) {
            ptr->~FuncInterface();
        } else {
            if (ptr) {
                delete ptr;
            }
        }
    }

    void copyFrom_(const Function& other) {
        m_isInplace = other.m_isInplace;
        if (m_isInplace) {
            new (m_inplace) ???(other.???)
        } else {
            m_heap = new ???(other.???);
        }
    }

    void moveFrom_(Function&& other) noexcept {
        m_isInplace = other.m_isInplace;
        if (m_isInplace) {
            new (m_inplace) ???(std::move(other.???));
        } else {
            m_heap = other.m_heap;
            other.m_heap = nullptr;
        }
    }
```

We're missing knowledge of the original type `F`, which was stolen from us a long time ago. Miraculously, `destroy_` escaped this fate. The only way around the problem is to expose all the missing operations in the public interface, so that we can implement them where the type `F` is still available - inside `FuncImpl`.

Wherever we had `???` in the code, we're missing a corresponding function in `FuncInterface`. There are three such places in total:

- Copying the object into in-place storage
- Copying the object onto the heap
- Moving the object into in-place storage

Attention, a semantic shift is about to occur: while the move and copy assignment operators performed the action "we'll take someone else's stuff", our current functions reverse the direction - they will be "giving our stuff to someone else". This happens because it is the _source_ object, with its heap/in-place duality, that needs to handle how and where to give away its data, while the receiving object merely provides the place where the data should be put.

The extended `FuncInterface`:

```cpp
struct FuncInterface
{
	virtual Ret call(Args... args) const = 0;
	virtual FuncInterface* copyToHeap() const = 0;
	virtual void copyToPlace(void* place) const = 0;
	virtual void moveToPlace(void* place) = 0;
	virtual ~FuncInterface() {}
};
```

The implementation of these methods in `FuncImpl` is trivial:

```cpp
template <typename F>
struct FuncImpl final : public FuncInterface
{
	mutable F m_f;

	template <typename U>
	FuncImpl(U&& f)
		: m_f(std::forward<U>(f))
	{}

	Ret call(Args... args) const override {
		return m_f(std::forward<Args>(args)...);
	}

	FuncInterface* copyToHeap() const override {
		return new FuncImpl(m_f);
	}

	void copyToPlace(void* place) const override {
		new (place) FuncImpl(m_f);
	}

	void moveToPlace(void* place) override {
		new (place) FuncImpl(std::move(m_f));
	}
};
```

And now we can return to our "building blocks" and finish implementing `copyFrom_` and `moveFrom_`:

```cpp
void copyFrom_(const Function& other) {
	const FuncInterface* srcPtr = other.getPtr_();

	m_isInplace = other.m_isInplace;
	if (m_isInplace) {
		srcPtr->copyToPlace(m_inplace);
	} else {
		m_heap = srcPtr->copyToHeap();
	}
}

void moveFrom_(Function&& other) noexcept {
	FuncInterface* srcPtr = other.getPtr_();

	m_isInplace = other.m_isInplace;
	if (m_isInplace) {
		srcPtr->moveToPlace(m_inplace);
	} else {
		m_heap = other.m_heap;
		other.m_heap = nullptr;
	}
}
```

Done - copy/move semantics are supported.
# VTable problems

Let's return to the problem of virtual tables. As a reminder, in every object of type `struct FuncImpl<F> : FuncInterface`, the first 8 bytes are occupied by the virtual table. These are 8 bytes that sit dead weight in our in-place storage, while not even belonging to the object we're storing - after all, this is the _wrapper's_ virtual table. As a result, we lose a significant number of cases where in-place optimization could have been used, simply because the vtable took up the space.

For obvious reasons, there's nothing we can do about this - C++ itself dictates the rules of the game here. All that's left is: **BREAK THE PARADIGM**.

> If the standard inheritance and virtual table mechanism in C++ doesn't work for you, **you can always write your own mechanism**. Even in C, people often write their own implementations to emulate C++ features.
> 
> The advantage of rolling your own mechanism is that you get control over where and how the virtual table is stored; how it is structured; what its lifetime and rules are

Phew. As flexible as this sounds, it also promises to be complicated. But we're already knee-deep in it - what have we got to lose? Besides, this will be invaluable experience. And since I know how the article ends, I'll tell you that this solution will give us some major bonuses beyond our current goal of saving space in the in-place buffer.

---

At its core, a virtual table is a very simple concept. It's an object containing pointers to functions, nothing magical. And describing the table itself will be quite easy. We simply take our `FuncInterface`:

```cpp
struct FuncInterface
{
	virtual Ret call(Args... args) const = 0;
	virtual FuncInterface* copyToHeap() const = 0;
	virtual void copyToPlace(void* place) const = 0;
	virtual void moveToPlace(void* place) = 0;
	virtual ~FuncInterface() {}
};
```

and rewrite each virtual function so that it becomes a classic C-style function pointer:

```cpp
struct VTable
{
	Ret (*call)(void*, Args... args);
	void* (*copyToHeap)(const void*);
	void (*copyToPlace)(const void*, void* place);
	void (*moveToPlace)(void*, void* place);
	void (*destroy)(void*, bool isInplace);
};
```

Notice that we no longer have `this`, so the pointer to the object is passed explicitly as the first parameter, and its type is hidden behind `void*`. We also replaced the destructor with `destroy` and plan to put all the logic that previously lived in `Function::destroy_()` there - it seemed appropriate to me.

We've managed to replace `FuncInterface` with `VTable` - now it's time to replace `FuncImpl<F>` with something new. There will be _no inheritance_ anymore. So what do we do? How do we implement the concrete function specializations and populate the virtual table with them? And how do we then construct and provide the correct table to a particular `Function<>`? Let's reason through it step by step:

- We still need `typename F` - without this type, type erasure falls apart
- Functions specialized for a particular `F` can simply be static functions located _somewhere_ - it doesn't even matter where
- There must be a virtual table for each `F`, whose fields point to the functions from the previous item
- In the `Function<F>(F&& f)` constructor, the table for the specific `F` must be found and stored by the class for later use

All right - if each `F` needs its own set of static functions and its own virtual table, it makes sense to put all of them inside the body of a templated structure:

```cpp
template <typename F>
struct VTableFor
{
	static Ret call(void* obj, Args... args) {
		F& callable = *std::launder(static_cast<F*>(obj));
		return callable(std::forward<Args>(args)...);
	}

	static void* copyToHeap(const void* obj) {
		const F& callable = *std::launder(static_cast<const F*>(obj));
		return new F(callable);
	}

	static void copyToPlace(const void* obj, void* place) {
		const F& callable = *std::launder(static_cast<const F*>(obj));
		new (place) F(callable);
	}

	static void moveToPlace(void* obj, void* place) {
		F& callable = *std::launder(static_cast<F*>(obj));
		new (place) F(std::move(callable));
	}

	static void destroy(void* obj, bool isInplace) {
		F* callable = std::launder(static_cast<F*>(obj));
		if (isInplace) {
			callable->~F();
		} else {
			if (callable) {
				delete callable;
			}
		}
	}

	static const VTable vtable;
};
```

The table is made `const` _intentionally_ - we now have no choice but to explicitly initialize it somewhere with pointers to the static functions:

```cpp
template <typename Ret, typename... Args>
template <typename F>
/*static*/ const typename Function<Ret(Args...)>::VTable
Function<Ret(Args...)>::VTableFor<F>::vtable = {
    &VTableFor<F>::call,
    &VTableFor<F>::copyToHeap,
    &VTableFor<F>::copyToPlace,
    &VTableFor<F>::moveToPlace,
    &VTableFor<F>::destroy
};
```

The syntax looks terrifying, but in reality all the complexity lies in navigating your way to the `VTable` and `vtable` identifiers buried deep inside the template thicket.

Now for the reason we went through all of this: the `Function` class will have its own virtual table, located _outside_ the in-place storage, while the stored object will _single-handedly_ occupy all the space in the heap and/or stack:

```cpp
union {
	void* m_heap;
	alignas(INPLACE_ALIGNMENT) std::byte m_inplace[INPLACE_SIZE];
};

const VTable* m_vtable = nullptr;
bool m_isInplace = false;
```

So yes - we didn't perform any special magic, we didn't save 8 bytes, they simply moved somewhere else. But this was a strategically advantageous move, because in-place storage can now accommodate many more objects at the same buffer size.

We still have one final touch left in setting up the virtual table when creating `Function`:

```cpp
template <typename F, typename = std::enable_if_t<!std::is_same_v<std::decay_t<F>, Function>>>
Function(F&& f) {
	using Fn = std::decay_t<F>;

	if constexpr (DoesFitInplace<Fn>()) {
		new (m_inplace) Fn(std::forward<F>(f));
		m_isInplace = true;
	} else {
		m_heap = new Fn(std::forward<F>(f));
		m_isInplace = false;
	}

	m_vtable = &VTableFor<Fn>::vtable;
}
```

And now we simply rewrite every place where we previously accessed the polymorphic wrapper to use the vtable instead, barely changing the structure of the code:

```cpp
Ret operator()(Args... args) const {
	return m_vtable->call(getPtr_(), std::forward<Args>(args)...);
}

void destroy_() noexcept {
	m_vtable->destroy(getPtr_(), m_isInplace);
}

void copyFrom_(const Function& other) {
	const void* srcPtr = other.getPtr_();

	m_isInplace = other.m_isInplace;
	if (m_isInplace) {
		other.m_vtable->copyToPlace(srcPtr, m_inplace);
	} else {
		m_heap = other.m_vtable->copyToHeap(srcPtr);
	}

	m_vtable = other.m_vtable;
}

void moveFrom_(Function&& other) noexcept {
	void* srcPtr = other.getPtr_();

	m_isInplace = other.m_isInplace;
	if (m_isInplace) {
		other.m_vtable->moveToPlace(srcPtr, m_inplace);
	} else {
		m_heap = other.m_heap;
		other.m_heap = nullptr;
	}

	m_vtable = other.m_vtable;
}
```

Note that in `copyFrom_` and `moveFrom_`, we now also need to make sure we overwrite `m_vtable`, so that it doesn't remain from the old object.

# Hot/Cold

What operations are performed most often on `std::function`/`Function`? Obviously, we _call_ it like an ordinary function. This is naturally the dominant use case for this kind of class - they are literally designed to be called.

What happens to the CPU cache every time `Function` is called again? Let's trace it: `operator()` calls `m_vtable->call()`. But to get to `call()`, the contents of the virtual table must make their way into the cache, _in its entirety_:

```cpp
struct VTable
{
    Ret (*call)(void*, Args... args);
    void* (*copyToHeap)(const void*);
    void (*copyToPlace)(const void*, void* place);
    void (*moveToPlace)(void*, void* place);
    void (*destroy)(void*, bool isInplace);
};
```

All five 8-byte pointers end up in the cache every time you try to call the `Function` functor. That's 40 bytes of cache for a single `Function`. At the same time, there is a very good chance that none of the other four pointers will be used at all - copy, move, and destruction operations are extremely rare compared to `call`.

> On the hot path, optimizing cache usage takes one of the leading roles. Any unnecessary data that makes its way into the cache occupies space that could have been used by other, more relevant data from memory.
> 
> If you have frequently used data and rarely used data, you can separate them somewhat so that using the hot data doesn't drag the cold data into the cache.

The solution to our particular problem is remarkably simple - we can split the virtual table into two: hot and cold:

```cpp
struct HotVTable
{
    Ret (*call)(void*, Args... args);
};

struct ColdVTable
{
    void* (*copyToHeap)(const void*);
    void (*copyToPlace)(const void*, void* place);
    void (*moveToPlace)(void*, void* place);
    void (*destroy)(void*, bool isInplace);
};
```

Now the `Function` class will have two tables instead of one:

```diff
-const VTable* m_vtable = nullptr;
+const HotVTable* m_hotVtable = nullptr;
+const ColdVTable* m_coldVtable = nullptr;
```

The call operator goes through the "dedicated" hot channel:

```cpp
Ret operator()(Args... args) const {
	return m_hotVtable->call(getPtr_(), std::forward<Args>(args)...);
}
```

Only one pointer comes into the cache. The utility functions remain in the cold table until they're needed.

But we can make it _even_ more efficient. Look at these two places in the code:

```cpp
const HotVTable* m_hotVtable = nullptr;

...

struct HotVTable
{
    Ret (*call)(void*, Args... args);
};
```

This is literally a chain of "pointer to pointer". And since there is only one pointer in the table, this indirection is _unnecessary_, and we can eliminate it by getting rid of `HotVTable` altogether and keeping a bare function pointer:

```cpp
Ret(*m_call)(void*, Args... args) = nullptr;
const ColdVTable* m_coldVtable = nullptr;
```

We modify `Function::operator()`:

```cpp
Ret operator()(Args... args) const {
    return m_call(getPtr_(), std::forward<Args>(args)...);
}
```

Extremely pleasant optimizations. And the coolest part is that they became possible only because we abandoned standard C++ virtual tables.

# FunctionBuffer

After all the metamorphoses and transformations, the data members of the `Function` class look like this:

```cpp
union {
	void* m_heap;
	alignas(INPLACE_ALIGNMENT) std::byte m_inplace[INPLACE_SIZE];
};

Ret(*m_call)(void*, Args... args) = nullptr;
const ColdVTable* m_coldVtable = nullptr;
bool m_isInplace = false;
```

Look at `bool m_isInPlace` - it sticks in my craw, and there are two reasons for that.

First, this field takes up not one byte, as it should (ideally, it should take up a single bit, but alas - we live in a world where that isn't the case), but a full eight bytes due to the memory layout of our `Function<F>` class:

```
00 xxxxxxxx  union
08 xxxxxxxx  union
16 xxxxxxxx  m_call
24 xxxxxxxx  m_coldVtable
32 x.......  m_isInPlace
```

As you can see, `m_isInPlace` is a lonely `bool` among a neat row of 8-byte pointers, and unfortunately it can't squeeze itself into our memory without eating up an additional 7 bytes of padding.

When `INPLACE_SIZE` was 8 bytes, the class was 24 bytes in size. Now that I've increased `INPLACE_SIZE` to 16 bytes, the class has grown to 40 bytes.

> A cache line is **64 bytes** on modern architectures. If you're unsure, C++ provides the constants [`std::hardware_destructive_interference_size`](https://en.cppreference.com/cpp/thread/hardware_destructive_interference_size) and [`std::hardware_constructive_interference_size`](https://en.cppreference.com/cpp/thread/hardware_destructive_interference_size), which return the exact figures for your platform.
> 
> Use `std::hardware_destructive_interference_size` if you need the minimum distance at which two objects need to be **separated** to prevent [false sharing](https://en.wikipedia.org/wiki/False_sharing).  
> Use `std::hardware_constructive_interference_size` if you need the size within which objects should be located to achieve [true sharing](https://en.wikipedia.org/wiki/False_sharing).  
> Usually, both constants are equal.

Neither of our sizes - 24 or 40 - fits nicely into a cache line. If we could get rid of `m_isInPlace`, we'd get a size of 32 bytes - exactly 2 objects per 64-byte cache line. That's the ideal our class can strive for.

Second, I _suspect_ that, purely theoretically, the `m_isInPlace` flag could always be determined at compile time. We already do exactly that in one particular place:

```cpp
template <typename F>
Function(F&& f) {
	using Fn = std::decay_t<F>;
	using WrapperT = FuncImpl<Fn>;

	if constexpr (DoesFitInplace<WrapperT>()) {
		new (m_inplace) WrapperT(std::forward<F>(f));
		m_isInplace = true;
	} else {
		m_heap = new WrapperT(std::forward<F>(f));
		m_isInplace = false;
	}
}
```

See? - `if constexpr (DoesFitInplace<WrapperT>())`. I'm convinced that this approach can be applied to all the other cases where we currently check the `m_isInPlace` flag at runtime. And that means that by eliminating this flag, we won't just get a more cache-friendly memory layout - we'll also save on computation: the branches will disappear, which should make our CPU quite happy.

> `if constexpr` is no longer a branch for the CPU! Code will be generated for only one of the execution paths.

How do we pull this off? Let's look at the current virtual table:

```cpp
struct ColdVTable
{
    void* (*copyToHeap)(const void*);
    void (*copyToPlace)(const void*, void* place);
    void (*moveToPlace)(void*, void* place);
    void (*destroy)(void*, bool isInplace);
};
```

The first thing that stands out is that the interface clearly separates the stack/heap duality and thus removes the responsibility for checking and managing this aspect from itself. All of that falls on the calling code:

```cpp
void copyFrom_(const Function& other) {
	const void* srcPtr = other.getPtr_();

	m_isInplace = other.m_isInplace;
	if (m_isInplace) {
		other.m_vtable->copyToPlace(srcPtr, m_inplace);
	} else {
		m_heap = other.m_vtable->copyToHeap(srcPtr);
	}

	m_vtable = other.m_vtable;
}
```

The `destroy` function stands somewhat apart and hints at what a solution might look like:

```cpp
template <typename F>
struct VTableFor
{
    ...
	static void destroy(void* obj, bool isInplace) {
		F* callable = std::launder(static_cast<F*>(obj));
		if (isInplace) {
			callable->~F();
		} else {
			if (callable) {
				delete callable;
			}
		}
	}
	...
}
```

But again, we're passing the `isInplace` flag at runtime here, so this is only a hint at the solution, not the solution itself.

Now notice that the object the virtual table operates on is a `void*`, and this is nothing other than our original callable itself, so inside the virtual table we simply cast it back to the original type and use it for its intended purpose:

```cpp
static Ret call(void* obj, Args... args) {
	F& callable = *std::launder(static_cast<F*>(obj));
	return callable(std::forward<Args>(args)...);
}
```

At this point, the provenance of the `void*` pointer is unknown to us - it may point either to the heap or to the in-place storage inside our `Function`. And that's the core problem.

We can solve it by slightly shifting our perspective - what if the virtual table operated not on a `void*`, but on that very `union` living inside `Function`? Then we'd have all the information we need. Consider:

- The virtual table has access to both the heap and the in-place storage simultaneously
- Through `if constexpr (DoesFitInplace<F>())`, the table always knows which of these two places it needs to access to find the object, because this is essentially `constexpr` information and depends on the characteristics of `F`: its size and alignment
- As a result, the table itself will be able to perform all operations without an explicit runtime `m_isInPlace` flag

And the nice thing is that now that we've written the virtual table ourselves, we can really do whatever we want with it, including pulling off the hack we just described. With the standard inheritance approach and native C++ vtables, we can't do anything like this: the virtual table lives _inside_ the object, and the object has already been created. And it might seem that it's all the same - we can use `if constexpr (DoesFitInplace<F>())` and determine where we were created, but all we have in our hands is `this`, and there's nothing frivolous we can do with it.

Let's put the idea into practice. First, let's give our `union` a name so that we can refer to it:

```cpp
union FunctionBuffer
{
	void* heap;
	alignas(INPLACE_ALIGNMENT) std::byte inplace[INPLACE_SIZE];
};
```

Let's immediately implement a convenient way to obtain the correct pointer when we know the type `F`: we'll write a helper templated `getPtr()` method:

```cpp
union FunctionBuffer
{
	void* heap;
	alignas(INPLACE_ALIGNMENT) std::byte inplace[INPLACE_SIZE];

	template <typename F>
	F* getPtr() const {
		if constexpr (DoesFitInplace<F>()) {
			return std::launder(
			    reinterpret_cast<F*>(const_cast<std::byte*>(inplace))
			);
		} else {
			return static_cast<F*>(heap);
		}
	}

	template <typename F>
	F* getPtr() {
		return const_cast<F*>(
			std::as_const(*this).getPtr<F>()
		);
	}
};
```

The virtual table now works with `FunctionBuffer` and acquires a rather pleasant interface:

```cpp
struct ColdVTable
{
	void (*copyTo)(const FunctionBuffer& from, FunctionBuffer& to);
	void (*moveTo)(FunctionBuffer& from, FunctionBuffer& to);
	void (*destroy)(FunctionBuffer&);
};
```

The outer `Function` class now has the following data members:

```cpp
FunctionBuffer m_buffer;
Ret(*m_call)(const FunctionBuffer&, Args... args) = nullptr;
const ColdVTable* m_coldVtable = nullptr;
```

First, notice how `m_call` quietly started working with `FunctionBuffer` as well. Second, look at this: we no longer store a boolean, and we've now fit neatly into 32 bytes:

```
00 xxxxxxxx  union
08 xxxxxxxx  union
16 xxxxxxxx  m_call
24 xxxxxxxx  m_coldVtable
```

I'm now extremely happy with the memory layout of `Function`.

There's very little left to do - rewrite the implementation of the virtual table. In fact, it's quite easy:

```cpp
template <typename F>
struct ColdVTableFor
{
	static void copyTo(const FunctionBuffer& from, FunctionBuffer& to) {
		const F& srcCallable = *from.getPtr<F>();

		if constexpr (DoesFitInplace<F>()) {
			new (to.inplace) F(srcCallable);
		} else {
			to.heap = new F(srcCallable);
		}
	}

	static void moveTo(FunctionBuffer& from, FunctionBuffer& to) {
		const F& srcCallable = *from.getPtr<F>();

		if constexpr (DoesFitInplace<F>()) {
			new (to.inplace) F(std::move(srcCallable));
		} else {
			to.heap = from.heap;
			from.heap = nullptr;
		}
	}

	static void destroy(FunctionBuffer& obj) {
		const F* callable = obj.getPtr<F>();
		if constexpr (DoesFitInplace<F>()) {
			callable->~F();
		} else {
			if (callable) {
				delete callable;
			}
		}
	}

	static const ColdVTable vtable;
};
```

And our private `destroy_`, `copyFrom_`, and `moveFrom_` have become practically one-liners:

```cpp
void destroy_() noexcept {
	m_coldVtable->destroy(m_buffer);
}

void copyFrom_(const Function& other) {
	other.m_coldVtable->copyTo(other.m_buffer, m_buffer);
	m_call = other.m_call;
	m_coldVtable = other.m_coldVtable;
}

void moveFrom_(Function&& other) noexcept {
	other.m_coldVtable->moveTo(other.m_buffer, m_buffer);
	m_call = other.m_call;
	m_coldVtable = other.m_coldVtable;
}
```

All the changes turned out to be very simple and organic, almost as if they were suggesting themselves.

# Conclusion

We have smoothly arrived at the final implementation of the `Function` class. I don't think I want to optimize the class any further, because at its current stage it seems quite convincing to me.

Despite the fairly long article and the large number of explanations, the code itself turned out to be quite compact:

```cpp
template <typename>
class Function;

template <typename Ret, typename... Args>
class Function<Ret(Args...)>
{
public:
    template <typename F, typename = std::enable_if_t<!std::is_same_v<std::decay_t<F>, Function>>>
    Function(F&& f) {
        using Fn = std::decay_t<F>;

        if constexpr (DoesFitInplace<Fn>()) {
            new (m_buffer.inplace) Fn(std::forward<F>(f));
        } else {
            m_buffer.heap = new Fn(std::forward<F>(f));
        }

        m_call = &HotVTableFor<Fn>::call;
        m_coldVtable = &ColdVTableFor<Fn>::vtable;
    }

    ~Function() noexcept {
        destroy_();
    }

    Function(const Function& other) {
        copyFrom_(other);
    }

    Function(Function&& other) noexcept {
        moveFrom_(std::move(other));
    }

    Function& operator=(const Function& other) {
        if (this == &other)
            return *this;

        Function tmp(other);
        destroy_();
        moveFrom_(std::move(tmp));

        return *this;
    }

    Function& operator=(Function &&other) noexcept {
        if (this == &other)
            return *this;

        destroy_();
        moveFrom_(std::move(other));

        return *this;
    }

    Ret operator()(Args... args) const {
        return m_call(m_buffer, std::forward<Args>(args)...);
    }

private:
    static constexpr size_t INPLACE_SIZE = 16;
    static constexpr size_t INPLACE_ALIGNMENT = alignof(std::max_align_t);

    template <typename F>
    static constexpr bool DoesFitInplace() {
        return sizeof(F) <= INPLACE_SIZE
            && alignof(F) <= INPLACE_ALIGNMENT
            && std::is_nothrow_move_constructible_v<F>;
    }

    union FunctionBuffer
    {
        void* heap;
        alignas(INPLACE_ALIGNMENT) std::byte inplace[INPLACE_SIZE];

        template <typename F>
        F* getPtr() const {
            if constexpr (DoesFitInplace<F>()) {
                return std::launder(
                    reinterpret_cast<F*>(const_cast<std::byte*>(inplace))
                );
            } else {
                return static_cast<F*>(heap);
            }
        }

        template <typename F>
        F* getPtr() {
            return const_cast<F*>(
                std::as_const(*this).getPtr<F>()
            );
        }
    };

    struct ColdVTable
    {
        void (*copyTo)(const FunctionBuffer& from, FunctionBuffer& to);
        void (*moveTo)(FunctionBuffer& from, FunctionBuffer& to);
        void (*destroy)(FunctionBuffer&);
    };

    template <typename F>
    struct HotVTableFor
    {
        static Ret call(const FunctionBuffer& obj, Args... args) {
            F& callable = *obj.getPtr<F>();
            return callable(std::forward<Args>(args)...);
        }
    };

    template <typename F>
    struct ColdVTableFor
    {
        static void copyTo(const FunctionBuffer& from, FunctionBuffer& to) {
            const F& srcCallable = *from.getPtr<F>();

            if constexpr (DoesFitInplace<F>()) {
                new (to.inplace) F(srcCallable);
            } else {
                to.heap = new F(srcCallable);
            }
        }

        static void moveTo(FunctionBuffer& from, FunctionBuffer& to) {
            const F& srcCallable = *from.getPtr<F>();

            if constexpr (DoesFitInplace<F>()) {
                new (to.inplace) F(std::move(srcCallable));
            } else {
                to.heap = from.heap;
                from.heap = nullptr;
            }
        }

        static void destroy(FunctionBuffer& obj) {
            const F* callable = obj.getPtr<F>();
            if constexpr (DoesFitInplace<F>()) {
                callable->~F();
            } else {
                if (callable) {
                    delete callable;
                }
            }
        }

        static const ColdVTable vtable;
    };

    void destroy_() noexcept {
        m_coldVtable->destroy(m_buffer);
    }

    void copyFrom_(const Function& other) {
        other.m_coldVtable->copyTo(other.m_buffer, m_buffer);
        m_call = other.m_call;
        m_coldVtable = other.m_coldVtable;
    }

    void moveFrom_(Function&& other) noexcept {
        other.m_coldVtable->moveTo(other.m_buffer, m_buffer);
        m_call = other.m_call;
        m_coldVtable = other.m_coldVtable;
    }

    FunctionBuffer m_buffer;
    Ret(*m_call)(const FunctionBuffer&, Args... args) = nullptr;
    const ColdVTable* m_coldVtable = nullptr;
};

template <typename Ret, typename... Args>
template <typename F>
/*static*/ const typename Function<Ret(Args...)>::ColdVTable
Function<Ret(Args...)>::ColdVTableFor<F>::vtable = {
    &ColdVTableFor<F>::copyTo,
    &ColdVTableFor<F>::moveTo,
    &ColdVTableFor<F>::destroy
};
```

# Joke

```cpp
namespace std {
    template<typename Signature>
    using funktion = ::Function<Signature>;
} // namespace std
```

Now we've brought our class into the form shown in the cover image: feel free to use `std::funktion` to your heart's content.

Spoiler: In reality, you're not allowed to put anything in `namespace std` - formally, you get UB.

---
<small>© Nikolai Shalakin. Originally published by <a href="https://habr.com/ru/articles/1088580/">habr.com</a>, used under CC BY 3.0. Translated by the author.</small>