export const VIDEO_RETURN_COOKIE = "p9x9_video_return_path";

export function getVideoReturnPath(routeName) {
  return `/videos/${encodeURIComponent(routeName)}`;
}

export function getVideoReturnCookieExpiresAt(value, returnPath) {
  if (typeof value !== "string") return null;

  const separator = value.lastIndexOf("|");
  if (separator < 0 || value.slice(0, separator) !== returnPath) return null;

  const createdAt = Number(value.slice(separator + 1));
  const expiresAt = createdAt + 300_000;
  return Number.isSafeInteger(createdAt) && expiresAt > Date.now()
    ? expiresAt
    : null;
}

export function getVideoRedirectUrl() {
  const configuredUrl = process.env.VIDEO_REDIRECT_URL?.trim();
  if (!configuredUrl) return null;

  try {
    const url = new URL(configuredUrl);
    if (
      (url.protocol !== "https:" && url.protocol !== "http:") ||
      url.username ||
      url.password
    ) {
      return null;
    }
    return url.toString();
  } catch {
    return null;
  }
}

export function getSafeVideoReturnPath(value) {
  if (typeof value !== "string") return null;

  try {
    const url = new URL(value, "https://p9x9.com");
    const routeName = url.pathname.match(/^\/videos\/([^/]+)$/)?.[1];
    if (
      url.origin !== "https://p9x9.com" ||
      !routeName ||
      url.search ||
      url.hash
    ) {
      return null;
    }

    const decodedRouteName = decodeURIComponent(routeName);
    if (!/^[a-z0-9_-]+$/i.test(decodedRouteName)) return null;
    return getVideoReturnPath(decodedRouteName.toLowerCase());
  } catch {
    return null;
  }
}
