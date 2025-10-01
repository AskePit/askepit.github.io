---
tags:
  - article
title: Writing plugins for Obsidian, part I
url-title: writing_plugins_for_obsidian_1
description: After all the hype around Notion, people scattered in all directions, but somehow most ended up looking toward Obsidian. Internet was flooded with articles about Obsidian and plugins for Obsidian.
keywords:
  - obsidian
  - javascript
  - plugins
image: https://habrastorage.org/r/w1560/getpro/habr/upload_files/2af/b22/0a6/2afb220a6ff39c34634dc0f864e28642.png
date: 27.11.2024
---

# Introduction

After all the hype around Notion, people scattered in all directions, but somehow most ended up looking toward Obsidian. Internet was flooded with articles about Obsidian and plugins for Obsidian.

However, to my disappointment, there are not so many articles about how to write your own plugin rather than just use someone else’s creations. In the meantime, I’d like to fill this gap with my own guide.

# What We'll Be Doing

This will be a two-article series where we’ll write four entire plugins together. They’ll be simple, small, but I’m not joking when I say I plan to use them personally and regularly in my primary Obsidian vault. That is, I’m writing them for myself first and foremost, which guarantees that these plugins, while simple, aren’t some pointless Hello World demos but actually perform useful tasks—at least for one user.

The articles are aimed at making it _as easy as possible_ to get into Obsidian plugin development. I want to show just how simple it is—you can sit down and start writing a plugin with nothing more than Obsidian and your favorite text editor. No additional installations needed, I promise.

I also suggest using these articles as a supplementary _do-by-example_ documentation when you need to write your own plugin. My four small plugins might not do exactly what your plugin needs to do, but they’ll help you navigate the official documentation with confidence and know where to start.

One small request: if you skim the article, please don’t skip the poll at the end—I’m very interested in the stats.

# What You Need to Write a Plugin

For a long time, I hesitated even to consider writing my own plugins because I thought it required a frontend zoo of TypeScript, Electron, npm, Node.js, or something equally intimidating.

The official Obsidian documentation _strongly recommends_ using TypeScript and npm and exclusively demonstrates this approach in their [GitHub examples](https://github.com/obsidianmd/obsidian-sample-plugin). But I assert that if you just want to sit down and write a tiny plugin, you _don’t need_ that stack at all.

The four plugins we’ll write are essentially about crafting a `main.js` file for each of them. Oh, and a `manifest.json`, but that’s just a few lines.

# Brief API Overview

Obsidian has [official documentation](https://docs.obsidian.md/Home) for plugin development. It includes guides on various topics as well as a full API Reference listing all the classes available for development.

In my experience, the guides are pretty shallow, only covering the absolute basics. Digging through the API Reference can also be challenging, especially if you’re not sure what you’re looking for. At the very least, Obsidian has a Discord channel where the community can help you in the `plugin-dev` chat.

When starting out, it’s tough without a basic reference to the most important API classes so you know where to go to accomplish specific tasks. Here’s my list of essential classes:

Key logic classes:

- [`Plugin`](https://docs.obsidian.md/Reference/TypeScript+API/Plugin): Inherit from this to create a plugin
- [`App`](https://docs.obsidian.md/Reference/TypeScript+API/App): The central hub for all major Obsidian singletons
- [`Vault`](https://docs.obsidian.md/Plugins/Vault): Handles working with folders and files in the vault
- [`FileManager`](https://docs.obsidian.md/Reference/TypeScript+API/FileManager): For more specialized file and folder operations. Sometimes it’s hard to guess whether a feature is in `Vault` or `FileManager`

Key UI classes:

- [`Notice`](https://docs.obsidian.md/Reference/TypeScript+API/Notice): For small popup notifications
- [`Modal`](https://docs.obsidian.md/Plugins/User+interface/Modals): Dialog windows, including ones with input fields
- [`ItemView`](https://docs.obsidian.md/Plugins/User+interface/Views): A custom GUI element where you can render any HTML content
- [`Workspace`](https://docs.obsidian.md/Plugins/User+interface/Workspace): Manages all screen views, including tabs, splits, and more

Here’s a funny JavaScript tidbit: in three out of the four plugins, we’ll need this simple function:

```javascript
const removePrefix = (value, prefix) =>
    value.startsWith(prefix) ? value.slice(prefix.length) : value;
```

Yes, by some strange twist of fate, writing plugins for Obsidian often involves removing prefixes from strings, yet the `String` interface doesn’t offer anything suitable for this ¯\_(ツ)_/¯.

# Plugin Skeleton

In the most minimalist version, to create a plugin you need to:

- Locate the `.obsidian/plugins` folder in your _preferably test_ Obsidian vault.
- Create a folder inside it with the name of your plugin.
- Add a `manifest.json` file in the plugin folder containing the plugin’s information.
- Add a `main.js` file in the plugin folder with the plugin’s code.

And that’s pretty much it :) Obsidian will immediately recognize the plugin, and you’ll be able to enable it in the settings like any other Community plugin.

We always start by creating a `manifest.json` file where we declare all the plugin’s information:

```json
{
	"id": "test-habr-plugin",
	"name": "Test Habr Plugin",
	"version": "1.0.1",
	"minAppVersion": "1.0.0",
	"description": "Habr stronk",
	"author": "askepit",
	"authorUrl": "",
	"helpUrl": "",
	"isDesktopOnly": false
}
```

I think there’s no need to explain what’s going on here—every field has clear and self-explanatory names. All the information specified in the manifest will be used by Obsidian to display details about your plugin in the Community plugins settings section.

Just don’t repeat my mistake! Foolishly, I initially set `"isDesktopOnly": true` in my plugins, assuming that deploying handwritten plugins to mobile devices would be complicated, and I wouldn’t bother with it. Spoiler: deploying to mobile is practically effortless—as long as you’ve set `"isDesktopOnly": false` in advance. I paid the price for this oversight with a prolonged facepalm moment and even had to ask for help in the official Discord channel because I completely forgot about this manifest field. So, learn from my mistake :)

Now, let’s move on to the plugin’s code itself. In its minimal form, a functional plugin recognizable by Obsidian looks like this:

```javascript
'use strict'
var obsidian = require('obsidian')

class TestHabrPlugin extends obsidian.Plugin {
    async onload() {

    }
}

module.exports = TestHabrPlugin
```

You can safely copy this template from one of your plugins to another. The class we inherited from `obsidian.Plugin` is our main entity, responsible for managing the entire lifecycle of our plugin.

The plugin doesn’t do anything yet, but it’s recognized in your settings and can be enabled. But if you do this:

```javascript
async onload() {
	console.log('Habr stronk')
}
```

Then, upon enabling the plugin, you'll see your message in Obsidian's dev-tools console (`Ctrl + Shift + I`):

![](https://habrastorage.org/webt/4x/xm/jq/4xxmjqxzv3z7jfhqeauzmzuoxbe.png)

# Plugin 1: Guitar Tabs Viewer

Let's start with the simplest and most minor plugin for a warm-up and easy onboarding.

## Task

I have notes with guitar tablatures that I store in the following format:

```
E|---------------------------------|
B|---------------------------------|
G|---------------------------------|
D|-------3-5-4-3-------------------|
A|-5---5---------5-3---3-0-0-3-3-4-|
E|---------------------------------|
```

Tablatures generally look more or less the same, but there are oddities when someone on the internet ~~is wrong~~ draws the string ruler in their own peculiar way. You might come across tablatures with horizontal lines like these:

```
E|—————————————————————————————————|
B|—————————————————————————————————|
G|—————————————————————————————————|
D|———————3—5—4—3———————————————————|
A|—5———5—————————5—3———3—0—0—3—3—4—|
E|—————————————————————————————————|
```

There are also other types of lines—ASCII symbols for horizontal dashes are abundant. This visual inconsistency really bothers me. Plus, I'd like to minimize the presence of lines in the tablature staff altogether.

That's why I want the _view_ mode for pages with tablatures to unify all the various types of dashes into a single standard. As that standard, I've chosen the Middle dot (`·`) symbol, as it takes up the least visual space. The most extreme option, of course, would be a space, but in that case, all the numbers would simply "float in the air," significantly reducing readability.

In short, I want to see all tablatures like this:

```
E|·································|
B|·································|
G|·································|
D|·······3·5·4·3···················|
A|·5···5·········5·3···3·0·0·3·3·4·|
E|·································|
```

We will format tablatures in notes using a code block like this:

````
```tab
E|---------------------------------|
B|---------------------------------|
G|---------------------------------|
D|-------3-5-4-3-------------------|
A|-5---5---------5-3---3-0-0-3-3-4-|
E|---------------------------------|
```
````

The plugin should only process blocks marked with `tab` or `tabs`.

By the way, karma points to anyone who can guess what song this is from :)

## Implementation

The task boils down to making the page replace the content of code blocks marked as `tab` or `tabs` in view mode. In Obsidian terms, this is called markdown post-processing—your markdown is already rendered into HTML, and you can intercept this HTML just before the page is displayed to modify elements however you like.

The `Plugin` class provides a convenient method, [`registerMarkdownPostProcessor()`](https://docs.obsidian.md/Reference/TypeScript+API/Plugin/registerMarkdownPostProcessor), specifically designed for this operation, so implementing the plugin is essentially straightforward:

```javascript
class GuitarTabsViewerPlugin extends obsidian.Plugin {
    async onload() {
        this.registerMarkdownPostProcessor((element, context) => {
            const codeblocks = element.findAll('code')
      
            for (let codeblock of codeblocks) {
                const blockName = removePrefix(codeblock.className, 'language-')
                if (blockName != "tab" && blockName != "tabs") {
                    continue
                }

                const targetSymbol = '·'

                codeblock.innerHTML = codeblock.innerHTML
                    .replaceAll('-', targetSymbol) // minus sign
                    .replaceAll('–', targetSymbol) // en-dash
                    .replaceAll('—', targetSymbol) // em-dash
                    .replaceAll('─', targetSymbol) // horizontal line
                    .replaceAll('‒', targetSymbol) // figure dash
            }
        })
    }
}
```

Here’s what’s happening: `element` is the root HTML element of the content, something like `<body>`. Our task is to find all `<code class="language-tab">` tags. Code blocks are marked by Obsidian with a class `language-X`, where `X` is the name of your programming language—or in our case, the tag `tab/tabs`.

Once the code blocks are found, we replace their `innerHTML` by simply substituting all known types of horizontal dashes with the `·` symbol.

Congratulations! Our first plugin that does something meaningful is ready:

![](https://habrastorage.org/webt/2j/nu/if/2jnuifjcqkvmap6pcer8dqki9qa.png)

At the top is the tablature in edit mode, and at the bottom is how it looks in reading mode.

Some might find this style of tablature questionable, but that’s the point of personal plugins—to cater to personal needs. Besides, in our case, the main focus is on the educational process :)

# Plugin 2: Suggest TODO

## Task

I have a specific problem related to to-do lists. A typical scenario: I have a long TODO list, and I can never decide which item to tackle next. In the end, I either end up completely procrastinating, not starting anything at all, or I choose the most pleasant tasks, ignoring the difficult and unpleasant ones, leaving them hanging on the list for months.

Let’s try to break through laziness and indecision with a plugin that selects a TODO item from the list for us.

Here’s how it should work: we have a note with items, for example:

![](https://habrastorage.org/webt/ul/fn/po/ulfnpot4bdm0bxbatxx9ralxcpm.png)

Or even like this:

![](https://habrastorage.org/webt/3r/nq/6p/3rnq6pnbylta31sjstxgtmru9yy.png)

Both types of lists should be supported. In the case of checkboxes, only unchecked items should be considered. The idea is to open a note with a TODO list and execute the _Suggest TODO_ command, which will suggest something for us. We want the command to be available in two ways:

- Via the [Command palette](https://help.obsidian.md/Plugins/Command+palette)
- Via the [Ribbon menu](https://help.obsidian.md/User+interface/Ribbon)

The response with the suggested TODO should be displayed in a separate dialog window.

## Implementation

To begin, let’s separate the business logic from the plugin’s operational code by writing a function `suggestTodoImpl()`. This function will take raw `markdown` as input and return a string with a randomly selected TODO. The returned TODO should be cleaned of visual clutter and ready for display in the final dialog window. If the algorithm cannot find any available TODOs to suggest, the function should return `null`:
```javascript
function suggestTodoImpl(markdown) {
    const todos = markdown.split("\n")
        // find TODOs
        .filter(line => {
            if (line.startsWith('- [x]')) return false
            return line.startsWith('- ') || line.startsWith('- [ ]')
        })
        // prettify TODOs
        .map(line => removePrefix(removePrefix(line, '- [ ]'), '- ').trim())

    if (todos.length === 0) {
        return null
    }

    const randomLine = todos[Math.floor(Math.random() * todos.length)]
    return randomLine
}
```

With this core logic in place, we can move on to the plugin itself. First, let’s let the plugin know that we want a custom Command and an icon in the Ribbon:

```javascript
class TodoSuggestPlugin extends obsidian.Plugin {
    async onload() {
        this.addCommand({
            id: 'Suggest-random-todo',
            name: 'Suggest random TODO',
            callback: () => {this.suggestTodo()}
        })

        this.addRibbonIcon('dice', 'Suggest random TODO', (evt) => {
            this.suggestTodo()
        })
    }
}
```

Both callbacks refer to `this.suggestTodo()`, which we haven’t written yet. But we’ll fix that shortly. In `this.addCommand()`, we register a command that can be invoked with `Ctrl + P`, and `this.addRibbonIcon()` adds a `dice` icon to the left-hand panel, resembling a die. Both actions will lead to the same logic:

```javascript
async suggestTodo() {
	const activeView = this.app.workspace.getActiveViewOfType(obsidian.MarkdownView)
	if (!activeView) {
		new Notice("No active note found!")
		return
	}

	let content
	if (activeView.getMode() === "source") {
		// Editor mode: Get content from the editor
		const editor = activeView.editor
		content = editor.getValue()
	} else if (activeView.getMode() === "preview") {
		// Reading mode: Read content from the file
		const file = activeView.file
		content = await this.app.vault.read(file)
	}

	if (!content) {
		new Notice("Could not read content!")
		return
	}

	const todo = suggestTodoImpl(content)
	
	if (!todo) {
		new Notice("No TODOs available!")
		return
	}

	new ResultModal(this.app, todo).open()
}
```

The code, though it may seem lengthy, is mostly a prelude to the line `const todo = suggestTodoImpl(content)`. The task of finding the `content` boils down to first locating the active view in Obsidian and then extracting the markdown from it.

The first step is accomplished with `this.app.workspace.getActiveViewOfType(obsidian.MarkdownView)`, while the second depends on the mode the view is currently in: reading or editing. This explains the branching logic in the attempts to populate `content`.

We also encounter two new classes:

- `Notice`
- `ResultModal`

[`Notice`](https://docs.obsidian.md/Reference/TypeScript+API/Notice) is a small popup notification that appears in the top-right corner of the window for a few seconds. For example, like this:

![](https://habrastorage.org/webt/v0/1m/wn/v01mwnwccq6nwv2v1dla9_qmczo.png)

We’ll use it to notify the user about non-standard situations.

As for `ResultModal`, it’s our custom class—a dialog window where we’ll display the result of the command execution if everything goes smoothly:

![](https://habrastorage.org/webt/9p/aw/y_/9pawy_oxjdtqyugwvwsnbynnnsk.png)

To create a custom modal window, you need to inherit from [`Modal`](https://docs.obsidian.md/Plugins/User+interface/Modals) and define the window's content in the class constructor:

```javascript
class ResultModal extends obsidian.Modal {
    constructor(app, todo) {
        super(app)

        this.setTitle('Your TODO')
        this.setContent(todo)

        new obsidian.Setting(this.contentEl)
            .addButton((btn) =>
                btn
                .setButtonText('OK')
                .setCta()
                .onClick(() => {
                    this.close()
                })
            )
    }
}
```

The OK button simply closes the modal window.

The plugin is ready! You can use it via the Command palette by running the _Suggest TODO_ command:

![](https://habrastorage.org/webt/zz/l7/x7/zzl7x7ylu1tgtwituhtxaknyjx4.png)

Or simply click on the icon in the left-hand panel:

![](https://habrastorage.org/webt/hg/9m/uo/hg9muo_xcj1homlih33_vjoxny4.png)


# Plugin 3. Top-10 Recent Edited Notes

## Task

Up until recently, I had the mighty [Dataview](https://blacksmithgu.github.io/obsidian-dataview/) plugin installed in Obsidian. It's a _beast_ of a plugin that can do everything short of launching a spacecraft. It brings SQL and JavaScript magic into your notes, so you can juggle your data and create clever summaries and extracts to your heart's content.

All that computational abundance? Not my cup of tea. I had Dataview installed for one reason only: to keep a handy note with a list of the top 10 most recently edited files in my vault. All you had to do was create a note with the following content:

````
```dataview
TABLE file.ctime as "Time Modified"
SORT file.ctime DESC
LIMIT 10
```
````

and in preview mode, it would display the result of this "SQL" query, complete with quick links to jump straight to the files in the summary:

![](https://habrastorage.org/webt/dl/qd/dk/dlqddkyz1iiafixvb_1i7x6jeeq.png)

In my test vault, I couldn’t even scrape together 10 files, but you get the idea.

This kind of list is essential for me because—whether it's universal or just me—here's the deal:

> The less time that's passed since the last edit, the higher the chances I'll need that note again to add something to it.

And yes, I’m aware of the core plugin [Quick Switcher](https://help.obsidian.md/Plugins/Quick+switcher), which you can summon with `Ctrl + O`. Its issue is that it shows the top _recently opened_ files, which is not the same thing and totally disrupts my workflow.

So, here’s the plan:

- Create a top-10 list, but not as a note—instead, as a custom UI page on the right panel, where tags, page content, links, etc., are displayed.
- Make it a flexible top-N list, where N is configurable in the plugin settings.
- Get rid of the heavyweight Dataview plugin since it’s no longer needed.

## Implementation

The plugin’s functionality boils down to replicating the Dataview query described earlier:

- Fetch a list of all vault files.
- Sort them by their last modified date.
- Limit the list to N files.
- Render the result as clickable links to the files.

Since we plan to work with the entire vault, we need the `Vault` class, which is tailored for such tasks. It has a method [`Vault.getMarkdownFiles()`](https://docs.obsidian.md/Reference/TypeScript+API/Vault/getMarkdownFiles) that provides a list of [`TFile`](https://docs.obsidian.md/Reference/TypeScript+API/TFile) objects. From these, you can retrieve the last modified date: `file.stat.mtime`. Let’s outline a utility function for this logic:

```javascript
function getTopNFiles(plugin, n) {
	const files = plugin.app.vault.getMarkdownFiles().sort(
		(f1, f2) => {
			return f2.stat.mtime - f1.stat.mtime
		}
	)
	
	if (files.length > n) {
		files.length = n
	}
	
	return files
}
```

Now we just need to decide where this code will be executed. In this plugin, we want to render the content in a custom panel on the right. This involves rendering into a custom [`View`](https://docs.obsidian.md/Reference/TypeScript+API/View).

Luckily, the Obsidian Docs provide an excellent [guide](https://docs.obsidian.md/Plugins/User+interface/Views) that explains how to work with Views: how to declare them, register them in the plugin, display them, and populate them. We’ll follow this guide step by step and end up with code like this:

```javascript
class RecentEditedNotesPlugin extends obsidian.Plugin {
    async onload() {
        this.registerView(
            VIEW_TYPE_RECENT_EDITED_NOTES,
            (leaf) => new RecentEditedNotesView(leaf, this)
        )
        this.activateView()
    }

    async activateView() {
        const { workspace } = this.app
    
        let leaf = null
        const leaves = workspace.getLeavesOfType(VIEW_TYPE_RECENT_EDITED_NOTES)
    
        if (leaves.length > 0) {
            // A leaf with our view already exists, use that
            leaf = leaves[0]
        } else {
            // Our view could not be found in the workspace, create a new leaf
            // in the right sidebar for it
            leaf = workspace.getRightLeaf(false)
            await leaf.setViewState({ type: VIEW_TYPE_RECENT_EDITED_NOTES, active: true })
        }
    
        // "Reveal" the leaf in case it is in a collapsed sidebar
        workspace.revealLeaf(leaf)
    }
}

const VIEW_TYPE_RECENT_EDITED_NOTES = 'recent-edited-notes-view'

class RecentEditedNotesView extends obsidian.ItemView {
    plugin = null

    constructor(leaf, plugin) {
        super(leaf)
        this.plugin = plugin
    }

    getViewType() {
        return VIEW_TYPE_RECENT_EDITED_NOTES
    }

    getDisplayText() {
        return 'Recent edited notes'
    }

    async onOpen() {
    }
}

```

This is all boilerplate code taken straight from the guide to declare and display a new view on the right panel with the ID `recent-edited-notes-view`:

![](https://habrastorage.org/webt/sf/h0/2o/sfh02oidhceoeixxaojgazez1ei.png)

The View is currently empty, and we’ll populate it in the `async onOpen()` method, which is also empty for now. First, let’s think about the high-level behavior: when and under what conditions should the View’s content update?

- At Obsidian startup
- When a file is modified
- When a file is renamed

Let’s write it down like this:

```javascript
async onOpen() {
	this.registerEvent(
		this.plugin.app.vault.on('modify', (file) => {
			this.update()
		})
	)
	this.registerEvent(
		this.plugin.app.vault.on('rename', (file) => {
			this.update()
		})
	)

	this.update()
}
```

Yes, the `Vault` class allows you to attach a callback to events like [modification](https://docs.obsidian.md/Reference/TypeScript+API/Vault/on('modify')) or [renaming](https://docs.obsidian.md/Reference/TypeScript+API/Vault/on('rename')) of a file. Huge thanks to [@MikleNT](https://habr.com/ru/users/MikleNT/) for pointing out that such events should be properly wrapped in `this.registerEvent()` to ensure automatic unsubscription when the plugin is unloaded. This information can also be found in the [obsidian-api GitHub repository](https://github.com/obsidianmd/obsidian-api?tab=readme-ov-file#registering-events).

We’re practically at the finish line now—just one more step: writing the `update()` function to populate the View with our top list:

```javascript
update() {
	const container = this.containerEl.children[1]
	container.empty()

	container.createEl('h4', { text: 'Top-10 recent edited notes' })

	const files = getTopNFiles(this.plugin, 10)
	const ul = container.createEl('ul')

	for (const file of files) {
		const li = ul.createEl('li')
		const link = li.createEl('a', { text: file.basename })
	}
}
```

Why is the index `1` in `this.containerEl.children[1]` and not `0`? Honestly, I couldn’t tell you—that’s how it was written in the guide, and it works, so I didn’t feel like experimenting. :)

The function adds a header to the view, fetches the list of files using `getTopNFiles()`, and programmatically generates HTML that looks like this:

```
<li>
    <a>...</a>
    <a>...</a>
    <a>...</a>
    ...
</li>
```
And we get the result:

![](https://habrastorage.org/webt/oh/ei/iu/oheiiucolnnlat3brybyvoosxc0.png)

Again, I don’t have 10 files, but you get the idea.

But the links don’t work! And no matter how hard I tried to make them work—setting the `href`, other attributes, reading the official documentation, debugging links in Obsidian, trying to add Obsidian’s `.internal-link` class to the `<a>` tags—nothing worked. In the end, I found the solution in the Discord channel. The correct working solution looks like this:

```javascript
link.addEventListener("click", (event) => {
	event.preventDefault() // Prevent default link behavior
	app.workspace.openLinkText(file.path, "", false) // Open the note
})
```

It’s a shame the official documentation didn’t cover such an important detail as opening an internal note via a link. But, in the end, we managed to figure it out.

---

Let’s not forget that I promised to add settings to this plugin. The official documentation has a dedicated [guide](https://docs.obsidian.md/Plugins/User+interface/Settings) for them. We’ll follow that too. Our plugin will have one modest setting—the number of files in the top list:

```javascript
class RecentEditedNotesSettingTab extends obsidian.PluginSettingTab {
    plugin = null
  
    constructor(app, plugin) {
        super(app, plugin)
        this.plugin = plugin
    }
  
    display() {
        let { containerEl } = this

        containerEl.empty()

        new obsidian.Setting(containerEl)
            .setName('List length')
            .setDesc('How long is your list of recently edited notes')
            .addText((text) =>
                text
                .setValue(this.plugin.settings.listLength)
                .onChange(async (value) => {
                    this.plugin.settings.listLength = value
                    await this.plugin.saveSettings()
                })
            )
    }
}

const DEFAULT_SETTINGS = {
    listLength: 10,
}

class RecentEditedNotesPlugin extends obsidian.Plugin {
    settings = null

    async onload() {
        await this.loadSettings()
        this.addSettingTab(new RecentEditedNotesSettingTab(this.app, this))
	    ...
    }

    async loadSettings() {
        this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData())
    }

    async saveSettings() {
        await this.saveData(this.settings)
    }
}
```

We’ve declared a settings tab `RecentEditedNotesSettingTab`, filled it with a List length field, and registered it in the plugin. Saving and loading are also handled. Now, we’re ready to use this setting in our View. We’ll modify two places.

The first one:

```diff
-container.createEl('h4', { text: 'Top-10 recent edited notes' })
+container.createEl('h4', { text: `Top-${this.plugin.settings.listLength} recent edited notes` })

```

The second one:

```diff
-const files = getTopNFiles(this.plugin, 10)
+const files = getTopNFiles(this.plugin, this.plugin.settings.listLength)
```

Now, if we go to the settings, we’ll find our plugin under the Community plugins section:

![](https://habrastorage.org/webt/on/sy/e1/onsye1e3ahnewh-sphwuius4sda.png)

This is the only plugin with settings in my test vault, so it stands here in proud solitude.

Now, let’s head to my personal Vault and test how the setting works when we change the value to 20:

![](https://habrastorage.org/webt/hv/m0/m5/hvm0m5i7rceofsuor2ysxwjks7m.png)

Done!

Even while writing this article, I actively used this plugin to quickly get back to work.

# Interim Summary

So, we’ve written three simple plugins. I hope I’ve managed to demonstrate the key point in Obsidian plugin development—you can simply sit down, create a couple of files, and start writing a plugin. No need to install anything.

### What about mobile Obsidian?

If you have Obsidian Sync, you’ll get your plugins immediately after syncing your devices. Just make sure not to forget `"isDesktopOnly": false` in `manifest.json`! Otherwise, the plugins will appear on your mobile device but won’t activate.

If you sync using another method, just ensure that the folders for your plugins are in the `.obsidian/plugins` directory, and everything will work as expected.

### What about the fourth plugin?

We’ll write it together in the second article. It will be a bit larger and more serious, covering a new topic like advanced layout inside notes and applying CSS styles to that layout.

### Where to find the source code

After the second article is released, I’ll provide a link to GitHub with all the plugins.

### How to publish a plugin for the Obsidian community?

This goes beyond the scope of this article, and we _won’t_ be publishing the plugins we wrote here. It’s not an ultimatum, but I feel that these plugins are too simple and niche, and I wouldn’t want to clutter the Community plugins section with them.

As for the publishing process, there is an entire section in the documentation dedicated to this topic. You can start [here](https://docs.obsidian.md/Plugins/Releasing/Submit+your+plugin). In short, you’ll need a GitHub repository and a plugin formatted according to all rules and requirements, which must first go through Obsidian’s review team. If everything goes well after the iterative review process, your plugin will be published.

---
<small>© Nikolai Shalakin. Originally published by <a href="https://habr.com/ru/articles/861230/">habr.com</a>, used under CC BY 3.0. Translated by the author.</small>