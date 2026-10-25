/* Cyanote Lite static content store — pure query logic over a prebuilt manifest.
   Replicates the query semantics of the original server/db.js (listArticles /
   getMeta / getArchivePosts) so the page code runs unmodified. */

/** Meta exactly like the old GET /api/meta: category/tag counts + year/month archive. */
export function computeMeta(posts) {
  const published = posts.filter((x) => x.status === 'published');
  const categoryCount = new Map();
  const tagCount = new Map();
  const years = new Map();
  for (const p of published) {
    for (const c of p.categories || []) categoryCount.set(c, (categoryCount.get(c) ?? 0) + 1);
    for (const t of p.tags || []) tagCount.set(t, (tagCount.get(t) ?? 0) + 1);
    const date = p.publishedAt || p.updatedAt;
    if (date) {
      const y = date.slice(0, 4);
      if (!years.has(y)) years.set(y, { year: y, months: new Map() });
      const m = date.slice(5, 7);
      const ym = years.get(y).months;
      ym.set(m, (ym.get(m) ?? 0) + 1);
    }
  }
  const categories = [...categoryCount.entries()].map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count);
  const tags = [...tagCount.entries()].map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count);
  const archive = [...years.values()]
    .sort((a, b) => b.year.localeCompare(a.year))
    .map((y) => ({
      year: y.year,
      months: [...y.months.entries()]
        .sort((a, b) => b[0].localeCompare(a[0]))
        .map(([month, count]) => ({ month, count })),
    }));
  return { posts: published.length, categories, tags, archive };
}

/** Same filters/sort/pagination as db.listArticles, restricted to published posts
   (a static site has no authenticated writer to see drafts). */
export function listArticles(posts, { category, tag, q, page = 1, pageSize = 10, order = 'desc' } = {}) {
  let items = posts.filter((p) => p.status === 'published');
  if (category) items = items.filter((p) => (p.categories || []).includes(category));
  if (tag) items = items.filter((p) => (p.tags || []).includes(tag));
  if (q) {
    const needle = q.toLowerCase();
    items = items.filter(
      (p) =>
        p.title.toLowerCase().includes(needle) ||
        (p.content || '').toLowerCase().includes(needle) ||
        (p.excerpt || '').toLowerCase().includes(needle)
    );
  }
  const dateOf = (p) => String(p.publishedAt || p.updatedAt || '');
  const newestFirst = (a, b) => dateOf(b).localeCompare(dateOf(a));
  items = [...items].sort(
    (a, b) => (Number(b.pinned) - Number(a.pinned)) || (order === 'asc' ? newestFirst(b, a) : newestFirst(a, b))
  );
  const pageSizeN = Math.min(Math.max(Number(pageSize) || 10, 1), 100);
  const pageN = Math.max(Number(page) || 1, 1);
  return {
    items: items.slice((pageN - 1) * pageSizeN, pageN * pageSizeN),
    total: items.length,
    page: pageN,
    pageSize: pageSizeN,
  };
}

export function getArticle(posts, slug) {
  const article = posts.find((p) => p.slug === slug);
  if (!article || article.status !== 'published') return null;
  return article;
}

/** Same shape as the old GET /api/archive (snake_case kept for page compat). */
export function archivePosts(posts) {
  return posts
    .filter((p) => p.status === 'published' && (p.publishedAt || p.updatedAt))
    .sort((a, b) => String(b.publishedAt || b.updatedAt).localeCompare(String(a.publishedAt || a.updatedAt)))
    .map((p) => ({ slug: p.slug, title: p.title, published_at: p.publishedAt || p.updatedAt }));
}
