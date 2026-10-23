const FAVORITES_KEY = "p9x9_favorites";
const RECENT_KEY = "p9x9_recently_viewed";
const MAX_RECENT_ITEMS = 50;
const MAX_FAVORITES_ITEMS = 200;

function safeRead(key, fallback = []) {
  if (typeof window === "undefined") return fallback;

  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : fallback;
  } catch {
    return fallback;
  }
}

function writeJson(key, value) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(key, JSON.stringify(value));
  window.dispatchEvent(new CustomEvent("p9x9-personal-update", { detail: key }));
}

export function getFavoriteEntries() {
  return safeRead(FAVORITES_KEY, []);
}

export function isFavorite(routeName) {
  if (!routeName) return false;
  return getFavoriteEntries().some((item) => item.routeName === routeName);
}

export function toggleFavorite({ routeName, title, imageLink }) {
  if (!routeName) return getFavoriteEntries();

  const current = getFavoriteEntries();
  const exists = current.some((item) => item.routeName === routeName);
  const next = exists
    ? current.filter((item) => item.routeName !== routeName)
    : [{ routeName, title, imageLink }, ...current].slice(0, MAX_FAVORITES_ITEMS);

  writeJson(FAVORITES_KEY, next);
  return next;
}

export function clearFavorites() {
  writeJson(FAVORITES_KEY, []);
}

export function getRecentEntries() {
  return safeRead(RECENT_KEY, []);
}

export function trackRecentlyViewed({ routeName, title, imageLink }) {
  if (!routeName) return getRecentEntries();

  const current = getRecentEntries();
  const filtered = current.filter((item) => item.routeName !== routeName);
  const next = [{ routeName, title, imageLink }, ...filtered].slice(0, MAX_RECENT_ITEMS);

  writeJson(RECENT_KEY, next);
  return next;
}

export function clearRecentEntries() {
  writeJson(RECENT_KEY, []);
}
