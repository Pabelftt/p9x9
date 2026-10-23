self.addEventListener("install", (event) => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("push", (event) => {
  let payload = {};
  try {
    payload = event.data?.json() || {};
  } catch {
    payload = { body: event.data?.text() || "" };
  }
  const title = payload?.title || "P9X9";
  const body = payload?.body || "New videos and updates are ready.";
  const icon = payload?.icon || "/favicon.ico";
  const image = payload?.image;
  const url = payload?.url || "/";

  event.waitUntil(
    self.registration.showNotification(title, {
      body,
      icon,
      ...(image ? { image } : {}),
      data: { url },
      badge: icon
    })
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const requestedUrl = event.notification.data?.url || "/";
  let targetUrl = "/";

  try {
    const parsedUrl = new URL(requestedUrl, self.location.origin);
    if (
      ["http:", "https:"].includes(parsedUrl.protocol) &&
      !parsedUrl.username &&
      !parsedUrl.password
    ) {
      targetUrl = parsedUrl.href;
    }
  } catch {
    targetUrl = "/";
  }

  event.waitUntil(self.clients.openWindow(targetUrl));
});
