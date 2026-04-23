---
tags:
  - article
  - cpp
title: C++ penny pinching
url-title: cpp_penny_pinching
description: Recently at work we ran into high memory consumption in a game. It was caused by storing a large amount of terrain information and tile properties that the game needs for various gameplay calculations. A very common problem, and it hits especially hard with large arrays or matrices of significant dimensions.
keywords:
  - c++
  - optimizations
  - memory
image: https://habrastorage.org/r/w780/getpro/habr/upload_files/f11/8d9/8b0/f118d98b0f7ab732d6dc2de9f36693db.jpg
date: 25.02.2026
---

Recently at work we ran into high memory consumption in a game. It was caused by storing a large amount of terrain information and tile properties that the game needs for various gameplay calculations. A very common problem, and it hits especially hard with large arrays or matrices of significant dimensions.

A pretty typical scenario — you have a perfectly reasonable struct that stores information about a single object. But there are a *lot* of those objects. Say, a 1000x1000 terrain grid. That's already a whole million objects! And your measly 32-byte struct gets multiplied a million times and balloons to 30.5 MB of RAM.

Arguably the most correct solution here is to fundamentally rethink how this enormous pile of data is stored in memory. There are plenty of directions you can dig toward:

- Streaming. At any given moment, load only the data you currently need from disk into memory. Evict what's no longer relevant.
- Data compression. Store data in a packed, compressed form. Decompress on the fly when reading.
- Clever data structures that allow storing identical neighboring data in a very compact form. A classic example — [quadtrees](https://en.wikipedia.org/wiki/Quadtree).

But this article is not about those smart solutions — it's a bit more down to earth. Before diving into expensive rewrites, it's worth taking what you might call the zeroth optimization step — try to optimize the struct or class itself so that it takes up less space. Every penny counts!

# A Spherical Example

For illustration purposes, let's take a clean theoretical example. We have a `PersonInfo` struct and some associated types:

```cpp
enum class RoleType {
    Employee,
    Student,
    Contractor,
    Retired
};

struct EmployeeData {};
struct StudentData {};
struct ContractorData {};
struct RetiredData {};

struct PersonInfo {
    uint16_t id;
    int age;
    uint32_t salary;

    bool isMarried;
    bool hasDrivingLicense;
    bool isRemoteWorker;
    bool hasChildren;
    bool ownsHouse;
    bool isSmoker;
    bool isShareholder;

    RoleType role;
    void* roleData;

    bool isAvailable;
};
```

What's going on here:

- `id`. 16-bit employee ID.
- `age`. Employee age.
- `salary`. Employee salary, represented in some internal decimal format that we'll describe as a 32-bit number for simplicity.
- A bunch of `bool` fields with various employee info.
- `role` and `roleData`. A pair of fields describing the employee's role and the data associated with that specific role. Essentially a tagged union held together with duct tape. For `RoleType::Employee`, the `void*` hides an `EmployeeData*`, for `RoleType::Student` — a `StudentData*`, and so on.
- `isAvailable`. Whether the employee is currently available or on vacation/sick leave/etc.

There are lots and lots of employees. And we have an application that keeps a large number of `PersonInfo` objects in memory. Our goal — reduce memory consumption of this large `PersonInfo` array.

# Disclaimers, Caveats

Let's briefly outline the conditions the application runs under:

- 64-bit platform.
- We assume a typical industrial compiler like gcc, msvc, clang, icc with default compilation flags.
- Theoretically, a struct's memory layout can vary from compiler to compiler, platform to platform. In practice, for the compilers mentioned above and for everything shown below, [Godbolt (a.k.a. Compiler Explorer)](https://godbolt.org/) produces the same memory layout results.
- We will **not** use bitfields. Maximally implementation-defined behavior that you shouldn't rely on if you need any portability whatsoever.

# The Starting Point

So, our initial `struct PersonInfo`:

```cpp
struct PersonInfo {
    uint16_t id;
    int age;
    uint32_t salary;

    bool isMarried;
    bool hasDrivingLicense;
    bool isRemoteWorker;
    bool hasChildren;
    bool ownsHouse;
    bool isSmoker;
    bool isShareholder;

    RoleType role;
    void* roleData;

    bool isAvailable;
};
```

has the following memory layout:

![](https://habrastorage.org/webt/zp/-v/jv/zp-vjvn4-qsvno9hq3ppbbqarfa.png)

Total — the struct occupies **40 bytes** and has several ugly gaping holes in memory. This is padding, whose job is to align struct fields so they sit at addresses properly aligned to their size. The compiler is not allowed to reorder struct fields, so it can't optimize anything on its own. The particularly painful part is the 7 wasted bytes at the end of the struct — `PersonInfo` has 8-byte alignment, so the last `bool` that crept past byte 32 forced the struct to consume a full 8 bytes.

A well-known phenomenon, documented in hundreds of articles across the internet. If you don't understand what's happening here and why, you can freely Google "struct padding" or "c++ alignment" to learn more.

# Shuffling the Struct

The simplest and most common way to fight padding — reorder fields from largest to smallest:

```cpp
struct PersonInfo {
    void* roleData;
    uint32_t salary;
    int age;
    RoleType role;
    uint16_t id;

    bool isMarried;
    bool hasDrivingLicense;
    bool isRemoteWorker;
    bool hasChildren;
    bool ownsHouse;
    bool isSmoker;
    bool isShareholder;
    bool isAvailable;
};
```

This is the simplest trick in the world and essentially free — it asks nothing of you and delivers instant results:

![](https://habrastorage.org/webt/zg/ro/bj/zgrobjuf8uie9v4u9u_3e42n1bm.png)

This picture looks much nicer, and we saved 8 bytes by doing virtually nothing! We're now at **32 bytes**.

# Trimming the Budget

A closer look at the struct reveals a couple of places where we can trim the type sizes without losing anything.

The first obvious case — the `age` field. Someone slapped an `int` on it without a second thought, even though we don't plan to account for unborn employees with negative ages or biblical centenarians at 900+. ~~640Kb~~ `uint8_t` is honestly enough for everyone, and it lets us ditch 3 extra bytes.

The second case is less obvious — `enum class RoleType`. It's declared the simple way, without specifying an underlying type, which defaults it to the same `int` we already fought once. Since `RoleType` only has 4 variants, two bits would suffice, but we'll give it a whole 8, because that's the minimum we can do: `enum class RoleType : uint8_t`.

Let's look at the resulting code:

```cpp
enum class RoleType : uint8_t {
    Employee,
    Student,
    Contractor,
    Retired
};

struct PersonInfo {
    void* roleData;
    uint32_t salary;
    uint16_t id;
    uint8_t age;
    RoleType role;

    bool isMarried;
    bool hasDrivingLicense;
    bool isRemoteWorker;
    bool hasChildren;
    bool ownsHouse;
    bool isSmoker;
    bool isShareholder;
    bool isAvailable;
};
```

Still not too many deviations from the original, but look at the memory layout:

![](https://habrastorage.org/webt/vg/tt/1z/vgtt1zzrdbfbyzxywhe9ybrvhuo.png)

We achieved the tightest possible packing and fit into **24 bytes**.

# Squeezing the Booleans

In mainstream programming languages (and probably all of them) there's one unpleasant truth about boolean values: logically they represent one bit of information, but in practice they're implemented as 1-byte types, meaning they take up 8 times more space than necessary! In some languages it's even worse. Such is life — machines prefer to operate on whole machine words rather than extracting individual bits.

If you look carefully at our current memory layout above --^, you'll notice something interesting: eight booleans lined up in a neat row. 8 bits that bloated into 8 bytes — 7 bytes down the drain. And we can pack them neatly into a single `uint8_t` (or `std::byte`) to finally restore justice.

The code will be modified more substantially here, since we need to remove 8 public fields and replace them with a single private one. In place of the booleans, we'll expose a getter/setter interface:

```cpp
struct PersonInfo {
    void* roleData;
    uint32_t salary;
    uint16_t id;
    uint8_t age;
    RoleType role;

    bool isMarried() const;
    bool hasDrivingLicense() const;
    bool isRemoteWorker() const;
    bool hasChildren() const;
    bool ownsHouse() const;
    bool isSmoker() const;
    bool isShareholder() const;
    bool isAvailable() const;

    void setIsMarried(bool val);
    void setHasDrivingLicense(bool val);
    void setIsRemoteWorker(bool val);
    void setHasChildren(bool val);
    void setOwnsHouse(bool val);
    void setIsSmoker(bool val);
    void setIsShareholder(bool val);
    void setIsAvailable(bool val);

private:
    static constexpr uint8_t IsMarriedMask         = 1 << 0;
    static constexpr uint8_t HasDrivingLicenseMask = 1 << 1;
    static constexpr uint8_t IsRemoteWorkerMask    = 1 << 2;
    static constexpr uint8_t HasChildrenMask       = 1 << 3;
    static constexpr uint8_t OwnsHouseMask         = 1 << 4;
    static constexpr uint8_t IsSmokerMask          = 1 << 5;
    static constexpr uint8_t IsShareholderMask     = 1 << 6;
    static constexpr uint8_t IsAvailableMask       = 1 << 7;

    bool getFlag(uint8_t mask) const;
    void setFlag(uint8_t mask, bool val);
    
    uint8_t m_flags;
};

inline bool PersonInfo::getFlag(uint8_t mask) const {
    return m_flags & mask;
}

inline void PersonInfo::setFlag(uint8_t mask, bool val) {
    m_flags = val ? (m_flags | mask) : (m_flags & ~mask);
}

inline bool PersonInfo::isMarried() const { return getFlag(IsMarriedMask); }
inline bool PersonInfo::hasDrivingLicense() const { return getFlag(HasDrivingLicenseMask); }
inline bool PersonInfo::isRemoteWorker() const { return getFlag(IsRemoteWorkerMask); }
inline bool PersonInfo::hasChildren() const { return getFlag(HasChildrenMask); }
inline bool PersonInfo::ownsHouse() const { return getFlag(OwnsHouseMask); }
inline bool PersonInfo::isSmoker() const { return getFlag(IsSmokerMask); }
inline bool PersonInfo::isShareholder() const { return getFlag(IsShareholderMask); }
inline bool PersonInfo::isAvailable() const { return getFlag(IsAvailableMask); }
inline void PersonInfo::setIsMarried(bool val) { return setFlag(IsMarriedMask, val); }

inline void PersonInfo::setHasDrivingLicense(bool val) { return setFlag(HasDrivingLicenseMask, val); }
inline void PersonInfo::setIsRemoteWorker(bool val) { return setFlag(IsRemoteWorkerMask, val); }
inline void PersonInfo::setHasChildren(bool val) { return setFlag(HasChildrenMask, val); }
inline void PersonInfo::setOwnsHouse(bool val) { return setFlag(OwnsHouseMask, val); }
inline void PersonInfo::setIsSmoker(bool val) { return setFlag(IsSmokerMask, val); }
inline void PersonInfo::setIsShareholder(bool val) { return setFlag(IsShareholderMask, val); }
inline void PersonInfo::setIsAvailable(bool val) { return setFlag(IsAvailableMask, val); }
```

Ugly? Absolutely. But the era of free and even cheap optimizations ended in the previous chapters. Squeezing the struct further requires greater sacrifices for diminishing returns — that's just reality. But let's see what we've gained:

![](https://habrastorage.org/webt/cz/m6/ga/czm6gawi7pg3bbpcjivljfat65e.png)

Well, we did save our 7 bytes as planned, but unfortunately we didn't actually reduce the struct's size. It stayed at **24 bytes**, since `alignof(PersonInfo)` is the minimum discrete unit by which the struct size can shrink.

The good news is that any further trivial optimization will finally produce a real size reduction, since we're literally [one byte](https://habr.com/ru/articles/27055/) short (<-- easter egg for people from the Mesozoic).

# Hiding a Stash

Time to look at our homemade "tagged union from Rust/Zig":

```cpp
void* roleData;
RoleType role;
```

Some thoughts:

- As noted above, despite `RoleType` currently using an 8-bit underlying type, it actually represents just 4 variants that would fit in 2 bits.
- `roleData` is a pointer on a 64-bit machine. And as mentioned, it takes 8 bytes on any self-respecting platform (and we only work on those!). This means the pointer address is always a multiple of eight — because alignment. For a number that's a multiple of eight, its 3 least significant bits are always zero. On a 32-bit machine, by the way, the address would be a multiple of four, so the 2 least significant bits would always be zero.
- See where I'm going with this? Whether x86 or x64 — our `enum class RoleType` can always be *embedded into the body of the pointer* `void* roleData`, while still allowing us to recover both the original pointer and the enum value. In other words, we can "dissolve" the `role` field inside the least significant bits of the `roleData` pointer.

Cool? Cool. Let's do it:
    
```cpp
struct PersonInfo {
private:
	uintptr_t m_role;

public:
	uint32_t salary;
	uint16_t id;
	uint8_t age;

	RoleType role() const;
	void* roleData() const;
	...

	void setRole(RoleType val);
	void setRoleData(void* val);
	...

private:
	...
	static constexpr uintptr_t RoleMask = 0b11;
	...
	
	uint8_t m_flags;
};

inline RoleType PersonInfo::role() const {
	uint8_t roleTypeRaw = m_role & RoleMask;
	return static_cast<RoleType>(roleTypeRaw);
}

inline void* PersonInfo::roleData() const {
	uintptr_t roleDataRaw = m_role & ~RoleMask;
	return reinterpret_cast<void*>(roleDataRaw);
}

inline void PersonInfo::setRole(RoleType val) {
	uint8_t roleTypeRaw = static_cast<uint8_t>(val);
	uintptr_t roleDataRaw = m_role & ~RoleMask;
	m_role = roleDataRaw | roleTypeRaw;
}

inline void PersonInfo::setRoleData(void* val) {
	assert(val & RoleMask == 0);

	uint8_t roleTypeRaw = m_role & RoleMask;
	uintptr_t roleDataRaw = reinterpret_cast<uintptr_t>(val) & ~RoleMask;
	m_role = roleDataRaw | roleTypeRaw;
}
```

The struct is disfigured. On the funny side — we still need to maintain field ordering to preserve the previous padding optimization, and we had to juggle access specifiers: `private`, `public`, `private`. Don't forget to bribe the reviewer of your branch to look the other way.

> UPD: An important [note](https://habr.com/ru/articles/1003644/#comment_29586186) from commenter @AlexeyMartynov: explicitly introducing different access specifiers in your struct or class can theoretically have unexpected effects on field ordering, which may shatter all your plans and expectations. Arm yourself with a debugger or print [`offsetof(type, member)`](https://en.cppreference.com/w/cpp/types/offsetof.html) to know for certain what's going on! At the end of the article I'll attach a cheat sheet on how to do this.

And at last, we end up with this:

![](https://habrastorage.org/webt/x-/4h/go/x-4hgonqqfdxwnfeqwm9qyyjo4w.png)

This is so beautiful I can't put it into words. Just scroll up to the very first memory layout and behold what we've done to this struct. And it hasn't lost any of its functionality.

But now it weighs **16 bytes** instead of **40 bytes**. I'd say saving 60% of memory out of thin air is quite respectable. Especially considering we didn't have to make any fateful architectural decisions or rewrite half the project to adopt a new data management paradigm.

To be fair, those 60% memory savings cost us -60% code readability. But that's a matter of priorities.

# Bonus Levels

Can we think of anything else? Of course we can! The ways to reduce your memory footprint are endless, since you can apply an endless number of heuristics depending on what your data actually represents.

With the `PersonInfo` struct I was only able to demonstrate a limited set of basic tricks. Now let's briefly run through a few more techniques worth mentioning.

## Union

If you have *overlapping* data that can't coexist at the same time, you might want to look at `union`. Just be extremely careful and keep in mind that it's dangerously easy to step on a UB landmine with unions.

Here's a spherical example in a vacuum where only one group of fields is active at any given moment:

```cpp
enum class CellStatus : uint8_t {
	Metabolic,
    AcidicInhibitor,
    Signaling,
    Energy
};

struct Cell {
    CellStatus status;

    // CellStatus::Metabolic
    float metabolicLevel;
    
    // CellStatus::AcidicInhibitor
    uint16_t inhibitorClearanceTicks;
    uint8_t acidityLevel;
    uint8_t acidityExposure;
    
    // CellStatus::Signaling
    uint8_t signalLevel;
    uint8_t signalLevelPrev;
    
    // CellStatus::Energy
    uint16_t energyReserve;
    
    // ...
    // lots of other fields
    // ...
};
```

Don't even ask what's going on here — this is science fiction. And yes, the example is also a bit crude. Usually structs don't scream so openly that they're just a disguised `union`.

Simple math shows that in this flat form, the fields in question take `4 + 2 + 1 + 1 + 1 + 1 + 2 = 12` bytes (excluding padding). Inside a `union`, those same fields would only take as much as the largest group — in our case there are two, both at 4 bytes (the fields for `Cell::AcidicInhibitor` and `Cell::Metabolic`). 4 bytes instead of 12 — in some cases, that's quite decent.

The only question is the cost of the refactor:

```cpp
struct Cell {
    CellStatus status;

    float metabolicLevel() const;
    uint16_t inhibitorClearanceTicks() const;
    uint8_t acidityLevel() const;
    uint8_t acidityExposure() const;
    uint8_t signalLevel() const;
    uint8_t signalLevelPrev() const;
    uint16_t energyReserve() const;

    void setMetabolicLevel(float val);
    void setInhibitorClearanceTicks(uint16_t val);
    void setAcidityLevel(uint8_t val);
    void setAcidityExposure(uint8_t val);
    void setSignalLevel(uint8_t val);
    void setSignalLevelPrev(uint8_t val);
    void setEnergyReserve(uint16_t val);

    // ...
    // lots of other fields
    // ...

private:
    union {
        float m_metabolicLevel;
        struct {
            uint16_t m_inhibitorClearanceTicks;
            uint8_t m_acidityLevel;
            uint8_t m_acidityExposure;
        };
        struct {
            uint8_t m_signalLevel;
            uint8_t m_signalLevelPrev;
        };
        uint16_t m_energyReserve;
    };
};

inline float Cell::metabolicLevel() const {
    assert(status == CellStatus::Metabolic);
    return m_metabolicLevel;
}
inline uint16_t Cell::inhibitorClearanceTicks() const {
    assert(status == CellStatus::AcidicInhibitor);
    return m_inhibitorClearanceTicks;
}
inline uint8_t Cell::acidityLevel() const {
    assert(status == CellStatus::AcidicInhibitor);
    return m_acidityLevel;
}
inline uint8_t Cell::acidityExposure() const {
    assert(status == CellStatus::AcidicInhibitor);
    return m_acidityExposure;
}
inline uint8_t Cell::signalLevel() const {
    assert(status == CellStatus::Signaling);
    return m_signalLevel;
}
inline uint8_t Cell::signalLevelPrev() const {
    assert(status == CellStatus::Signaling);
    return m_signalLevelPrev;
}
inline uint16_t Cell::energyReserve() const {
    assert(status == CellStatus::Energy);
    return m_energyReserve;
}

inline void Cell::setMetabolicLevel(float val) {
    assert(status == CellStatus::Metabolic);
    m_metabolicLevel = val;
}
inline void Cell::setInhibitorClearanceTicks(uint16_t val) {
    assert(status == CellStatus::AcidicInhibitor);
    m_inhibitorClearanceTicks = val;
}
inline void Cell::setAcidityLevel(uint8_t val) {
    assert(status == CellStatus::AcidicInhibitor);
    m_acidityLevel = val;
}
inline void Cell::setAcidityExposure(uint8_t val) {
    assert(status == CellStatus::AcidicInhibitor);
    m_acidityExposure = val;
}
inline void Cell::setSignalLevel(uint8_t val) {
    assert(status == CellStatus::Signaling);
    m_signalLevel = val;
}
inline void Cell::setSignalLevelPrev(uint8_t val) {
    assert(status == CellStatus::Signaling);
    m_signalLevelPrev = val;
}
inline void Cell::setEnergyReserve(uint16_t val) {
    assert(status == CellStatus::Energy);
    m_energyReserve = val;
}
```

Scary? Scary. But such is the price. The asserts are there to protect against reading or writing to an inactive field.

Someone might point out that in the modern world we have `std::variant<>` for this, and I even tried to use it for this task — the code became even more unbearable — thanks everyone, love you all, but I'll pass.

## Bitfields

Despite giving bitfields a red card at the start of the article, they're still a valid tool. And they might work just fine for some people. For example, if you know you're always on one platform, with one compiler, and you don't need a stable ABI for compatibility with anything — you get a powerful and in its own way elegant tool:

```cpp
enum class RoleType {
    Employee,
    Student,
    Contractor,
    Retired
};

struct PersonInfo {
    void* roleData;
    uint32_t salary;
    int age;
    uint16_t id;

    RoleType role : 2;
    bool isMarried : 1;
    bool hasDrivingLicense : 1;
    bool isRemoteWorker : 1;
    bool hasChildren : 1;
    bool ownsHouse : 1;
    bool isSmoker : 1;
    bool isShareholder : 1;
    bool isAvailable : 1;
};
```

Congratulations, you solved the boolean packing problem with far less blood. Moreover, look — we even fit `RoleType role` into 2 bits!

Except, when I said compilers do mysterious things with bitfields, I wasn't joking — look at the memory layout MSVC produces for the code above:

![](https://habrastorage.org/webt/mw/db/vh/mwdbvhu4r_gprgvobdmuokez9ky.png)

See those gaping holes that kill the whole idea of bitfields? Well. To be fair, I cheated a little by declaring `RoleType` without an underlying type. If you restore `enum class RoleType : uint8_t`, you get:

![](https://habrastorage.org/webt/lk/wq/d8/lkwqd8ayesp4dyxf-wibg9d8zzm.png)

Make of that what you will — you'll have to investigate on a case-by-case basis what your compiler decided to do for you.

## Eliminating Floating-Point Numbers

Very often in structs with `double` or `float` fields, you can carve out some precious space by sacrificing precision or value range.

The first and simplest thing you can do — replace `double` with `float` wherever you don't need `double` precision. That saves you half the space right there.

The second trick, commonly used in games for transmitting floating-point numbers over the network — quantization. We convert our `float` to some `uint16_t` or `uint8_t`, agreeing in advance on the allowable range of values for that particular variable. By adjusting the number of bits and the range, we indirectly control the resulting precision. If the precision isn't satisfactory, increase the type size.

I'm not a huge expert in these calculations, but the idea goes roughly like this:

```cpp
template <typename Uint>
Uint pack(float value, float minVal, float maxVal) {
	assert(value >= minVal && value <= maxVal);
	constexpr int bits = sizeof(Uint) * 8;
	
	const float scale = (std::pow(2, bits) - 1) / (maxVal - minVal);
	return static_cast<Uint>(std::round((value - minVal) * scale));
}

template <typename Uint>
float unpack(Uint packed, float minVal, float maxVal) {
	constexpr int bits = sizeof(Uint) * 8;
	
	const float scale = (maxVal - minVal) / (std::pow(2, bits) - 1);
	return static_cast<float>(packed) * scale + minVal;
}

int main()
{
    float val = 10.f;

    uint8_t packed8 = pack<uint8_t>(val, 0.f, 180.f);
    float unpacked8 = unpack(packed8, 0.f, 180.f);

    uint16_t packed16 = pack<uint16_t>(val, 0.f, 180.f);
    float unpacked16 = unpack(packed16, 0.f, 180.f);

    std::cout << "Original: " << val << "\n";
    std::cout << "Packed8: " << +packed8 << ", Unpacked8: " << unpacked8 << "\n";
    std::cout << "Packed16: " << packed16 << ", Unpacked16: " << unpacked16 << "\n";
}
```

Result:

```
Original: 10
Packed8: 14, Unpacked8: 9.88235
Packed16: 3641, Unpacked16: 10.0005
```

10 degrees turned into 9.88235 when packing into 1 byte. For some use cases, that loss of precision is more than acceptable. And instead of 4 bytes, you have 1.

## bfloat16

This is my favorite. If you don't care about your `float` precision at all, you can pack them into the [`bfloat16`](https://en.wikipedia.org/wiki/Bfloat16_floating-point_format) format. It's very easy to do, thanks to the properties of floating-point numbers as defined by the [IEEE-754](https://askepit.github.io/tools/ieee754_calculator/) standard.

The idea: you can turn a 32-bit float into a 16-bit one simply by sacrificing the least significant bits of the mantissa. As it happens, the least significant bits of the mantissa are *literally* the least significant bits of the `float`. So simple bit shifting — and you're done!

```cpp
class bfloat16 {
public:
    static_assert(sizeof(float) == sizeof(uint32_t));

    explicit bfloat16(float f)
        : m_data(static_cast<uint16_t>(std::bit_cast<uint32_t>(f) >> 16)) { }

    float get() const {
        return std::bit_cast<float>(static_cast<uint32_t>(m_data) << 16);
    }

private:
    uint16_t m_data;
};

int main()
{
    bfloat16 pi(3.14159f);
    std::cout << "bfloated PI: " << pi.get() << "\n";
}
```

Output:

```
bfloated PI: 3.14062
```

Not too bad at all.

And if you know your numbers can only be positive, we can squeeze out one more bit of precision by repurposing the sign bit!

```cpp
class ubfloat16 {
public:
    static_assert(sizeof(float) == sizeof(uint32_t));

    explicit ubfloat16(float f)
        : m_data(static_cast<uint16_t>((std::bit_cast<uint32_t>(f) << 1) >> 16)) { }

    float get() const {
        return std::bit_cast<float>(static_cast<uint32_t>(m_data) << 15);
    }

private:
    uint16_t m_data;
};
```

Let's compare both classes:

```cpp
int main()
{
    const float val = 35001.02f;
    bfloat16 bfloat(val);
    ubfloat16 ubfloat(val);

    std::cout << std::setprecision(9) << " original: " << val << "\n";
    std::cout << std::setprecision(9) << " bfloated: " << bfloat.get() << "\n";
    std::cout << std::setprecision(9) << "ubfloated: " << ubfloat.get() << "\n";
}
```

Output:

```
 original: 35001.0195
 bfloated: 34816
ubfloated: 34944
```

The larger the number in absolute terms, the worse the precision and the greater the loss.

The `bfloat16` approach in particular is used to the fullest extent in neural network training. There, billions of floating-point weights get packed into a single byte quite happily, and the neural networks are generally fine with it.

# Appendix I. Inspecting Memory Layout

How do you find out the exact memory layout of your struct? Let's go through all the methods I know.

## GCC

GCC has a warning `-Wpadded` that will tell you if a struct has padding holes. Doesn't give the full picture, but it's something.

## Clang

Clang has a more powerful tool:

```bash
clang++ -Xclang -fdump-record-layouts file.cpp
```

This prints the layout of all classes and structs.

## Visual Studio

For MSVC in Visual Studio, you can hover over any class or struct and in the tooltip that appears, select Memory Layout — you'll see a diagram similar to what I've shown in this article:

![](https://habrastorage.org/webt/lk/wq/d8/lkwqd8ayesp4dyxf-wibg9d8zzm.png)

## `static_assert`

You can always verify certain sizes directly in your code via [`static_assert`](https://en.cppreference.com/w/cpp/language/static_assert.html). The language provides helpers like [`sizeof`](https://en.cppreference.com/w/cpp/language/sizeof.html), [`alignof`](https://en.cppreference.com/w/cpp/language/alignof.html), [`offsetof`](https://en.cppreference.com/w/cpp/types/offsetof.html):

```cpp
static_assert(sizeof(MyStruct) == 32);
static_assert(alignof(MyStruct) == 8);
static_assert(offsetof(MyStruct, field) == 8);
```

But these checks only work if you already have some hypothesis or gut feeling about how things are laid out in memory. And that's not always the case. So...

## Printing It by Hand

If you don't have a reliable tool to inspect the memory layout of your struct for your specific environment, you can always use the same [`sizeof`](https://en.cppreference.com/w/cpp/language/sizeof.html), [`alignof`](https://en.cppreference.com/w/cpp/language/alignof.html), [`offsetof`](https://en.cppreference.com/w/cpp/types/offsetof.html) to implement your own small layout printing utility:

```cpp
#define PRINT_MEMBER(T, member) \
    printMember(#member, offsetof(T, member), sizeof(((T*)0)->member))

template<typename T>
static void printHeader(const char* name)
{
	std::cout << "\n=== " << name << " ===\n";
	std::cout << "sizeof  : " << sizeof(T) << "\n";
	std::cout << "alignof : " << alignof(T) << "\n\n";
}

static const char* PADDING_NAME = "      xxx      ";
static std::size_t previousEnd = 0;

static void printLine(const char* name, std::size_t offset, std::size_t size)
{
	std::cout << "  " << std::setw(17) << std::left << name
		<< " offset=" << std::setw(3) << offset
		<< " size=" << size << "\n";
}

static void printMember(const char* name, std::size_t offset, std::size_t size)
{
	if (offset > previousEnd) {
		printLine(PADDING_NAME, previousEnd, offset - previousEnd);
	}
	printLine(name, offset, size);

	previousEnd = offset + size;
}

template<typename T>
static void printTailPadding()
{
	const size_t align = alignof(T);
	const size_t padding = (align - previousEnd % align) % align;
	if (padding == 0) {
		return;
	}
	printLine(PADDING_NAME, previousEnd, padding);
}

static void inspectPersonInfo()
{
	printHeader<PersonInfo>("PersonInfo");

	PRINT_MEMBER(PersonInfo, id);
	PRINT_MEMBER(PersonInfo, age);
	PRINT_MEMBER(PersonInfo, salary);
	PRINT_MEMBER(PersonInfo, isMarried);
	PRINT_MEMBER(PersonInfo, hasDrivingLicense);
	PRINT_MEMBER(PersonInfo, isRemoteWorker);
	PRINT_MEMBER(PersonInfo, hasChildren);
	PRINT_MEMBER(PersonInfo, ownsHouse);
	PRINT_MEMBER(PersonInfo, isSmoker);
	PRINT_MEMBER(PersonInfo, isShareholder);
	PRINT_MEMBER(PersonInfo, role);
	PRINT_MEMBER(PersonInfo, roleData);
	PRINT_MEMBER(PersonInfo, isAvailable);

	printTailPadding<PersonInfo>();

	std::cout << "\n";
}

int main() {
	inspectPersonInfo();
}
```

Output:

```
== PersonInfo ===
sizeof  : 40
alignof : 8

  id                offset=0   size=2
        xxx         offset=2   size=2
  age               offset=4   size=4
  salary            offset=8   size=4
  isMarried         offset=12  size=1
  hasDrivingLicense offset=13  size=1
  isRemoteWorker    offset=14  size=1
  hasChildren       offset=15  size=1
  ownsHouse         offset=16  size=1
  isSmoker          offset=17  size=1
  isShareholder     offset=18  size=1
        xxx         offset=19  size=1
  role              offset=20  size=4
  roleData          offset=24  size=8
  isAvailable       offset=32  size=1
        xxx         offset=33  size=7
```

## Compiler Explorer

In addition to the hand-rolled solution, you can head over to [Godbolt (a.k.a. Compiler Explorer)](https://godbolt.org/).

Paste the memory layout printing code for your struct (exactly the one above), configure the service to execute the program rather than show assembly (yes, Compiler Explorer supports that too), and inspect the memory layout output for *any* platform and any compiler.

Not all platforms support execution properly, but on all the major compilers you'll definitely be able to check everything.
