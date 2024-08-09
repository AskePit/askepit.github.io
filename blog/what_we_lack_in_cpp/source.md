C++ has been evolving rapidly for the past decade and more. Nevertheless, in our codebases, there are still numerous helper files and classes that aim to fill the gaps in the language's standard library. How did we end up with these helper files, and when will this ever end?

# Features that do not exist

For over a decade, I've been professionally involved in C++ development. I entered the field in 2013, just when the C++ standardization committee got into gear and adopted the three-year release cycle for updated language standards. C++11 had already been released, introducing plenty of attractive innovations that significantly refreshed the language. However, not everyone had the luxury of using all these new features in their working code, and we had to stick to the dull C++03, longing for the new standard.

Despite the diversity of new features introduced into the language, I observed the same recurring pattern from project to project: helper files, helper containers implementing the same things, filling the voids in the STL. I'm not even talking about niched structures and algorithms – more about things that are essential for comfortably developing software in C++. I observe how different companies on various projects construct the same makeshift solutions just because they are natural and in demand. And STL has nothing to offer.

In this article, I wanted to gather the most prominent examples of what I've seen and used in development. However, in the process of collecting all the absent features in C++, I unexpectedly discovered that some of them had been already covered by the new language standards, either fully or partially. Therefore, this article is more of a reflection and complains about what was missing for a long time but eventually made its way into the language, and what still remains absent in the standard. The article doesn't pretend to be anything pretentious; rather, it's just a chat about everyday C++.

**Disclaimer**: In this article, I may interchange concepts such as C++, STL, language, language standard, etc., as in the context of the article, it's not crucial, and the discussion revolves around "all of that stuff."

# What was missing for a long time

## `std::string::starts_with`, `std::string::ends_with`

The phantom pain of every other C++ enthusiast. We had been waiting for these things for so long, and they took their sweet time getting to us. I bet you've seen something similar in the hidden corners of your project's codebase:

```cpp
inline bool starts_with(const std::string &s1, const std::string &s2)
{
    return s2.size() <= s1.size() && s1.compare(0, s2.size(), s2) == 0;
}
```

These methods were introduced into the language only with C++20, which is still not accessible to everyone. But the fortunate ones can finally find the prefix and the suffix of a string. Both, in fact:

```cpp
std::string s("c++20");

bool res1 = s.starts_with("c++"); // true
bool res2 = s.starts_with("c#");  // false
bool res3 = s.ends_with("20");    // true
bool res4 = s.ends_with("27");    // false
```

## `std::optional`

“This class has been in the language for ages now, grandpa, take your pills!" – you might say and you would be partially right because `std::optional` has been with us since the C++17 standard, and everyone has become quite attached to it. However, here is more of my personal pain: in the early years of my career, I worked on a project with a C++03 restriction and used a custom `optional` created by my colleague.

Reading the code that implemented this custom `optional` class was kinda thrilling for me. I was a junior back then, and it left an impression on me. Surely, everything there was quite simple and straightforward, but the emotions were as if I were reading STL source code itself.

I'm glad that now I can confidently write something like this on almost any project:

```cpp
std::optional<Result> getResult();

const auto res = getResult();
if (res) {
    std::cout << res << std::endl;
} else {
    std::cout << "No result!" << std::endl;
}
```

## `std::expected`

If you're familiar with Rust, you know that the [`Option<T>`](https://doc.rust-lang.org/std/option/enum.Option.html) class has a best companion — the [`Result<T, E>`](https://doc.rust-lang.org/std/result/enum.Result.html#) class. They are closely related, and each has a bunch of methods that convert one into the other.

While `Option<T>` is equivalent to `optional<T>` in C++, `Result<T, E>` needs some clarification. It's somewhat like `optional<T>`, but the absence of a result is interpreted as an error of type `E`. That is, an object of the `Result<T, E>` class can be in two states:

- Ok state: The object contains a valid value of type `T`.
- Error state: The object holds an error of type `E`.

We can ask the object in which state it is and retrieve its content: either a value or an error.

For a C++ programmer, this class might seem exotic, but in Rust, it holds great significance since the language lacks exceptions, and handling exceptional situations is made through returning error codes. In 99% of cases, this is done by returning a `Result<T, E>`.

On the other hand, during my time with C++, I exclusively participated in projects where exceptions were forbidden for various reasons. In this context, C++ becomes similar to Rust in terms of error handling.

I envied Rust for having such a nifty thing in a language library. C++ deserved a similar weapon. And yes, I wrote an equivalent of `Result<T, E>` for C++. The class had the dubious name `Maybe<T, E>`, which could mislead a Haskell programmer (in Haskell, `Maybe` is analogous to `optional`).

But recently, I discovered that the C++ Standardization Committee has approved the [`std::expected<T, E>`](https://en.cppreference.com/w/cpp/utility/expected) class in the C++23 standard. MSVC has even [implemented it](https://learn.microsoft.com/en-us/cpp/overview/visual-cpp-language-conformance?view=msvc-170) in VS 2022 17.3, and it is available under the [`/std:c++latest`](https://learn.microsoft.com/en-us/cpp/build/reference/std-specify-language-standard-version?view=msvc-170) compiler option. The name is even better than Result or Maybe, in my opinion.

To appreciate the class in action, let's look at code that parses a human-readable chess address into coordinates that are easier to manage within a chess engine. For example, for `"a3"` it should yield coordinates `[2; 0]`:

```cpp
struct ChessPosition
{
    int row; // stored as [0; 7], represents [1; 8]
    int col; // stored as [0; 7], represents [a; h]
};

enum class ParseError
{
    InvalidAddressLength,
    InvalidRow,
    InvalidColumn
};

auto parseChessPosition(std::string_view address) -> std::expected<ChessPosition, ParseError>
{
    if (address.size() != 2) {
        return std::unexpected(ParseError::InvalidAddressLength);
    }

    int col = address[0] - 'a';
    int row = address[1] - '1';

    if (col < 0 || col > 7) {
        return std::unexpected(ParseError::InvalidColumn);
    }

    if (row < 0 || row > 7) {
        return std::unexpected(ParseError::InvalidRow);
    }

    return ChessPosition{ row, col };
}

...

auto res1 = parseChessPosition("e2");  // [1; 4]
auto res2 = parseChessPosition("e4");  // [3; 4]
auto res3 = parseChessPosition("g9");  // InvalidRow
auto res4 = parseChessPosition("x3");  // InvalidColumn
auto res5 = parseChessPosition("e25"); // InvalidAddressLength
```

## `std::bit_cast`

This is something I have had a sick relationship with. I don't know why, but there were times when I needed to do some strange things like obtaining the bitwise representation of a `float` number. Of course, in my junior days, I used to not be afraid of UB (Undefined Behavior) and used anything that just seemed to work, at least here and for now. So, what options do we have for performing not really safe casting from one type to another?

- `reinterpret_cast`, where would we be without it? It's so simple and tempting to write:

  ```cpp
  uint32_t i = *reinterpret_cast<uint32_t*>(&f);
  ```

  and not worry about anything. But it's UB;

- Back to basics — C-style cast. It's the same as `reinterpret_cast`, but even simpler to write:

  ```cpp
  uint32_t i = *(uint32_t*)&f;
  ```

  If the [developers of Quake III weren't afraid](https://en.wikipedia.org/wiki/Fast_inverse_square_root), why should we be? But... **it's UB**;

- The trick with `union`:
  ```cpp
  union {
      float f;
      uint32_t i;
  } value32;
  ```
  The code itself is not UB, but the problem is that reading from a union field into which you haven't written anything before is also UB.

Nevertheless, I observed all these approaches in various types of deviations:

- Attempting to determine the sign of a `float` number by reading its most significant bit.
- Transforming a pointer into a number and back — hello embedded systems. I even saw an exotic case where an address was transformed into an ID.
- Mathematical tricks with the exponent or mantissa of a `float`.

"Why would anyone need the mantissa?" you ask? And I would answer: behold my ancient [GitHub project](https://github.com/AskePit/IEEE754Converter), where I’ve created a small IEEE 754 converter, just for fun. I did it a long time ago for self-educational purposes, and I also wanted to steal the design of the standard Windows 7 calculator and see how well I could replicate it :)

![[Pasted image 20240113173034.png]]

Well, bitwise tricks sometimes become necessary for someone, somewhere.

The question is, how to trick your tricks safely? When I searched for the truth on StackOverflow, the answer was harsh but the only: "use `memcpy`." From same good old StackOverflow I stole a small snippet to use `memcpy` conveniently:

```cpp
template <class OUT, class IN>
inline OUT bit_cast(IN const& in)
{
    static_assert(sizeof(OUT) == sizeof(IN), "source and dest must be the same size");
    static_assert(std::is_trivially_copyable<OUT>::value, "destination type must be trivially copyable.");
    static_assert(std::is_trivially_copyable<IN>::value, "source type must be trivially copyable");

    OUT out;
    memcpy(&out, &in, sizeof(out));
    return out;
}
```

In C++20, they introduced [`std::bit_cast`](https://en.cppreference.com/w/cpp/numeric/bit_cast), which does the same thing except that it's also `constexpr` thanks to the magic that the standard obliged compilers to implement.

Now we can touch the beautiful and make it not only beautiful but also correct from the language specification point of view:

```cpp
float q_rsqrt(float number)
{
    long i;
    float x2, y;
    const float threehalfs = 1.5F;

    x2 = number * 0.5F;
    y = number;
    i = std::bit_cast<long>(y);              // evil floating point bit-level hacking
    i = 0x5f3759df - (i >> 1);               // what the heck?
    y = std::bit_cast<float>(i);
    y = y * (threehalfs - (x2 * y * y));     // 1st iteration
    // y  = y * ( threehalfs - ( x2 * y * y ) );   // 2nd iteration, this can be removed

    return y;
}
```

You're welcome, id Software.

# What's missing and may never be acquired at all

## Floating-Point Mathematics

We all know that you can't just take two `float` numbers and check if they are equal. `1.0` and `0.999999999` won't be equal to each other, even if they seem convincingly equal to you. There are no standard methods to solve this problem adequately in C++ — you have to manually compare the absolute difference of the numbers with some epsilon.

Another thing that we can sometimes desire is rounding a number to a certain number of digits. We have `floor`, `ceil`, `round`, but they all round to an integer. Therefore, you have to go to StackOverflow and take some ready-made solutions.

In the end, your codebase is extended with helpers like these:
```cpp
template<class T>
bool almostEqual(T x, T y)
{
    return std::abs(x - y) < std::numeric_limits<T>::epsilon();
}

template<class T>
bool nearToZero(T x)
{
    return std::abs(x) < std::numeric_limits<T>::epsilon();
}

template<class T>
T roundTo(T x, uint8_t digitsAfterPoint)
{
    const uint32_t delim = std::pow(10, digitsAfterPoint);
    return std::round(x * delim) / delim;
}
```

What else can be said — it’s not critical, but a bit sad.

## `EnumArray`

Consider you have an enumeration:

```cpp
enum class Unit
{
    Grams,
    Meters,
    Liters,
    Items
};
```

This is a common scenario where you need a dictionary with an enum key, storing configuration or information about each enumeration element. I encounter such cases frequently in my work. The straightforward solution can be easily implemented using standard STL containers:

```cpp
std::unordered_map<Unit, const char*> unitNames {
    { Unit::Grams, "g" },
    { Unit::Meters, "m" },
    { Unit::Liters, "l" },
    { Unit::Items, "pcs" },
};
```

What can we note about this piece of code?

- `std::unordered_map`  is not the most trivial container. And it's not the most memory-efficient
- Dictionaries or configs like this can be quite common in a project, and in the vast majority of cases, they will be small in size. The average number of elements in an enumeration rarely exceeds a few dozen, and most often it's just a few. Hash tables such as `std::unordered_map` or trees such as `std::map` start to look like overkill;
- An enumeration is, essentially, a number. It is very tempting to consider it as a numeric index.

This last point quickly leads us to the idea that we could create a container that interfaces like a dictionary but under the hood is a `std::array`. A proxy-container. The indices of the array are the elements of our enumeration, and the array's data are the values of the "map".

All that remains is to figure out how the array will know its size — i.e., how to count the number of elements in the enumeration. The simplest old-school method is to add a special element, Count, to the end of the enumeration. Let's stick with this method, as it's not particularly exotic—I often see it in codebases—so it's kinda ok to use it:

```cpp
enum class Unit
{
    Grams,
    Meters,
    Liters,
    Items,

    Count
};
```

The implementation of the proxy-container itself is quite simple:

```cpp
template<typename Enum, typename T>
class EnumArray
{
public:
    EnumArray(std::initializer_list<std::pair<Enum, T>>&& values);

    T& operator[](Enum key);
    const T& operator[](Enum key) const;

private:
    static constexpr size_t N = std::to_underlying(Enum::Count);
    std::array<T, N> data;
};
```

The constructor with `std::initializer_list` is necessary to allow constructing our config in the same way we formed `std::unordered_map`:

```cpp
EnumArray<Unit, const char*> unitNames {
    { Unit::Grams, "g" },
    { Unit::Meters, "m" },
    { Unit::Liters, "l" },
    { Unit::Items, "pcs" },
};

std::cout << unitNames[Unit::Items] << std::endl; // Outputs "pcs"
```

The beauty of this:

- We use all the benefits of both `std::array` and `std::unordered_map`. The convenience of a dictionary interface combined with the speed and simplicity (in a good sense) of an array under the hood;
- Cache-friendly—data is stored sequentially in memory, in contrast to `std::unordered_map` and `std::map`;
- The size of the array is known at compile-time, and if we improve the container further, almost all its methods can be made `constexpr`.

Limitations of this approach:

- Mandatory `Count` in the enumeration;
- The enumeration cannot have custom-typed values like:

  ```cpp
  enum class Type
  {
      A = 4,
      B = 12,
      C = 518,
      D
  }
  ```
  Only the default order starting from zero;
- Memory is allocated for *all elements* of the enumeration in the array. If you fill the `EnumArray` with only some values, the rest will contain default-constructed objects;
- Another limitation—type `T` must be default-constructed.

I'm usually okay with such limitations, so I typically use this container without any issues.

## Early Return

Let's take a look at a typical function with some boundary checks:

```cpp
std::string applySpell(Spell* spell)
{
    if (!spell)
    {
        return "No spell";
    }

    if (!spell->isValid())
    {
        return "Invalid spell";
    }

    if (this->isImmuneToSpell(spell))
    {
        return "Immune to spell";
    }

    if (this->appliedSpells.contains(spell))
    {
        return "Spell already applied";
    }

    appliedSpells.append(spell);
    applyEffects(spell->getEffects());
    return "Spell applied";
}
```

Is it familiar to you? Poor three lines at the bottom – that's the actual work of the method. The rest – checks to see if the work can be performed. It's a bit annoying. Especially if you're a fan of the Allman style, and your every curly brace loves to be alone.

It would be nice to make it cleaner, without all that boilerplate. C++ has `assert`, for example, which is kinda similar to what we're doing here – a check is performed on a certain condition, and if necessary, some measures are taken under the hood. Admittedly, `assert` is simpler – it doesn't need to return anything. But nevertheless, we could construct something similar:

```cpp
#define early_return(cond, ret)      \
    do {                             \
        if (static_cast<bool>(cond)) \
        {                            \
            return ret;              \
        }                            \
    } while (0)

#define early_return_void(cond)      \
    do {                             \
        if (static_cast<bool>(cond)) \
        {                            \
            return;                  \
        }                            \
    } while (0)
```

FFFUUU, macros! Bjorn Stroustrup doesn't like macros. If he sends me a direct message asking for an apology, I'll understand, and I'll apologize. I'm not a big fan of C++ macros either.

![[Pasted image 20240114132049.png]]

But yep, there are macros in the proposed code, even two. Actually, we can reduce them to one by using a variadic macro:

```cpp
#define early_return(cond, ...)      \
    do {                             \
        if (static_cast<bool>(cond)) \
        {                            \
            return __VA_ARGS__;      \
        }                            \
    } while (0)
```

There's only one macro left, but it's still a macro. And nope, the miracle will hardly happen: it can't be turned into a non-macro – as soon as we try to move it into a function, we lose the ability to influence the control flow of our current function. It's a pity, but that's the reality. But just look how we can rewrite our original example:

```cpp
std::string applySpell(Spell* spell)
{
    early_return(!spell, "No spell");
    early_return(!spell->isValid(), "Invalid spell");
    early_return(this->isImmuneToSpell(spell), "Immune to spell");
    early_return(this->appliedSpells.contains(spell), "Spell already applied");

    appliedSpells.append(spell);
    applyEffects(spell->getEffects());
    return "Spell applied";
}
```
This will work even if the function returns `void`:

```cpp
void applySpell(Spell* spell)
{
    early_return(!spell);
    early_return(!spell->isValid());
    early_return(this->isImmuneToSpell(spell));
    early_return(this->appliedSpells.contains(spell));

    appliedSpells.append(spell);
    applyEffects(spell->getEffects());
}
```

It's shorter, and I think it's generally better. If this feature were supported by the standard, it could be a language construct rather than a macro. Although, for the sake of justice and fun, I'll say that the C++ [`assert`](https://en.cppreference.com/w/cpp/error/assert) is also a macro.

If you prefer the logical behavior of the `assert` more – *assert the expected, trigger error otherwise* – then we can simply invert the entire logic and name the macro according to the new behavior:

```cpp
#define ensure_or_return(cond, ...)   \
    do {                              \
        if (!static_cast<bool>(cond)) \
        {                             \
            return __VA_ARGS__;       \
        }                             \
    } while (0)

void applySpell(Spell* spell)
{
    ensure_or_return(spell);
    ensure_or_return(spell->isValid());
    ensure_or_return(!this->isImmuneToSpell(spell));
    ensure_or_return(!this->appliedSpells.contains(spell));

    appliedSpells.append(spell);
    applyEffects(spell->getEffects());
}
```

The naming is probably bad, but you get the idea. And I would be satisfied to see either of these constructs in C++.

## Unordered Erase

I suppose the most commonly used collection in C++ is `vector`. And we all remember well that a vector is good at everything except inserting and deleting in the middle of the collection. This takes O(n) time, so every time I have to delete something from the middle of the vector, I feel a bit sad because the vector has to shift half of its content to the left.

There is an idiomatic technique that can turn O(n) into O(1) at the cost of elements’ order violation. And if you are willing to pay this price, it is definitely more advantageous to use this simple trick:

```cpp
std::vector<int> v {
    17, -2, 1084, 1, 17, 40, -11
};

// remove the number 1 from the vector
std::swap(v[3], v.back()); 
v.pop_back();

// get [17, -2, 1084, -11, 17, 40]
```

Whoa, what was that? First, we swapped the last element of the vector with the one marked for deletion, and then simply discarded the tail element from the vector. Both operations are ridiculously cheap. Simple and nice.

It is not clear for me why the vector interface does not provide such a simple alternative to the regular erase method. [It exists](https://doc.rust-lang.org/std/vec/struct.Vec.html#method.swap_remove) in Rust, for instance.

So, for now we should live with another helper function in our codebase:

```cpp
template<typename T>
void unorderedErase(std::vector<T>& v, int index)
{
    std::swap(v[index], v.back());
    v.pop_back();
}
```

# Conclusion

Half of the article was nullified by C++ itself in the process of writing it because modern C++20 and C++23 standards covered about half of the desires described in this complaint book. And all in all, a wishlist from language users will never run out because as many people, as many wishes, and you can't fit them all into the standard library or the language itself.

I tried to mention only those points that, in my humble opinion, seem to be less subjective and would be worthy of inclusion in the language standard. At least in my work, these features are more or less in demand on a daily basis. You may rightly have a different opinion on my list, and I, in turn, would be happy to read in the comments about your pain and the features you didn't get, to understand how language users would like to see the future of C++.