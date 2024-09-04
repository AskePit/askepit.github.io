---
tags:
  - article
  - git
title: Git in conditions of extreme branch atomicity
---

How are your branches organized in Git? What do they look like, and what size are they? Below, I'll tell you how to restrict yourself within limits and then deal with the consequences using a nifty life hack.
# Advantage of Small Branches

How are your Git branches organized? What do they look like, and what size are they?

My branches strive to be as small and atomic as possible. This is in contrast to the approach where you start a branch for a specific feature, then include refactoring of the entire project within its scope. Along the way, you fix a persistent bug you’ve discovered. And then suddenly you end up with a branch whose name doesn't reflect what's actually done in it. You, yourself, can't even describe in one sentence what the branch is about. Testers struggle because it's unclear what to test, and reviewers are hesitant to look at your PR/MR since they don't want to descend into that hellish branch.

I strictly maintain my branches to be small and laconic. Each branch performs a single specific task. Sometimes, I even split a branch into two or more when I realize it's starting to spread in different directions.

For example, suppose you needed to write a subsystem for your project and a GUI for that subsystem. It's already clear that this will be two branches — one for the subsystem itself and one for the GUI:


![Branches](https://habrastorage.org/webt/cq/ja/qm/cqjaqm5voffdfqpufgoqgp2ora8.png)

From the `master` branch, `subsystem` is branched, and `subsystem_ui` is built on top of it.

While writing `subsystem`, you might have written a considerable number of core classes that aren't related to your subsystem but are general-purpose classes that could be useful to all programmers on the project. It's a good reason to split the branch in half and move these classes beyond the `subsystem` scope:

![Branches Split](https://habrastorage.org/webt/xf/lj/li/xfljlifa4zsxel0izwcjij5_c0o.png)

Quite a clear picture. However, some of you might already feel uneasy because a problem related to this approach is emerging.

# Problem with Small Branches

It's not hard to see that with this approach, there might be situations where you just end up with long chains of dependent branches:

![](https://habrastorage.org/webt/1_/fo/qm/1_foqmivugdbetmhasn_rrw3g94.png)

Yes, this is a real case for me, especially during intense development periods at work. Testers are bombarded with emails, reviewers can't catch up with the pile, and your tree of branches just keeps growing.

The key challenge in such a development mode is to ensure that all my depending-on-each-other branches remain up-to-date and to prevent them becoming old and full of conflicts with master. Your morning starts with coffee — my morning starts with merging master into the branches. Since master is continuously updated with significant changes from all colleagues, a few days of inactivity can result in a merge conflict nightmare, which tends to grow like a snowball.

Moreover, in each branch in my tree, there's an equal chance that I might add something, fix something, or make adjustments. And all these changes must make their way into the branches depending on the modified one.

# How to Simplify Your Life

I'm quite stubborn, but even for me, all the work of keeping branches in the proper state eventually became an annoying routine, consuming time and bringing no pleasure at all.

Therefore, it's natural that, like a typical programmer, at some point, I got annoyed with the routine enough to pythonize a small automation that made my life a little more enjoyable:

```python
import os

# CONFIG
repo = 'mah_project'

branches = [
    ['master', 'inventory_mechanics', 'ingame_market'],
    ['master', 'remove_legacy_classes', 'new_item_types_project_migration'],
    ['inventory_mechanics', 'configs_refactor', 'new_item_types_project_migration'],
    ['inventory_mechanics', 'new_item_types', 'new_item_types_project_migration'],
]

# CODE
def ex(command):
    print(command)
    err = os.system(command)
    if err != 0:
        print('UNSUCCESS. ABORT')
        exit()    

os.chdir(repo)
ex('git fetch')

for way in branches:
    for i in range(len(way)-1):
        src = way[i]
        dst = way[i+1]
        print(f'\n{src} -> {dst}')

        ex(f'git checkout {dst}')
        ex('git pull')
        ex(f'git merge origin/{src}')
        ex('git push')

```

In short, the script works as follows: in the branches variable, you list all the paths you take from one branch to another during merges. Note that branches is an array of arrays. Since your branch web is, in general, a directed graph, you cannot traverse it with just one path. You’ll probably need several paths.

The script simply goes through all your branches and merges the previous branch in the chain into each of them. For example, `master` will merge into `inventory_mechanics`, `inventory_mechanics` will merge into `ingame_market`, and so on. According to the merges, the same will happen for the other three chains, covering the entire branch graph.

Yes, the script is simple and contains no magic. Yes, it will stop at the first merge conflict, which you still have to resolve yourself. Yes, after resolving another conflict, you need to restart the script. But how pleasant it is when all you need to do is run the following in the command line:

```bash
py chain_merge.py
```

and for a moment, engage in something more enjoyable or meaningful.