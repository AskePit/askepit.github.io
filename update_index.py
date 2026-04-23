#!/usr/bin/env python3
"""
Regenerates the <div id="articles-column"> and hidden articles in index.html
by scanning blog/ subfolders.

Folder convention: blog/YY_MM_DD_slug/index.html
- Date is parsed from the folder name prefix (YY_MM_DD).
- Title and excerpt are read from <title> and <meta name="description"> inside index.html.
- A folder containing a file named ".hidden" is placed into the hidden-stuff section instead.
"""

import re
from pathlib import Path
from datetime import date

ROOT = Path(__file__).parent
BLOG_DIR = ROOT / "blog"
INDEX_FILE = ROOT / "index.html"

FOLDER_RE = re.compile(r"^(\d{2})_(\d{2})_(\d{2})_(.+)$")
TITLE_RE = re.compile(r"<title>(.*?)</title>", re.IGNORECASE | re.DOTALL)
DESC_RE = re.compile(
    r'<meta\s+name="description"\s+content="(.*?)"\s*/?>',
    re.IGNORECASE | re.DOTALL,
)


def ordinal(n: int) -> str:
    if 10 <= n % 100 <= 20:
        return f"{n}th"
    return f"{n}{ {1: 'st', 2: 'nd', 3: 'rd'}.get(n % 10, 'th') }"


MONTHS = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December",
]


def format_date(d: date) -> str:
    return f"{MONTHS[d.month - 1]} {ordinal(d.day)}, {d.year}"


def collect_articles():
    articles = []
    for folder in sorted(BLOG_DIR.iterdir()):
        if not folder.is_dir():
            continue
        m = FOLDER_RE.match(folder.name)
        if not m:
            continue
        index_html = folder / "index.html"
        if not index_html.exists():
            continue

        yy, mm, dd, _slug = m.groups()
        article_date = date(2000 + int(yy), int(mm), int(dd))

        html = index_html.read_text(encoding="utf-8")
        title_m = TITLE_RE.search(html)
        desc_m = DESC_RE.search(html)
        if not title_m or not desc_m:
            print(f"WARN: missing title or description in {index_html}")
            continue

        articles.append({
            "date": article_date,
            "href": f"blog/{folder.name}/",
            "title": title_m.group(1).strip(),
            "excerpt": desc_m.group(1).strip(),
            "hidden": (folder / ".hidden").exists(),
        })

    articles.sort(key=lambda a: a["date"], reverse=True)
    return articles


def render_article(a, indent: str) -> str:
    return (
        f'{indent}<div class="article">\n'
        f'{indent}    <span class="article-date">{format_date(a["date"])}</span>\n'
        f'{indent}    <br>\n'
        f'{indent}    <span class="title"><a href="{a["href"]}">{a["title"]}</a></span>\n'
        f'{indent}    <span class="kat">{a["excerpt"]}</span>\n'
        f'{indent}</div>'
    )


def replace_block(html: str, start_marker_re: str, end_marker: str, new_block: str) -> str:
    pattern = re.compile(
        r"(" + start_marker_re + r")(.*?)(\n\s*" + re.escape(end_marker) + r")",
        re.DOTALL,
    )
    if not pattern.search(html):
        raise RuntimeError(f"Could not locate block: {start_marker_re!r} ... {end_marker!r}")
    return pattern.sub(lambda m: m.group(1) + new_block + m.group(3), html, count=1)


def main():
    articles = collect_articles()
    visible = [a for a in articles if not a["hidden"]]
    hidden = [a for a in articles if a["hidden"]]

    html = INDEX_FILE.read_text(encoding="utf-8")

    # Visible articles: replace everything between <h2>Articles</h2> and the closing </div> of articles-column.
    visible_block = "\n" + "\n".join(render_article(a, "            ") for a in visible)
    html = replace_block(
        html,
        r'<h2>Articles</h2>',
        '</div>\n\n        <div id="tools-column"',
        visible_block,
    )

    # Hidden articles: replace existing .article entries inside #hidden-stuff.
    # Find the block by its opening tag and locate its matching </div> by depth-counting.
    open_tag = '<div id="hidden-stuff"'
    start = html.find(open_tag)
    if start == -1:
        raise RuntimeError("Could not find #hidden-stuff section")
    content_start = html.index('>', start) + 1

    depth = 1
    i = content_start
    tag_re = re.compile(r'<(/?)div\b[^>]*>', re.IGNORECASE)
    while depth > 0:
        mt = tag_re.search(html, i)
        if not mt:
            raise RuntimeError("Unbalanced #hidden-stuff div")
        if mt.group(1) == '/':
            depth -= 1
            if depth == 0:
                content_end = mt.start()
                break
        else:
            depth += 1
        i = mt.end()

    inner = html[content_start:content_end]
    # Remove existing .article blocks (keep .tool blocks and <hr>).
    inner_cleaned = re.sub(
        r'\s*<div class="article">.*?</div>',
        '',
        inner,
        flags=re.DOTALL,
    )
    hidden_rendered = "".join(
        "\n" + render_article(a, "                ") for a in hidden
    )
    inner_cleaned = inner_cleaned.rstrip() + hidden_rendered + "\n            "
    html = html[:content_start] + inner_cleaned + html[content_end:]

    INDEX_FILE.write_text(html, encoding="utf-8")
    print(f"Updated {INDEX_FILE.name}: {len(visible)} visible, {len(hidden)} hidden article(s).")


if __name__ == "__main__":
    main()
