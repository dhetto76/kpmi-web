# News and events

One Markdown file per item. The filename becomes the URL:
`ekspor-perdana-2026.md` → `/berita/ekspor-perdana-2026`

## Adding an item

1. Put the image in `public/images/news/`
2. Create a `.md` file here using the template below
3. Commit and push — Vercel deploys automatically

## Frontmatter

```markdown
---
title: Judul berita atau acara
date: 2026-08-21           # publish date, YYYY-MM-DD, controls ordering
type: berita               # "berita" or "acara"
excerpt: Ringkasan satu atau dua kalimat untuk kartu daftar.
image: /images/news/nama-berkas.jpg
# Optional:
eventDate: 2026-09-15      # for type: acara
location: Jakarta
link: https://daftar.example.com
gallery:
  - /images/news/foto-1.jpg
  - /images/news/foto-2.jpg
draft: true                # hidden in production, visible in dev
---

Isi lengkap ditulis di sini dengan Markdown.

## Subjudul

Paragraf, **tebal**, *miring*, [tautan](https://contoh.com), dan daftar
semuanya didukung.
```

`title`, `date`, and `excerpt` are required. Everything else is optional.
