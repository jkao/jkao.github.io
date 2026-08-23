# jeffkao.ca

Jeff Kao's personal site and Markdown-based writing archive, published with Jekyll on GitHub Pages.

## First-time setup

Run:

```sh
make setup
```

The Makefile uses a local Ruby 3 and Bundler installation when available. On machines with an older system Ruby, it automatically falls back to Docker; Docker Desktop must be running for that path. The site's Ruby packages are installed into `vendor/bundle`, which is ignored by Git.

## Preview the site

```sh
make serve
```

Open <http://127.0.0.1:4000>. To include unpublished articles in the preview, use `make drafts` instead.

## Write an article

Create a draft:

```sh
make new TITLE="What I learned"
```

The command creates `_writing/what-i-learned.md` with this metadata:

```yaml
---
title: "What I learned"
date: 2026-07-15
description: "A short description used in article lists and link previews."
tags:
  - software
published: false
---
```

Write the article below the second `---`. Preview it with `make drafts`, then change `published` to `true` and push the commit to publish it. Article URLs remain stable at `/writing/article-name/` even if the publication date changes.

## Validate before publishing

```sh
make check
```

## Reading list and bookmarklet

The public reading list lives at `/reading/`. Its browser setup and draggable bookmarklet are at `/reading/setup/`, and the capture form is at `/reading/add/`.

Setup requires a fine-grained GitHub token limited to this repository with `Contents: read and write`. The token is stored unencrypted in the browser's origin-wide local storage and must never be committed; any script running on the same origin could read it. Public saves create individual JSON files under `_data/reading/`. Password-locked saves update the encrypted `assets/data/reading-private.json` vault; the vault password can optionally be remembered by the browser.

The design and component specimen is available at `/stylesheet/`.

## Protected legacy content

The directories `archive/` and `in-loving-memory/` are intentionally independent of the modern site. Do not reformat, relocate, or apply the new layouts and styles to their files. Existing media, PDF, and legacy URLs should remain intact.
