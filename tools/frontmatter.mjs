/* Minimal YAML-ish front-matter parser/serializer shared by build.mjs and the
   migration tool. Supports what Cyanote posts need — scalars, [a, b] arrays,
   dash lists, quoted strings, booleans, numbers — nothing more.

   The identical grammar is implemented in C# by the Windows publisher
   (publisher/FrontMatter.cs); keep the two in sync when extending. */

const FM_KEYS = new Set([
  'title', 'date', 'updated', 'categories', 'tags', 'excerpt',
  'cover', 'pinned', 'views', 'status', 'draft',
]);

function parseScalar(raw) {
  const v = raw.trim();
  if (v === '') return '';
  if (v.startsWith('"') && v.endsWith('"') && v.length >= 2) {
    try {
      return JSON.parse(v); // full escape support (\" \\ \n …), matches the serializer
    } catch {
      return v.slice(1, -1);
    }
  }
  if (v.startsWith("'") && v.endsWith("'") && v.length >= 2) {
    return v.slice(1, -1).replace(/''/g, "'");
  }
  if (v === 'true') return true;
  if (v === 'false') return false;
  if (v === 'null') return null;
  if (/^-?\d+$/.test(v)) return Number(v);
  return v;
}

function parseInlineArray(raw) {
  const inner = raw.trim().replace(/^\[/, '').replace(/\]$/, '');
  if (!inner.trim()) return [];
  return splitTop(inner).map((s) => parseScalar(s));
}

/** split on commas that are not inside quotes or brackets */
function splitTop(s) {
  const out = [];
  let depth = 0;
  let quote = null;
  let cur = '';
  for (let i = 0; i < s.length; i++) {
    const ch = s[i];
    if (quote) {
      cur += ch;
      if (ch === quote) quote = null;
    } else if (ch === '"' || ch === "'") {
      quote = ch;
      cur += ch;
    } else if (ch === '[' || ch === '(') {
      depth++;
      cur += ch;
    } else if (ch === ']' || ch === ')') {
      depth--;
      cur += ch;
    } else if (ch === ',' && depth === 0) {
      out.push(cur);
      cur = '';
    } else {
      cur += ch;
    }
  }
  if (cur.trim()) out.push(cur);
  return out;
}

/** Parse `---` front-matter. Returns { data, body, hasFm }. */
export function parseFrontMatter(raw) {
  const text = String(raw ?? '').replace(/^\uFEFF/, '');
  const m = text.match(/^---[ \t]*\r?\n([\s\S]*?)\r?\n---[ \t]*(?:\r?\n|$)/);
  if (!m) return { data: {}, body: text, hasFm: false };

  const data = {};
  let lastKey = null;
  for (const line of m[1].split(/\r?\n/)) {
    if (!line.trim()) continue;
    const dash = line.match(/^[ \t]+-[ \t]?(.*)$/);
    if (dash && lastKey) {
      const list = (data[lastKey] = Array.isArray(data[lastKey]) ? data[lastKey] : []);
      list.push(parseScalar(dash[1]));
      continue;
    }
    const kv = line.match(/^([A-Za-z_][\w-]*)[ \t]*:[ \t]*(.*)$/);
    if (!kv) continue; // tolerate junk lines
    const key = kv[1].toLowerCase();
    const valueRaw = kv[2];
    if (valueRaw.trim() === '') {
      data[key] = []; // may become a dash list below
    } else if (/^\[.*\]$/.test(valueRaw.trim())) {
      data[key] = parseInlineArray(valueRaw);
    } else {
      data[key] = parseScalar(valueRaw);
    }
    lastKey = key;
  }

  const body = text.slice(m[0].length);
  return { data, body, hasFm: true };
}

function quoteIfNeeded(v) {
  const s = String(v);
  if (s === '') return '""';
  if (/^[-+.\d]+$/.test(s) && !/^\d{4}-\d{2}-\d{2}/.test(s)) return JSON.stringify(s); // numeric-looking text stays a string
  if (/[:#\[\]{}",']/.test(s) || s !== s.trim() || /^(true|false|null)$/i.test(s)) return JSON.stringify(s);
  return s;
}

function fmtDate(iso) {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(+d)) return iso;
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())} ${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}`;
}

/**
 * Serialize front-matter with a stable, canonical key order.
 * Known keys first (only when set/non-default), then unknown keys verbatim.
 * Naive datetimes are UTC — the build must be deterministic across machines.
 */
export function stringifyFrontMatter(data, body) {
  const lines = ['---'];
  const push = (k, v) => lines.push(`${k}: ${v}`);
  if (data.title != null) push('title', quoteIfNeeded(data.title));
  if (data.date) push('date', fmtDate(data.date));
  if (data.updated) push('updated', fmtDate(data.updated));
  if (Array.isArray(data.categories) && data.categories.length) push('categories', `[${data.categories.map(quoteIfNeeded).join(', ')}]`);
  if (Array.isArray(data.tags) && data.tags.length) push('tags', `[${data.tags.map(quoteIfNeeded).join(', ')}]`);
  if (data.excerpt) push('excerpt', quoteIfNeeded(data.excerpt));
  if (data.cover) push('cover', quoteIfNeeded(data.cover));
  if (data.pinned) push('pinned', 'true');
  if (Number(data.views) > 0) push('views', Number(data.views));
  if (data.status === 'draft' || data.draft === true) push('status', 'draft');
  for (const [k, v] of Object.entries(data)) {
    if (FM_KEYS.has(k)) continue;
    if (Array.isArray(v)) push(k, `[${v.map(quoteIfNeeded).join(', ')}]`);
    else if (v != null) push(k, quoteIfNeeded(v));
  }
  lines.push('---');
  return `${lines.join('\n')}\n\n${String(body ?? '').replace(/^\s+/, '')}`;
}

/** Normalize any accepted date form to ISO (UTC). Returns null for empty. */
export function toIsoDate(v, { fallback = null } = {}) {
  if (!v) return fallback;
  if (v instanceof Date) return Number.isNaN(+v) ? fallback : v.toISOString();
  const s = String(v).trim();
  // naive "YYYY-MM-DD[ HH:mm[:ss]]" — treat as UTC for deterministic builds
  const naive = s.match(/^(\d{4})-(\d{2})-(\d{2})(?:[ T](\d{2}):(\d{2})(?::(\d{2}))?)?$/);
  if (naive) {
    const [, y, mo, d, h = 0, mi = 0, se = 0] = naive;
    const dt = new Date(Date.UTC(+y, +mo - 1, +d, +h, +mi, +se));
    return Number.isNaN(+dt) ? fallback : dt.toISOString();
  }
  const dt = new Date(s.includes('T') || s.endsWith('Z') ? s : Number(s));
  return Number.isNaN(+dt) ? fallback : dt.toISOString();
}
