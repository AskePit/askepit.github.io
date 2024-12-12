---
tags:
  - article
  - rust
  - git
title: Utilizing Git to make Rust development even sweatier
url-title: utilizing_git_to_make_rust_development_even_sweatier
description: Rust was created to make programmers suffer, right? So why not make git collaborate with Rust and make it all even more hardcore? Actually, the article is more about git than Rust, so if you're not particularly familiar with Rust, don't hesitate — the narrative will be more about the development flow than the language itself. Rust was chosen for the article mainly for its convenient package manager `cargo`, which makes the storytelling more laconic and illustrative.
keywords:
  - Rust
  - Git
  - Linter
image:
---

Rust was created to make programmers suffer, right? So why not make git collaborate with Rust and make it all even more hardcore?

Actually, the article is more about git than Rust, so if you're not particularly familiar with Rust, don't hesitate — the narrative will be more about the development flow than the language itself. Rust was chosen for the article mainly for its convenient package manager `cargo`, which makes the storytelling more laconic and illustrative.

## You’ve got a task

You and your team work on a project — a chess engine. You've got a task. There is a code:

```rust
#[derive(Debug, Copy, Clone, PartialEq, Eq)]
pub struct Address {
    pub row: u8,
    pub col: u8,
}
  
impl Address {
    pub fn parse(_s: &str) -> Self {
        todo!();
    }
}
```

The essence of your task: the board in the engine is represented as a two-dimensional matrix. Cells on the board are addressed by coordinates `(row; col)`, where `row` and `col` are in the range `[0; 7]`.

You are asked to implement the `Address::parse()` method. It should parse a human-readable string address of a chessboard cell, for example, `"e2"`, and turn it into an `Address` object that the engine can work with. For `"e2"`, this should yield `(1, 4)`.

## Initial task implementation

Okay, it seems like we need the `trait FromStr` here since we want to create an object from a string. And `Address::parse()` method will be a thin wrapper around the `from_str`. Let's do it:

```rust
#[derive(Debug, PartialEq, Eq)]
pub struct ParseAddressError;

impl FromStr for Address {
    type Err = ParseAddressError;

    fn from_str(s: &str) -> Result<Self, Self::Err> {
        let &[col, row] = s.as_bytes() else {
            return Err(ParseAddressError);
        };

        let col = match col as char {
            'a'..='h' => col - 'a' as u8,
            'A'..='H' => col - 'A' as u8,
            _ => return Err(ParseAddressError),
        };

        let row = match row as char {
            '0'..='7' => row - '0' as u8,
            _ => return Err(ParseAddressError),
        };

        Ok(Self{ row, col })
    }
}
```

That wasn't too difficult — a straightforward, understandable method. We make sure everything compiles with `cargo check` command, then commit it to the repo.

Later, we remember that we forgot about the `parse` method. Okay, just call `from_str` within it:

```rust
impl Address {
    pub fn parse(s: &str) -> Self {
        Address::from_str(s)
    }
}
```
So far, so good — commit, push and report that task is ready for QA.

## Getting Feedback

In a very short period, we get bad feedback because "it doesn't even compile," and we're asked not to let this happen again. Huh, let's see what might be wrong. We did `cargo check` previously and everything was fine. Let's do it again:

```rust
error[E0308]: mismatched types
  --> src\chess_address.rs:11:9
   |
10 |     pub fn parse(s: &str) -> Self {
   |                              ---- expected `Address` because of return type
11 |         Address::from_str(s)
   |         ^^^^^^^^^^^^^^^^^^^^ expected `Address`, found `Result<Address, ParseAddressError>`
   |
   = note: expected struct `Address`
```

Oops, we forgot to check `parse()`, that was hastily written and pushed without any checks. Well, that's an annoying mistake: we rushed and forgot to call `unwrap()`. We also neglected to recheck the build — just hurried to push our work ASAP. Let's do it right way:

```rust
impl Address {
    pub fn parse(s: &str) -> Self {
        Address::from_str(s).unwrap()
    }
}
```

Run `cargo check`, and this time the code compiles without errors. Great! Commit again and push, report that task is ready for QA.

## Getting Feedback II

In a very short period, we get a scolding because `parse` is not working correctly, and we are asked to fix it and cover our code with unit tests. Shame on me, my bad.

In the best traditions of TDD, let's write tests and try to find out where we went wrong:

```rust
#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn address_parse() {
        for (r_id, r_char) in ('1'..='8').enumerate() {
            for (c_id, c_char) in ('a'..='h').enumerate() {
                let addr_str = format!("{}{}", c_char, r_char);
                let addr = Address::parse(&addr_str);

                assert_eq!(addr, Address { row: r_id as u8, col: c_id as u8 });
            }
        }

        macro_rules! check_neg {
            ($addr:expr) => {
                assert_eq!(Address::from_str($addr), Err(ParseAddressError));
            };
        }

        check_neg!("");
        check_neg!("a");
        check_neg!("f11");
        check_neg!("6e");
        check_neg!("f9");
        check_neg!("j5");
        check_neg!("2");
        check_neg!("2789");
        check_neg!("1f");
        check_neg!("c0");
    }
}
```

Time to find that infamous bug, run `cargo test`:

```rust
assertion `left == right` failed
  left: Address { col: 0, row: 1 }
 right: Address { col: 0, row: 0 }
```

`right` is what we expected, `left` is what actually happened. `row` for some reason is one more than it should be. Let's see how `row` is calculated in the method:

```rust
...

let row = match row as char {
	'0'..='7' => row - '0' as u8,
	_ => return Err(ParseAddressError),
};

...
```

Wait, OH SHI~ — we made a typo and started indexing chess rows from zero, even though in chess, columns start from number 1, and we messed up the indexing. Urgently making corrections:

```rust
...

let row = match row as char {
	'1'..='8' => row - '1' as u8,
	_ => return Err(ParseAddressError),
};

...
```

Check the build, `cargo build`:

```
Process finished with exit code 0
```

Run the tests:

```
Process finished with exit code 0
```

Hooray! The bug is fixed, code compiles, and our reputation among colleagues is not as good as it was now.

## What Am I Doing Wrong?

At this stage, we begin to understand that something needs to be changed in the workflow because our level of carelessness is high, but the desire to quickly push our stuff is high as well. Both factors slow down our work and the work of our colleagues.

Automating the process and creating a clever script that can run `cargo check`, `cargo test`, and a couple more `cargo` goodies just before committing could be a right solution.

## Left Hook

I suppose it’s obvious that the narrative here strongly hints at using [git hooks](https://git-scm.com/docs/githooks), which simply won't allow committing non-working code if the hook is cooked right. From the variety of Git hooks, we choose the [`pre-commit`](https://git-scm.com/docs/githooks#_pre_commit) hook because we want to do all our checks *before committing*. [`pre-push`](https://git-scm.com/docs/githooks#_pre_push) could work as well.

### Compilation and Tests

Navigate to the `.git/hooks` folder, create a file named `pre-commit` with the following content:

```bash
#!/bin/sh

cargo check && cargo test
```

Surprisingly simple. After some experiments with intentional syntax and logic errors in the code, we find that it even works. The code simply refuses to commit if tests fail or if there are compilation errors. So, we achieved the minimum – no more shame and punishment from colleagues!

### Formatting

What else could we include in the hook? Well, `cargo fmt` would be a good option – a command that formats your Rust code according to a unified style guide. Okay, add it:

```bash
#!/bin/sh

cargo check && cargo test && cargo fmt
```

Insert an extra space into the code and try committing this change to see what `cargo fmt` does. Now, here's where things don't go as planned. Firstly, the commit with an extra space gets through. Secondly, Git shows that there are not staged changes; let's see what they are:

```diff
@@ -57,7 +57,13 @@ mod tests {
                 let addr_str = format!("{}{}", c_char, r_char);
                 let addr = Address::parse(&addr_str);

-                assert_eq!(addr, Address { row: r_id as u8, col: c_id as u8 });
+                assert_eq!(
+                    addr,
+                    Address {
+                        row: r_id as u8,
+                        col: c_id as u8
+                    }
+                );
             }
         }
```

Right, our code indeed needed some formatting according to `cargo fmt`. Formatting is done, but it missed the commit, and that's a problem.

Let's break down what we have:

- `cargo fmt` (if the command is executed exactly in this form, without flags) never returns an error. It always runs successfully unless there's some severe internal inconsistency, which is unlikely to happen. Therefore, this command *cannot stop the commit*; it will always go through.
- `cargo fmt` makes changes to the code, and these changes, obviously, will be considered as not staged changes.
- The `pre-commit` hook runs *before* the commit.

Analyzing all these points, we conclude that we need to apply the changes made by `cargo fmt` right away in the hook. What if we run `git add .` right in the hook? Nothing stops us from trying:

```bash
#!/bin/sh

cargo check \
&& cargo test \
&& cargo fmt \
&& git add .
```

Let's roll back the mess we made with `git reset --hard HEAD~1` and try the procedure again: insert an extra space somewhere in the code and attempt to commit it. Check what happened: `git status` shows everything is clean, and the commit history shows our commit, whose diff looks like this:

```diff
@@ -57,7 +57,13 @@ mod tests {
                 let addr_str = format!("{}{}", c_char, r_char);
                 let addr = Address::parse(&addr_str);
 
-                assert_eq!(addr, Address { row: r_id as u8, col: c_id as u8 });
+                assert_eq!(
+                    addr,
+                    Address {
+                        row: r_id as u8,
+                        col: c_id as u8
+                    }
+                );
             }
         }
```

Hooray! Our `git add .` inside the hook worked, and we became even more invincible – our code will always be formatted, even if we don't follow the formatting rules during development. Isn't it a miracle?

### Linter

What other interesting `cargo` utilities do we know that can make our code better and cleaner? `cargo clippy` is a linter, a tool for static code analysis to identify and warn about suspicious or suboptimal code.

Remembering the quirks of `cargo fmt`, let's go to the [`cargo clippy` documentation](https://doc.rust-lang.org/stable/clippy/usage.html) right away to find out what pitfalls await us. We learn that in a typical situation, clippy returns exit code 0 (successful execution) even if it found and displayed warnings. This is not suitable for us – we'll see warnings on the screen, but our train will already leave, and the commit will be made despite the presence of warnings. We need to make clippy take warnings more seriously and return a failure, so the commit is rejected by the hook.

In the documentation, we find an approach that suits us:

> For [CI](https://doc.rust-lang.org/stable/clippy/continuous_integration/index.html), all warnings can be elevated to errors which will in turn fail the build and cause Clippy to exit with a code other than `0`.
> 
    `cargo clippy -- -Dwarnings`

Okay, let's add this to our hook:

```bash
#!/bin/sh

cargo check \
&& cargo test \
&& cargo fmt \
&& git add . \
&& cargo clippy -- -D warnings
```

Let's try to commit something to our code. Will clippy even catch anything?

```rust
error: casting a character literal to `u8` truncates
  --> src\main.rs:27:32
   |
27 |             'a'..='h' => col - 'a' as u8,
   |                                ^^^^^^^^^ help: use a byte literal instead: `b'a'`
   |
   = note: `char` is four bytes wide, but `u8` is a single byte
   = help: for further information visit https://rust-lang.github.io/rust-clippy/master/index.html#char_lit_as_u8
   = note: `-D clippy::char-lit-as-u8` implied by `-D warnings`

error: casting a character literal to `u8` truncates
  --> src\main.rs:28:32
   |
28 |             'A'..='H' => col - 'A' as u8,
   |                                ^^^^^^^^^ help: use a byte literal instead: `b'A'`
   |
   = note: `char` is four bytes wide, but `u8` is a single byte
   = help: for further information visit https://rust-lang.github.io/rust-clippy/master/index.html#char_lit_as_u8

error: casting a character literal to `u8` truncates
  --> src\main.rs:33:32
   |
33 |             '1'..='8' => row - '1' as u8,
   |                                ^^^^^^^^^ help: use a byte literal instead: `b'1'`
   |
   = note: `char` is four bytes wide, but `u8` is a single byte
   = help: for further information visit https://rust-lang.github.io/rust-clippy/master/index.html#char_lit_as_u8
```

Now, that's what I call a service – the linter showed us how to make the code not only correct but also a bit shorter. Now we can replace:

```rust
let col = match col as char {
	'a'..='h' => col - 'a' as u8,
	'A'..='H' => col - 'A' as u8,
	_ => return Err(ParseAddressError),
};

let row = match row as char {
	'1'..='8' => row - '1' as u8,
	_ => return Err(ParseAddressError),
};
```

with

```rust
let col = match col {
	b'a'..=b'h' => col - b'a',
	b'A'..=b'H' => col - b'A',
	_ => return Err(ParseAddressError),
};

let row = match row {
	b'1'..=b'8' => row - b'1',
	_ => return Err(ParseAddressError),
};
```

## Conclusions

With such a hook, we can hope that we won't get scolded, and overall, we'll have automated code quality checks with minimal chances of messing everything up. All that remains is to remember to honestly сover our code with unit tests.

So, the final look of our hook:

```bash
#!/bin/sh

cargo check \
&& cargo test \
&& cargo fmt \
&& git add . \
&& cargo clippy -- -D warnings
```

Remember that the `pre-commit` hook is *local*. This means we don't need to worry about pushing it to the repository.

### I Don't Code in Rust, I'm Here for the Idea

For your stack, the hook, *in essence*, will not fundamentally differ from what is written here. You just need to find a way to run your compiler, test utility, formatter, and linter through the hook script. Something might not be present, or perhaps an additional utility specific to your stack or pipeline might be added.

I assume that your hook might look more complex, as not every language/framework has such a convenient package manager as `cargo` (if it even has a package manager – hello, C++).

You can write hooks not only in Bash but also in Python or, God forgive me, Perl. In that case, write `#!/usr/bin/env python` or `#!/usr/bin/perl` at the top of the hook. However, there might be problems with Python on Windows – you can read more about them in [this Habr article](https://habr.com/ru/companies/dins/articles/584562/).

### I Code in Rust, Halp

The hook described in the article can be organized through a utility specially made for this – [`rusty-hook`](https://github.com/swellaby/rusty-hook). All you need to do is create a `.rusty-hook.toml` file in the root of the project with the following content:

```toml
[hooks]
pre-commit = "cargo check && cargo test && cargo fmt && git add . && cargo clippy -- -D warnings"

[logging]
verbose = true
```

I don't know the subtleties of the utility, and whether it's worth using it – whether it has any advantages or disadvantages over idiomatic creation of git hooks is up to you to decide.

---
<small>© Nikolai Shalakin. Translated by the author.</small>