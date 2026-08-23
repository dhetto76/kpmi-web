import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";
import { marked } from "marked";

/**
 * News and events are Markdown files in `content/news/`, not database rows.
 *
 * Content changes about monthly. Files give version control, PR review, and
 * fully static pages. A database would also need an admin editor UI to be
 * usable by a non-developer — and that editor is a CMS, which this rebuild
 * exists to remove.
 *
 * To add an item: drop an image in `public/images/news/`, create a
 * `.md` file here, commit, push. Vercel deploys it.
 */

const NEWS_DIR = path.join(process.cwd(), "content", "news");

export type NewsItem = {
  slug: string;
  title: string;
  date: string;
  type: "berita" | "acara";
  /** Event date, when different from the publish date. */
  eventDate?: string;
  location?: string;
  image?: string;
  excerpt: string;
  link?: string;
  gallery: string[];
  draft: boolean;
  body: string;
};

function parseFile(filename: string): NewsItem | null {
  const raw = fs.readFileSync(path.join(NEWS_DIR, filename), "utf8");
  const { data, content } = matter(raw);

  if (!data.title || !data.date) return null;

  return {
    slug: filename.replace(/\.mdx?$/, ""),
    title: String(data.title),
    date: String(data.date),
    type: data.type === "acara" ? "acara" : "berita",
    eventDate: data.eventDate ? String(data.eventDate) : undefined,
    location: data.location ? String(data.location) : undefined,
    image: data.image ? String(data.image) : undefined,
    excerpt: String(data.excerpt ?? ""),
    link: data.link ? String(data.link) : undefined,
    gallery: Array.isArray(data.gallery) ? data.gallery.map(String) : [],
    draft: data.draft === true,
    body: content,
  };
}

/** All published items, newest first. Drafts are excluded in production. */
export function getAllNews(): NewsItem[] {
  if (!fs.existsSync(NEWS_DIR)) return [];

  const showDrafts = process.env.NODE_ENV !== "production";

  return fs
    .readdirSync(NEWS_DIR)
    .filter((f) => /\.mdx?$/.test(f))
    // README.md documents the format for authors; it is not an article.
    .filter((f) => f.toLowerCase() !== "readme.md")
    .map(parseFile)
    .filter((item): item is NewsItem => item !== null)
    .filter((item) => showDrafts || !item.draft)
    .sort((a, b) => b.date.localeCompare(a.date));
}

export function getNewsBySlug(slug: string): NewsItem | null {
  return getAllNews().find((item) => item.slug === slug) ?? null;
}

/** Renders the Markdown body to HTML. */
export async function renderBody(markdown: string): Promise<string> {
  return marked.parse(markdown, { async: true, gfm: true, breaks: false });
}
