/* theme manager — the colour scheme follows the browser / OS preference by
   default (light browser → light site), reacts live when the OS switches, and
   only pins an explicit choice after the reader actually picks one.

   states:
     auto   → no stored value, resolved from prefers-color-scheme every time
     pinned → stored 'dark' / 'light', wins over the system preference

   Shift+click or right-click on the toggle returns to auto. */

const KEY = 'cyanote-theme';
const darkQuery = window.matchMedia ? window.matchMedia('(prefers-color-scheme: dark)') : null;

function readStored() {
  try {
    const v = localStorage.getItem(KEY);
    return v === 'dark' || v === 'light' ? v : null;
  } catch {
    return null;
  }
}

export function systemTheme() {
  return darkQuery && darkQuery.matches ? 'dark' : 'light';
}

export function isPinned() {
  return readStored() !== null;
}

export function currentTheme() {
  return document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light';
}

function paint(theme, source) {
  document.documentElement.dataset.theme = theme;
  refreshConflictNotes();
  syncToggleLabel();
  window.dispatchEvent(new CustomEvent('theme-change', { detail: { theme, source } }));
}

/** an explicit choice: persisted, and it stops following the system */
export function applyTheme(theme) {
  try {
    localStorage.setItem(KEY, theme);
  } catch {
    /* private mode / storage disabled: still repaint for this page */
  }
  paint(theme, 'user');
}

/** drop the explicit choice and follow the browser again */
export function followSystem() {
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* ignore */
  }
  paint(systemTheme(), 'system');
}

function syncToggleLabel() {
  const btn = document.getElementById('theme-toggle');
  if (!btn) return;
  const auto = !isPinned();
  const mode = currentTheme() === 'dark' ? '深色' : '浅色';
  btn.title = auto
    ? `主题：跟随系统（当前${mode}）· 点击切换 · Shift+点击保持跟随`
    : `主题：${mode}（已固定）· Shift+点击恢复跟随系统`;
  btn.setAttribute('aria-label', btn.title);
  btn.classList.toggle('auto', auto);
}

export function initTheme() {
  paint(readStored() || systemTheme(), readStored() ? 'user' : 'system');

  /* live OS / browser switch — only while the reader has not pinned a theme */
  darkQuery?.addEventListener?.('change', (e) => {
    if (isPinned()) return;
    paint(e.matches ? 'dark' : 'light', 'system');
  });

  const btn = document.getElementById('theme-toggle');
  btn?.addEventListener('click', (e) => {
    if (e.shiftKey || e.altKey) {
      followSystem();
      return;
    }
    applyTheme(currentTheme() === 'dark' ? 'light' : 'dark');
  });
  btn?.addEventListener('contextmenu', (e) => {
    e.preventDefault();
    followSystem();
  });
}

export function isDark() {
  return currentTheme() === 'dark';
}

/* ---- futuristic "pioneer" mode ---- */
export function isFutureOn() {
  return document.body.classList.contains('future-mode');
}

export function setFutureOn(on) {
  document.body.classList.toggle('future-mode', !!on);
  localStorage.setItem('cyanote-future', on ? '1' : '0');
  document.getElementById('future-toggle')?.classList.toggle('on', !!on);
  document.querySelectorAll('.future-switch').forEach((s) => s.classList.toggle('active', !!on));
  refreshConflictNotes();
  window.dispatchEvent(new CustomEvent('future-change', { detail: !!on }));
}

/* "亮色模式与未来视效冲突" notice — shown next to the future switch */
export function refreshConflictNotes() {
  const warn = isFutureOn() && !isDark();
  document.querySelectorAll('.conflict-note').forEach((n) => {
    n.hidden = !warn;
  });
}

export function initFuture() {
  let on = false;
  try {
    on = localStorage.getItem('cyanote-future') === '1';
  } catch {
    on = false;
  }
  setFutureOn(on);
  document.getElementById('future-toggle')?.addEventListener('click', () => setFutureOn(!isFutureOn()));
}
